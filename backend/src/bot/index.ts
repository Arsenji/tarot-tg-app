import { Telegraf, Context, Markup } from 'telegraf';
import { User } from '../models/User';
import { SupportMessage } from '../models/SupportMessage';
import { Review } from '../models/Review';
import { checkSubscriptionStatus } from '../utils/subscription';
import logger from '../utils/logger';
import { YooKassaService, SUBSCRIPTION_PLANS } from '../services/yookassa';

// Интерфейс для состояний пользователя
interface UserState {
  waitingForHelp?: boolean;
  waitingForReview?: boolean;
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

// Клавиатуры
const getMainKeyboard = () => {
  return Markup.keyboard([
    ['Купить подписку', 'Моя подписка'],
    ['Помощь', 'Оставить отзыв']
  ]).resize();
};

const getStartKeyboard = () => {
  return Markup.keyboard([['Начать']]).resize();
};

const getSubscriptionKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        `${SUBSCRIPTION_PLANS.weekly.name} - ${SUBSCRIPTION_PLANS.weekly.price}₽`,
        'plan_weekly'
      )
    ],
    [
      Markup.button.callback(
        `${SUBSCRIPTION_PLANS.monthly.name} - ${SUBSCRIPTION_PLANS.monthly.price}₽`,
        'plan_monthly'
      )
    ],
    [
      Markup.button.callback(
        `${SUBSCRIPTION_PLANS.quarterly.name} - ${SUBSCRIPTION_PLANS.quarterly.price}₽`,
        'plan_quarterly'
      )
    ],
    [
      Markup.button.callback(
        `${SUBSCRIPTION_PLANS.yearly.name} - ${SUBSCRIPTION_PLANS.yearly.price}₽`,
        'plan_yearly'
      )
    ]
  ]);
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
      if (!userId) return;

      // Создаем или обновляем пользователя
      await User.findOneAndUpdate(
        { telegramId: userId },
        {
          telegramId: userId,
          firstName: ctx.from?.first_name || '',
          lastName: ctx.from?.last_name || '',
          username: ctx.from?.username || '',
          languageCode: ctx.from?.language_code || 'ru',
          subscriptionStatus: 0,
          freeYesNoUsed: false
        },
        { upsert: true, new: true }
      );

      await ctx.reply(
        '🔮 Добро пожаловать в Таро-бот!\n\n' +
        'Я помогу вам получить ответы на важные вопросы с помощью карт Таро.\n' +
        'Мой искусственный интеллект был специально обучен опытными тарологами, поэтому каждое предсказание максимально приближено и ничем не отличается от настоящей консультации.\n\n' +
        '✨ Почему именно этот бот?\n\n' +
        'Ваши тайны в безопасности — все запросы абсолютно анонимны.\n\n' +
        'Вы всегда можете вернуться и просмотреть историю своих раскладов.\n\n' +
        'Ответы формируются мгновенно и доступны в любое время.\n\n' +
        '🎁 В бесплатном доступе:\n\n' +
        '🃏 «Совет дня» — 1 раз каждый день\n\n' +
        '❓ 1 вопрос «Да / Нет»\n\n' +
        '🔮 1 расклад на 3 карты\n\n' +
        'Нажмите кнопку «Начать», чтобы открыть веб-приложение и начать гадание.',
        getStartKeyboard()
      );
    } catch (error) {
      logger.error('Error in /start command', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Начать"
  bot.hears('Начать', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      await ctx.reply(
        '🎉 Отлично! Теперь у вас есть доступ к веб-приложению.\n\n' +
        'Нажмите кнопку «Открыть», чтобы открыть веб-приложение и начать гадание.',
        getOpenKeyboard()
      );
    } catch (error) {
      logger.error('Error in "Начать" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Открыть"
  bot.hears('Открыть', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      const subscriptionInfo = await checkSubscriptionStatus(user.telegramId);

      let message = '🎉 Отлично! Теперь у вас есть доступ к веб-приложению.\n\n';
      
      if (subscriptionInfo.hasSubscription) {
        message += '✅ У вас активная подписка - полный доступ ко всем функциям!\n\n';
      } else {
        message += '📱 Доступные функции:\n';
        message += '• Одна карта "Да/Нет" (бесплатно, 1 раз)\n';
        message += '• Совет дня (1 раз в день)\n';
        message += '• История раскладов (последние 3)\n\n';
        message += '💎 Для полного доступа оформите подписку!';
      }

      message += '\n\nВыберите действие:';

      await ctx.reply(message, getMainKeyboard());
    } catch (error) {
      logger.error('Error in "Открыть" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Купить подписку"
  bot.hears('Купить подписку', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      const subscriptionInfo = await checkSubscriptionStatus(user.telegramId);

      if (subscriptionInfo.hasSubscription) {
        await ctx.reply(
          '✅ У вас уже есть активная подписка!\n\n' +
          'Используйте команду "Моя подписка" для просмотра информации.',
          getMainKeyboard()
        );
        return;
      }

      let message = '💎 Выберите тариф подписки:\n\n';
      
      Object.values(SUBSCRIPTION_PLANS).forEach(plan => {
        message += `📦 ${plan.name}\n`;
        message += `💰 ${plan.price}₽\n`;
        message += `📅 ${plan.duration} дней\n`;
        message += `📝 ${plan.name}\n\n`;
      });

      message += 'Нажмите на тариф для покупки:';

      await ctx.reply(message, getSubscriptionKeyboard());
    } catch (error) {
      logger.error('Error in "Купить подписку" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка выбора тарифа
  bot.action(/^plan_(weekly|monthly|quarterly|yearly)$/, async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
      const match = callbackData.match(/^plan_(weekly|monthly|quarterly|yearly)$/);
      if (!match) return;
      
      const planType = match[1] as 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      const plan = SUBSCRIPTION_PLANS[planType];

      const user = await User.findOne({ telegramId: userId });
      if (!user) return;

      // Проверяем, настроена ли Юкасса
      const isYooKassaConfigured = process.env.YOOKASSA_SHOP_ID && 
        process.env.YOOKASSA_SHOP_ID !== 'your_yookassa_shop_id' &&
        process.env.YOOKASSA_SHOP_ID !== 'test_shop_id' &&
        process.env.YOOKASSA_SECRET_KEY && 
        process.env.YOOKASSA_SECRET_KEY !== 'your_yookassa_secret_key' &&
        process.env.YOOKASSA_SECRET_KEY !== 'test_secret_key';

      if (!isYooKassaConfigured) {
        // Демо-режим: сразу активируем подписку
        const now = new Date();
        let expiryDate: Date;
        
        if (user.subscriptionStatus === 1 && user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
          // Если подписка активна - продлеваем (суммируем сроки)
          expiryDate = new Date(user.subscriptionExpiresAt.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
        } else {
          // Если подписки нет или она истекла - создаем новую
          expiryDate = new Date(now.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
        }

        const isRenewal = user.subscriptionStatus === 1 && user.subscriptionExpiresAt && user.subscriptionExpiresAt > now;
        
        user.subscriptionStatus = 1;
        user.subscriptionExpiresAt = expiryDate;
        await user.save();
        
        await ctx.answerCbQuery(isRenewal ? '✅ Подписка продлена! (Тест)' : '✅ Подписка активирована! (Тест)');
        await ctx.editMessageText(
          `✅ Подписка "${plan.name}" ${isRenewal ? 'продлена' : 'активирована'}!\n\n` +
          `💰 Сумма: ${plan.price}₽\n` +
          `📅 Добавлено: ${plan.duration} дней\n` +
          `📆 Действует до: ${expiryDate.toLocaleDateString('ru-RU')}\n\n` +
          `🎉 Теперь у вас есть полный доступ ко всем функциям!\n\n` +
          `🧪 Это тестовый режим. Платеж не был проведен.`,
          Markup.inlineKeyboard([
            [Markup.button.callback('Вернуться в меню', 'back_to_menu')]
          ])
        );

        logger.info('Test subscription activated', {
          userId,
          planType,
          amount: plan.price,
          expiryDate: expiryDate.toISOString()
        });

        return;
      }

      // Реальный режим с Юкассой
      try {
        const returnUrl = `${process.env.FRONTEND_URL}/payment/success`;
        const payment = await yooKassa.createPayment(
          userId.toString(),
          planType,
          returnUrl
        );

        if (!payment) {
          await ctx.answerCbQuery('Ошибка создания платежа');
          return;
        }

        await ctx.answerCbQuery('Перенаправляем на оплату...');
        await ctx.editMessageText(
          `💳 Оплата подписки "${plan.name}"\n\n` +
          `💰 Сумма: ${plan.price}₽\n` +
          `📅 Срок: ${plan.duration} дней\n\n` +
          `Нажмите кнопку ниже для перехода к оплате:`,
          Markup.inlineKeyboard([
            [Markup.button.url('💳 Оплатить', payment.confirmation.confirmation_url)],
            [Markup.button.callback('❌ Отмена', 'cancel_payment')]
          ])
        );

        logger.info('Payment created', {
          userId,
          planType,
          paymentId: payment.id,
          amount: plan.price
        });

      } catch (paymentError) {
        logger.error('Payment creation failed', { error: paymentError, userId });
        
        await ctx.answerCbQuery('Ошибка создания платежа');
        await ctx.editMessageText(
          `❌ Ошибка при создании платежа\n\n` +
          `Попробуйте позже или обратитесь в поддержку.`,
          Markup.inlineKeyboard([
            [Markup.button.callback('Назад', 'back_to_menu')]
          ])
        );
      }

    } catch (error) {
      logger.error('Error in plan selection', { error, userId: ctx.from?.id });
      await ctx.answerCbQuery('Произошла ошибка. Попробуйте позже.');
    }
  });

  // Обработка кнопки "Моя подписка"
  bot.hears('Моя подписка', async (ctx: Context) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await User.findOne({ telegramId: userId });
      if (!user) {
        await ctx.reply('Сначала выполните команду /start');
        return;
      }

      const subscriptionInfo = await checkSubscriptionStatus(user.telegramId);

      if (!subscriptionInfo.hasSubscription) {
        await ctx.reply(
          '❌ У вас нет активной подписки.\n\n' +
          'Оформите подписку для получения полного доступа ко всем функциям.',
          Markup.inlineKeyboard([
            [Markup.button.callback('Купить подписку', 'buy_subscription')]
          ])
        );
        return;
      }

      // Правильный расчет даты активации и дней
      const now = new Date();
      
      // Используем текущую дату как дату активации
      const activationDate = now;
      
      const daysLeft = user.subscriptionExpiresAt ? 
        Math.max(0, Math.ceil((user.subscriptionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 
        0;

      const message = 
        `📋 Информация о подписке:\n\n` +
        `✅ Статус: Активна\n` +
        `📅 Дата активации: ${activationDate.toLocaleDateString('ru-RU')}\n` +
        `⏰ Осталось дней: ${daysLeft}\n` +
        `📆 Действует до: ${user.subscriptionExpiresAt?.toLocaleDateString('ru-RU')}\n\n` +
        `🎉 Полный доступ ко всем функциям!`;

      await ctx.reply(
        message,
        Markup.inlineKeyboard([
          [Markup.button.callback('Продлить подписку', 'extend_subscription')]
        ])
      );
    } catch (error) {
      logger.error('Error in "Моя подписка" handler', { error, userId: ctx.from?.id });
      await ctx.reply('Произошла ошибка. Попробуйте позже.');
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
    // Перенаправляем на обработчик "Купить подписку"
    await ctx.editMessageText('💎 Выберите тариф подписки:', getSubscriptionKeyboard());
  });

  bot.action('cancel_payment', async (ctx: Context) => {
    await ctx.editMessageText('❌ Оплата отменена.');
    await ctx.reply('Выберите действие:', getMainKeyboard());
  });

  bot.action('extend_subscription', async (ctx: Context) => {
    // Показываем тарифы для продления
    await ctx.editMessageText('💎 Выберите тариф для продления:', getSubscriptionKeyboard());
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

    // Инициализируем обработчики
    initializeBot();

    // Проверяем, не запущен ли бот уже перед launch
    if (isBotRunning) {
      logger.warn('Bot is already running, skipping launch');
      return;
    }

    // Проверяем режим работы бота (webhook или getUpdates)
    const useWebhook = process.env.TELEGRAM_USE_WEBHOOK === 'true';
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (useWebhook && webhookUrl) {
      // Режим webhook - отключаем getUpdates и устанавливаем webhook
      logger.info('Starting bot in webhook mode');
      
      try {
        // Удаляем существующий webhook, если есть
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        logger.info('Deleted existing webhook');
        
        // Устанавливаем новый webhook
        await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: true });
        logger.info(`Webhook set to: ${webhookUrl}`);
        
        isBotRunning = true;
        logger.info('🤖 Telegram Bot started in webhook mode');
      } catch (error) {
        logger.error('Failed to set webhook', { error });
        throw error;
      }
    } else {
      // Режим getUpdates (long polling) - отключаем webhook и запускаем polling
      logger.info('Starting bot in getUpdates (long polling) mode');
      
      try {
        // Удаляем webhook, если он был установлен
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        logger.info('Deleted webhook to use getUpdates mode');
        
        // Добавляем задержку перед запуском для предотвращения конфликтов
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Запускаем long polling
        await bot.launch();
        isBotRunning = true;
        logger.info('🤖 Telegram Bot started in getUpdates mode');
      } catch (error: any) {
        // Проверяем на конфликт 409
        if (error?.response?.error_code === 409) {
          logger.warn('Bot conflict detected - another instance is using getUpdates');
          logger.warn('Trying to delete webhook and retry...');
          
          try {
            await bot.telegram.deleteWebhook({ drop_pending_updates: true });
            await new Promise(resolve => setTimeout(resolve, 2000));
            await bot.launch();
            isBotRunning = true;
            logger.info('🤖 Telegram Bot started successfully after resolving conflict');
          } catch (retryError) {
            logger.error('Failed to start bot after conflict resolution', { error: retryError });
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }
    
    // Graceful stop
    process.once('SIGINT', () => {
      if (isBotRunning) {
        bot.stop('SIGINT');
        isBotRunning = false;
      }
    });
    process.once('SIGTERM', () => {
      if (isBotRunning) {
        bot.stop('SIGTERM');
        isBotRunning = false;
      }
    });
  } catch (error: any) {
    logger.error('Failed to start bot', { error });
    isBotRunning = false;
    
    // Если это ошибка конфликта 409, логируем и продолжаем без бота
    if (error?.response?.error_code === 409) {
      logger.warn('Bot conflict detected - another instance is running');
      logger.warn('Continuing without Telegram Bot - API will work normally');
      return;
    }
    
    // Для других ошибок тоже не завершаем процесс
    logger.warn('Bot startup failed, but continuing without it');
    return;
  }
};

export { bot, startBot };