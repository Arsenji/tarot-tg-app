import { randomUUID } from 'crypto';
import { Telegraf, Context, Markup } from 'telegraf';
import { User } from '../models/User';
import { SupportMessage } from '../models/SupportMessage';
import { Review } from '../models/Review';
import { Payment } from '../models/Payment';
import { buildWalletSnapshot, creditTokenPackage } from '../utils/tokens';
import {
  TOKEN_PACKAGES,
  TokenPackageId,
  FREE_YES_NO_LIFETIME,
  FREE_THREE_CARDS_LIFETIME,
} from '../constants/tokens';
import {
  reconcilePendingPayments,
  getPaymentReturnUrl,
} from '../utils/paymentReconcile';
import logger from '../utils/logger';
import { YooKassaService } from '../services/yookassa';

// Интерфейс для состояний пользователя
interface UserState {
  waitingForHelp?: boolean;
  waitingForReview?: boolean;
  // Рассылка (только для администратора)
  broadcast?: {
    stage: 'awaiting_message' | 'awaiting_confirm';
    fromChatId?: number;
    messageId?: number;
  };
}

function isAdmin(userId: number | undefined): boolean {
  return !!userId && !!ADMIN_ID && String(userId) === String(ADMIN_ID);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Рассылает (копирует) сообщение всем пользователям бота с троттлингом,
 * чтобы не упереться в лимиты Telegram (~30 сообщений/сек).
 * Заблокировавшие бота (403) и недоступные чаты просто пропускаются.
 */
async function runBroadcast(
  fromChatId: number,
  messageId: number,
  onProgress?: (sent: number, total: number) => Promise<void>
): Promise<{ total: number; sent: number; blocked: number; failed: number }> {
  const users = await User.find({}).select('telegramId').lean();
  const total = users.length;
  let sent = 0;
  let blocked = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i++) {
    const telegramId = users[i].telegramId;
    try {
      await bot.telegram.copyMessage(telegramId, fromChatId, messageId);
      sent++;
    } catch (err: any) {
      const code = err?.response?.error_code;
      const desc = String(err?.response?.description || err?.message || '');
      // 403 — пользователь заблокировал бота; 400 chat not found — удалён.
      if (code === 403 || /blocked|deactivated|chat not found|user is deactivated/i.test(desc)) {
        blocked++;
      } else {
        failed++;
        logger.warn('Broadcast: failed to deliver', { telegramId, code, desc });
      }
    }

    // ~20 сообщений/сек.
    await delay(50);

    if (onProgress && (i + 1) % 25 === 0) {
      await onProgress(sent + blocked + failed, total).catch(() => {});
    }
  }

  return { total, sent, blocked, failed };
}

// Хранилище состояний пользователей (в продакшене лучше использовать Redis)
const userStates: Map<number, UserState> = new Map();

// ID администратора для пересылки сообщений
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '';

// Переменная для бота
let bot: Telegraf;
let isBotRunning = false;

// Переменная для YooKassa (инициализируется в startBot)
let yooKassa: YooKassaService;

async function formatWalletMessage(telegramId: number): Promise<string> {
  const wallet = await buildWalletSnapshot(telegramId, false);
  if (!wallet) return '🪙 Баланс: 0 токенов';
  return (
    `🪙 Баланс: ${wallet.tokensBalance} токенов\n` +
    `❓ Бесплатных «Да/Нет»: ${wallet.freeYesNoRemaining}/${FREE_YES_NO_LIFETIME}\n` +
    `🔮 Бесплатных «3 карты»: ${wallet.freeThreeCardsRemaining}/${FREE_THREE_CARDS_LIFETIME}`
  );
}

// Клавиатуры
const getMainKeyboard = () => {
  return Markup.keyboard([
    ['Открыть приложение'],
    ['Купить токены', 'Мой баланс'],
    ['Помощь', 'Оставить отзыв']
  ]).resize();
};

const getStartKeyboard = () => {
  return Markup.keyboard([['Начать']]).resize();
};

const getTokenKeyboard = () => {
  const rows = (Object.keys(TOKEN_PACKAGES) as TokenPackageId[]).map((id) => [
    Markup.button.callback(
      `${TOKEN_PACKAGES[id].name} — ${TOKEN_PACKAGES[id].price}₽`,
      `token_${id}`
    ),
  ]);
  return Markup.inlineKeyboard(rows);
};

const getBackKeyboard = () => {
  return Markup.keyboard([['Назад']]).resize();
};

const getOpenKeyboard = () => {
  return Markup.keyboard([['Открыть']]).resize();
};

// Инициализация обработчиков бота
const initializeBot = () => {
  if (!bot) return;

  // Middleware для логирования
  bot.use((ctx, next) => {
    let message = '';
    if (ctx.message && 'text' in ctx.message) {
      message = ctx.message.text;
    } else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      message = ctx.callbackQuery.data;
    }
    
    logger.info('Telegram Bot Request', {
      userId: ctx.from?.id,
      username: ctx.from?.username,
      message,
      type: ctx.updateType
    });
    return next();
  });

  // Команда /start
  bot.start(async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      logger.info('Received /start command', { userId, username: ctx.from?.username });
      
      if (!userId) {
        logger.warn('No userId in /start command');
        return;
      }

      // Создаем или обновляем пользователя
      try {
        await User.findOneAndUpdate(
          { telegramId: userId },
          {
            // Профиль обновляем всегда.
            $set: {
              firstName: ctx.from?.first_name || '',
              lastName: ctx.from?.last_name || '',
              username: ctx.from?.username || '',
              languageCode: ctx.from?.language_code || 'ru',
            },
            // Баланс и счётчики бесплатных раскладов выставляем ТОЛЬКО при
            // создании, иначе каждый /start обнулял бы токены и попытки.
            $setOnInsert: {
              subscriptionStatus: 0,
              tokensBalance: 0,
              freeYesNoUsed: 0,
              freeThreeCardsUsed: 0,
            },
          },
          { upsert: true, new: true }
        );
        logger.info('User created/updated in /start', { userId });
      } catch (dbError) {
        logger.error('Database error in /start', { error: dbError, userId });
        // Продолжаем выполнение даже если БД недоступна
      }

      // Возврат после оплаты (deep link https://t.me/<bot>?start=paid)
      const startPayload = (ctx as any).startPayload as string | undefined;
      let paidPrefix = '';
      if (startPayload === 'paid') {
        try {
          const newBalance = await reconcilePendingPayments(userId);
          if (newBalance != null) {
            paidPrefix = `✅ Оплата получена! Токены начислены.\n\n`;
          } else {
            paidPrefix = `⏳ Оплата обрабатывается. Баланс обновится в течение минуты.\n\n`;
          }
        } catch (reconcileError) {
          logger.error('Error reconciling payments on /start', { error: reconcileError, userId });
        }
      }

      try {
        const walletLine = await formatWalletMessage(userId);
        let welcomeMessage = paidPrefix +
          '🔮 Добро пожаловать в Таро-бот!\n\n' +
          'Я помогу вам получить ответы на важные вопросы с помощью карт Таро.\n\n' +
          `${walletLine}\n\n` +
          '🎁 «Совет дня» — бесплатно 1 раз в сутки\n' +
          `❓ «Да / Нет» — 5 токенов (${FREE_YES_NO_LIFETIME} бесплатный для новых)\n` +
          `🔮 «3 карты» — 10 токенов (${FREE_THREE_CARDS_LIFETIME} бесплатный для новых)\n` +
          '📚 История раскладов — доступна всем в приложении\n\n' +
          'Выберите действие:';
        
        // Сразу показываем главное меню
        await ctx.reply(welcomeMessage, getMainKeyboard());
        logger.info('Reply sent in /start with main menu', { userId });
      } catch (replyError) {
        logger.error('Error sending reply in /start', { error: replyError, userId });
        throw replyError;
      }
    } catch (error) {
      logger.error('Error in /start command', { error, userId: ctx.from?.id, stack: error instanceof Error ? error.stack : undefined });
      try {
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      } catch (replyError) {
        logger.error('Failed to send error message in /start', { error: replyError });
      }
    }
  });

  // Команда /help
  bot.command('help', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      userStates.set(userId, { waitingForHelp: true });

      await ctx.reply(
        '🆘 Помощь\n\n' +
        'Пожалуйста, поделитесь своей проблемой и опишите её.\n' +
        'В кратчайшие сроки мы вернёмся к вам с помощью!\n\n' +
        'Напишите ваше сообщение:',
        getBackKeyboard()
      );
    } catch (error) {
      logger.error('Error in /help command', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  bot.command('balance', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;
      try {
        await reconcilePendingPayments(userId);
      } catch (reconcileError) {
        logger.error('Error reconciling payments on /balance', { error: reconcileError, userId });
      }
      await ctx.reply(await formatWalletMessage(userId), getMainKeyboard());
    } catch (error) {
      logger.error('Error in /balance command', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  bot.command('subscription', async (ctx: Context) => {
    await ctx.reply('Подписки больше нет — используйте токены. Команда /balance покажет баланс.', getMainKeyboard());
  });

  // Рассылка всем пользователям (только администратор)
  bot.command('broadcast', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!isAdmin(userId)) {
        return; // Игнорируем команду для не-администраторов
      }

      userStates.set(userId!, { broadcast: { stage: 'awaiting_message' } });
      await ctx.reply(
        '📢 Рассылка\n\n' +
        'Пришлите сообщение, которое нужно разослать всем пользователям бота ' +
        '(текст с форматированием, эмодзи и т.д.).\n\n' +
        'Я покажу предпросмотр и попрошу подтверждение перед отправкой.\n' +
        'Для отмены отправьте /cancel.'
      );
    } catch (error) {
      logger.error('Error in /broadcast command', { error, userId: ctx.from?.id });
    }
  });

  // Отмена текущего действия (в т.ч. рассылки)
  bot.command('cancel', async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    userStates.delete(userId);
    await ctx.reply('Действие отменено.', getMainKeyboard());
  });

  // Обработка кнопки "Открыть приложение"
  bot.hears('Открыть приложение', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      const walletLine = await formatWalletMessage(user.telegramId);
      let message = '🎉 Отлично! Теперь у вас есть доступ к веб-приложению.\n\n' + walletLine + '\n\n';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const webAppUrl = `${frontendUrl}?tgWebAppStartParam=${userId}`;

      await ctx.reply(
        message + 'Нажмите кнопку ниже, чтобы открыть веб-приложение:',
        Markup.inlineKeyboard([
          [Markup.button.webApp('🔮 Открыть приложение', webAppUrl)]
        ])
      );
    } catch (error) {
      logger.error('Error in "Открыть приложение" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Открыть" (для обратной совместимости)
  bot.hears('Открыть', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      const walletLine = await formatWalletMessage(user.telegramId);
      let message = '🎉 Отлично! Теперь у вас есть доступ к веб-приложению.\n\n' + walletLine + '\n\nВыберите действие:';

      await ctx.reply(message, getMainKeyboard());
    } catch (error) {
      logger.error('Error in "Открыть" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  const showTokenPackages = async (ctx: Context) => {
    let message = '🪙 Выберите пакет токенов:\n\n';
    (Object.keys(TOKEN_PACKAGES) as TokenPackageId[]).forEach((id) => {
      const pkg = TOKEN_PACKAGES[id];
      message += `📦 ${pkg.name} — ${pkg.price}₽\n`;
    });
    message += '\nНажмите на пакет для покупки:';
    await ctx.reply(message, getTokenKeyboard());
  };

  bot.hears('Купить токены', showTokenPackages);
  bot.hears('Купить подписку', showTokenPackages);

  const showBalance = async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    try {
      await reconcilePendingPayments(userId);
    } catch (reconcileError) {
      logger.error('Error reconciling payments on balance', { error: reconcileError, userId });
    }
    await ctx.reply(await formatWalletMessage(userId), getMainKeyboard());
  };
  bot.hears('Мой баланс', showBalance);
  bot.hears('Моя подписка', showBalance);

  bot.action(/^token_(10|25|50|100)$/, async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
      const match = callbackData.match(/^token_(10|25|50|100)$/);
      if (!match) return;

      const packageId = match[1] as TokenPackageId;
      const pkg = TOKEN_PACKAGES[packageId];

      const isYooKassaConfigured = process.env.YOOKASSA_SHOP_ID &&
        process.env.YOOKASSA_SHOP_ID !== 'your_yookassa_shop_id' &&
        process.env.YOOKASSA_SECRET_KEY &&
        process.env.YOOKASSA_SECRET_KEY !== 'your_yookassa_secret_key';

      if (!isYooKassaConfigured) {
        const balance = await creditTokenPackage(userId, packageId);
        await ctx.answerCbQuery('✅ Токены начислены (тест)');
        await ctx.editMessageText(
          `✅ Начислено ${pkg.tokens} токенов (тестовый режим)\n\n` +
          `🪙 Баланс: ${balance ?? 0} токенов`,
          Markup.inlineKeyboard([[Markup.button.callback('Вернуться в меню', 'back_to_menu')]])
        );
        return;
      }

      const returnRef = randomUUID();
      const returnUrl = getPaymentReturnUrl(returnRef);
      const payment = await yooKassa.createTokenPayment(userId.toString(), packageId, returnUrl);

      if (!payment) {
        await ctx.answerCbQuery('Ошибка создания платежа');
        return;
      }

      await Payment.findOneAndUpdate(
        { paymentId: payment.id },
        {
          paymentId: payment.id,
          userId: userId.toString(),
          status: 'pending',
          tokensCredited: false,
          processed: false,
          tokenPackage: packageId,
          returnRef,
        },
        { upsert: true, new: true }
      );

      await ctx.answerCbQuery('Перенаправляем на оплату...');
      await ctx.editMessageText(
        `💳 Покупка ${pkg.name}\n\n💰 ${pkg.price}₽`,
        Markup.inlineKeyboard([
          [Markup.button.url('💳 Оплатить', payment.confirmation.confirmation_url)],
          [Markup.button.callback('❌ Отмена', 'cancel_payment')],
        ])
      );
    } catch (error) {
      logger.error('Error in token package selection', { error, userId: ctx.from?.id });
      await ctx.answerCbQuery('Произошла ошибка');
    }
  });

  // Обработка кнопки "Помощь"
  bot.hears('Помощь', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      userStates.set(userId, { waitingForHelp: true });

      await ctx.reply(
        '🆘 Помощь\n\n' +
        'Пожалуйста, поделитесь своей проблемой и опишите её.\n' +
        'В кратчайшие сроки мы вернёмся к вам с помощью!\n\n' +
        'Напишите ваше сообщение:',
        getBackKeyboard()
      );
    } catch (error) {
      logger.error('Error in "Помощь" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Оставить отзыв"
  bot.hears('Оставить отзыв', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      userStates.set(userId, { waitingForReview: true });

      await ctx.reply(
        '⭐ Оставить отзыв\n\n' +
        'Оставьте своё мнение о пользовании нашим сервисом, мы будем рады получить обратную связь.\n' +
        'Мы работаем и улучшаем наш продукт, чтобы вы были довольны.\n\n' +
        'Напишите ваш отзыв:',
        getBackKeyboard()
      );
    } catch (error) {
      logger.error('Error in "Оставить отзыв" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка текстовых сообщений
  bot.on('text', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
      
      if (!userId || !messageText) return;

      const userState = userStates.get(userId);

      // Захват сообщения для рассылки (только администратор)
      if (isAdmin(userId) && userState?.broadcast?.stage === 'awaiting_message') {
        const chatId = ctx.chat?.id;
        const msgId = ctx.message?.message_id;
        if (chatId == null || msgId == null) return;

        userStates.set(userId, {
          broadcast: { stage: 'awaiting_confirm', fromChatId: chatId, messageId: msgId },
        });

        const total = await User.countDocuments({});
        await ctx.reply(
          `👆 Это сообщение будет разослано.\n\n` +
          `Получателей: ${total}\n\n` +
          `Подтвердите отправку:`,
          Markup.inlineKeyboard([
            [Markup.button.callback(`✅ Отправить всем (${total})`, 'broadcast_confirm')],
            [Markup.button.callback('❌ Отмена', 'broadcast_cancel')],
          ])
        );
        return;
      }

      // Обработка кнопки "Назад"
      if (messageText === 'Назад') {
        userStates.delete(userId);
        await ctx.reply('Выберите действие:', getMainKeyboard());
        return;
      }

      // Обработка сообщения помощи
      if (userState?.waitingForHelp) {
        userStates.delete(userId);
        
        // Сохраняем сообщение в базу данных
        try {
          await SupportMessage.create({
            userId: userId.toString(),
            telegramId: userId,
            userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ''}`.trim(),
            userUsername: ctx.from?.username || '',
            message: messageText,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (dbError) {
          logger.error('Error saving support message to database', { error: dbError, userId });
        }
        
        // Пересылаем сообщение администратору
        if (ADMIN_ID) {
          await ctx.telegram.sendMessage(
            ADMIN_ID,
            `🆘 Новое сообщение в поддержку:\n\n` +
            `👤 Пользователь: @${ctx.from?.username || ctx.from?.first_name}\n` +
            `🆔 ID: ${userId}\n` +
            `📝 Сообщение: ${messageText}`
          );
        }

        await ctx.reply(
          '✅ Ваше сообщение отправлено в службу поддержки!\n\n' +
          'Мы свяжемся с вами в ближайшее время.',
          getMainKeyboard()
        );
        return;
      }

      // Обработка отзыва
      if (userState?.waitingForReview) {
        userStates.delete(userId);
        
        // Сохраняем отзыв в базу данных
        try {
          await Review.create({
            userId: userId.toString(),
            telegramId: userId,
            userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ''}`.trim(),
            userUsername: ctx.from?.username || '',
            review: messageText,
            rating: 0, // Можно добавить логику для определения рейтинга
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (dbError) {
          logger.error('Error saving review to database', { error: dbError, userId });
        }

        await ctx.reply(
          '🙏 Спасибо за ваш отзыв, мы обязательно вернёмся с обратной связью!',
          getMainKeyboard()
        );
        return;
      }

      // Если пользователь не в каком-либо состоянии, показываем главное меню
      await ctx.reply('Выберите действие:', getMainKeyboard());
    } catch (error) {
      logger.error('Error in text message handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка callback кнопок
  bot.action('back_to_menu', async (ctx: Context) => {
    await ctx.editMessageText('Выберите действие:');
    await ctx.reply('Выберите действие:', getMainKeyboard());
  });

  bot.action('buy_subscription', async (ctx: Context) => {
    await ctx.editMessageText('🪙 Выберите пакет токенов:', getTokenKeyboard());
  });

  bot.action('extend_subscription', async (ctx: Context) => {
    await ctx.editMessageText('🪙 Выберите пакет токенов:', getTokenKeyboard());
  });

  bot.action('cancel_payment', async (ctx: Context) => {
    await ctx.editMessageText('❌ Оплата отменена.');
    await ctx.reply('Выберите действие:', getMainKeyboard());
  });

  bot.action('broadcast_cancel', async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!isAdmin(userId)) return;
    userStates.delete(userId!);
    await ctx.answerCbQuery('Отменено');
    await ctx.editMessageText('❌ Рассылка отменена.');
  });

  bot.action('broadcast_confirm', async (ctx: Context) => {
    const userId = ctx.from?.id;
    if (!isAdmin(userId)) return;

    const state = userStates.get(userId!);
    const bc = state?.broadcast;
    if (!bc || bc.stage !== 'awaiting_confirm' || bc.fromChatId == null || bc.messageId == null) {
      await ctx.answerCbQuery('Нет сообщения для рассылки');
      return;
    }

    userStates.delete(userId!);
    await ctx.answerCbQuery('Запускаю рассылку…');
    await ctx.editMessageText('📤 Рассылка запущена…');

    try {
      const result = await runBroadcast(bc.fromChatId, bc.messageId, async (done, total) => {
        await ctx.telegram.sendMessage(userId!, `⏳ Прогресс: ${done}/${total}`).catch(() => {});
      });
      await ctx.telegram.sendMessage(
        userId!,
        `✅ Рассылка завершена.\n\n` +
        `Всего: ${result.total}\n` +
        `Доставлено: ${result.sent}\n` +
        `Заблокировали бота: ${result.blocked}\n` +
        `Ошибок: ${result.failed}`
      );
      logger.info('Broadcast finished', { adminId: userId, ...result });
    } catch (error) {
      logger.error('Broadcast failed', { error, adminId: userId });
      await ctx.telegram.sendMessage(userId!, '❌ Рассылка прервана из-за ошибки. Подробности в логах.').catch(() => {});
    }
  });

  // Обработка ошибок
  bot.catch((err: any, ctx: Context) => {
    logger.error('Bot error', { error: err, userId: ctx.from?.id });
  });
};

// Запуск бота
const startBot = async () => {
  try {
    // Проверяем, не запущен ли бот уже
    if (isBotRunning) {
      logger.warn('Bot is already running, skipping startup');
      return;
    }

    logger.info('Bot startup - checking environment', {
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      tokenLength: process.env.TELEGRAM_BOT_TOKEN?.length || 0,
      tokenStart: process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || 'undefined'
    });

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
      return;
    }

    // Инициализация Юкассы после загрузки переменных окружения
    yooKassa = new YooKassaService(
      process.env.YOOKASSA_SHOP_ID || '',
      process.env.YOOKASSA_SECRET_KEY || ''
    );

    // Временное отключение бота для тестирования
    if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
      logger.warn('Telegram Bot is disabled via DISABLE_TELEGRAM_BOT environment variable');
      return;
    }

    // Создаем бота с токеном
    bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    logger.info('Bot instance created');

    // Регистрируем все обработчики команд и сообщений
    initializeBot();
    logger.info('Bot handlers registered');

    // Получаем username бота для построения deep link возврата после оплаты
    try {
      const me = await bot.telegram.getMe();
      if (me?.username && !process.env.BOT_USERNAME) {
        process.env.BOT_USERNAME = me.username;
        logger.info('Bot username resolved for payment return links', { username: me.username });
      }
    } catch (meError) {
      logger.warn('Could not resolve bot username via getMe', { error: meError });
    }

    // Запускаем long-polling
    await bot.launch();
    isBotRunning = true;
    logger.info('Bot started successfully');

    // Graceful shutdown
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    logger.error('Bot startup failed, continuing without it', { error });
  }
};

export { bot, startBot };