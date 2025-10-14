"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = exports.bot = void 0;
const telegraf_1 = require("telegraf");
const database_1 = require("../utils/database");
const User_1 = require("../models/User");
const SupportMessage_1 = require("../models/SupportMessage");
const Review_1 = require("../models/Review");
const subscription_1 = require("../utils/subscription");
const logger_1 = __importDefault(require("../utils/logger"));
const yookassa_1 = require("../services/yookassa");
// Хранилище состояний пользователей (в продакшене лучше использовать Redis)
const userStates = new Map();
// ID администратора для пересылки сообщений
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID || '';
// Инициализация Юкассы
const yooKassa = new yookassa_1.YooKassaService(process.env.YOOKASSA_SHOP_ID || '', process.env.YOOKASSA_SECRET_KEY || '');
// Переменная для бота
let bot;
let isBotRunning = false;
// Клавиатуры
const getMainKeyboard = () => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarot-frontend-3.onrender.com';
    return telegraf_1.Markup.keyboard([
        [telegraf_1.Markup.button.webApp('🔮 Открыть приложение', frontendUrl)],
        ['Купить подписку', 'Моя подписка'],
        ['Помощь', 'Оставить отзыв']
    ]).resize();
};
const getStartKeyboard = () => {
    return telegraf_1.Markup.keyboard([['Начать']]).resize();
};
const getSubscriptionKeyboard = () => {
    return telegraf_1.Markup.inlineKeyboard([
        [
            telegraf_1.Markup.button.callback(`${yookassa_1.SUBSCRIPTION_PLANS.weekly.name} - ${yookassa_1.SUBSCRIPTION_PLANS.weekly.price}₽`, 'plan_weekly')
        ],
        [
            telegraf_1.Markup.button.callback(`${yookassa_1.SUBSCRIPTION_PLANS.monthly.name} - ${yookassa_1.SUBSCRIPTION_PLANS.monthly.price}₽`, 'plan_monthly')
        ],
        [
            telegraf_1.Markup.button.callback(`${yookassa_1.SUBSCRIPTION_PLANS.quarterly.name} - ${yookassa_1.SUBSCRIPTION_PLANS.quarterly.price}₽`, 'plan_quarterly')
        ],
        [
            telegraf_1.Markup.button.callback(`${yookassa_1.SUBSCRIPTION_PLANS.yearly.name} - ${yookassa_1.SUBSCRIPTION_PLANS.yearly.price}₽`, 'plan_yearly')
        ]
    ]);
};
const getBackKeyboard = () => {
    return telegraf_1.Markup.keyboard([['Назад']]).resize();
};
const getOpenKeyboard = () => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://tarot-frontend-3.onrender.com';
    return telegraf_1.Markup.keyboard([
        [telegraf_1.Markup.button.webApp('🔮 Открыть приложение', frontendUrl)]
    ]).resize();
};
// Инициализация обработчиков бота
const initializeBot = () => {
    if (!bot)
        return;
    // Middleware для логирования
    bot.use((ctx, next) => {
        let message = '';
        if (ctx.message && 'text' in ctx.message) {
            message = ctx.message.text;
        }
        else if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
            message = ctx.callbackQuery.data;
        }
        logger_1.default.info('Telegram Bot Request', {
            userId: ctx.from?.id,
            username: ctx.from?.username,
            message,
            type: ctx.updateType
        });
        return next();
    });
    // Команда /start
    bot.start(async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            // Создаем или обновляем пользователя
            await User_1.User.findOneAndUpdate({ telegramId: userId }, {
                telegramId: userId,
                firstName: ctx.from?.first_name || '',
                lastName: ctx.from?.last_name || '',
                username: ctx.from?.username || '',
                languageCode: ctx.from?.language_code || 'ru',
                subscriptionStatus: 0,
                freeYesNoUsed: false
            }, { upsert: true, new: true });
            await ctx.reply('🔮 Добро пожаловать в Таро-бот!\n\n' +
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
                'Нажмите кнопку «Начать», чтобы открыть веб-приложение и начать гадание.', getStartKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in /start command', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Команда /menu - быстрый доступ к главному меню
    bot.command('menu', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            const user = await User_1.User.findOne({ telegramId: userId });
            if (!user) {
                await ctx.reply('Сначала выполните команду /start');
                return;
            }
            await ctx.reply('📱 Главное меню:', getMainKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in /menu command', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Начать"
    bot.hears('Начать', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            const user = await User_1.User.findOne({ telegramId: userId });
            if (!user) {
                await ctx.reply('Сначала выполните команду /start');
                return;
            }
            // Показываем главное меню сразу
            await ctx.reply('🎉 Отлично! Выберите действие:', getMainKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in "Начать" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Открыть" (на случай если кто-то напишет)
    bot.hears('Открыть', async (ctx) => {
        try {
            await ctx.reply('📱 Используйте кнопку "🔮 Открыть приложение" в меню ниже:', getMainKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in "Открыть" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Купить подписку"
    bot.hears('Купить подписку', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            const user = await User_1.User.findOne({ telegramId: userId });
            if (!user) {
                await ctx.reply('Сначала выполните команду /start');
                return;
            }
            const subscriptionInfo = (0, subscription_1.checkSubscriptionStatus)(user);
            if (subscriptionInfo.hasSubscription) {
                await ctx.reply('✅ У вас уже есть активная подписка!\n\n' +
                    'Используйте команду "Моя подписка" для просмотра информации.', getMainKeyboard());
                return;
            }
            let message = '💎 Выберите тариф подписки:\n\n';
            Object.values(yookassa_1.SUBSCRIPTION_PLANS).forEach(plan => {
                message += `📦 ${plan.name}\n`;
                message += `💰 ${plan.price}₽\n`;
                message += `📅 ${plan.duration} дней\n`;
                message += `📝 ${plan.description}\n\n`;
            });
            message += 'Нажмите на тариф для покупки:';
            await ctx.reply(message, getSubscriptionKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in "Купить подписку" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка выбора тарифа
    bot.action(/^plan_(weekly|monthly|quarterly|yearly)$/, async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
            const match = callbackData.match(/^plan_(weekly|monthly|quarterly|yearly)$/);
            if (!match)
                return;
            const planType = match[1];
            const plan = yookassa_1.SUBSCRIPTION_PLANS[planType];
            const user = await User_1.User.findOne({ telegramId: userId });
            if (!user)
                return;
            // Проверяем, настроена ли Юкасса
            const isYooKassaConfigured = process.env.YOOKASSA_SHOP_ID &&
                process.env.YOOKASSA_SHOP_ID !== 'your_yookassa_shop_id' &&
                process.env.YOOKASSA_SECRET_KEY &&
                process.env.YOOKASSA_SECRET_KEY !== 'your_yookassa_secret_key';
            if (!isYooKassaConfigured) {
                // YooKassa не настроена - показываем ошибку (ДЕМО-РЕЖИМ ОТКЛЮЧЁН)
                await ctx.answerCbQuery('⚠️ Оплата временно недоступна');
                await ctx.editMessageText('⚠️ Система оплаты временно недоступна.\n\n' +
                    'Пожалуйста, обратитесь в поддержку для активации подписки.\n\n' +
                    '💬 Напишите нам, нажав кнопку "Помощь" в главном меню.', telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('Вернуться в меню', 'back_to_menu')]
                ]));
                logger_1.default.error('Payment attempt but YooKassa not configured', { userId, planType });
                return;
            }
            // Реальный режим с Юкассой
            try {
                // Сначала создаем платеж без paymentId в returnUrl
                const baseReturnUrl = `${process.env.FRONTEND_URL}/payment/success`;
                const payment = await yooKassa.createPayment(plan.price, `Подписка "${plan.name}" для пользователя ${userId}`, userId.toString(), planType, baseReturnUrl);
                
                // Обновляем returnUrl с paymentId (если нужно)
                // YooKassa сам добавит параметры к returnUrl после оплаты
                await ctx.answerCbQuery('Перенаправляем на оплату...');
                await ctx.editMessageText(`💳 Оплата подписки "${plan.name}"\n\n` +
                    `💰 Сумма: ${plan.price}₽\n` +
                    `📅 Срок: ${plan.duration} дней\n\n` +
                    `Нажмите кнопку ниже для перехода к оплате:`, telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.url('💳 Оплатить', payment.confirmation.confirmation_url)],
                    [telegraf_1.Markup.button.callback('❌ Отмена', 'cancel_payment')]
                ]));
                logger_1.default.info('Payment created', {
                    userId,
                    planType,
                    paymentId: payment.id,
                    amount: plan.price
                });
            }
            catch (paymentError) {
                logger_1.default.error('Payment creation failed', { 
                    error: paymentError, 
                    userId,
                    planType,
                    planPrice: plan.price,
                    yooKassaShopId: process.env.YOOKASSA_SHOP_ID ? 'SET' : 'NOT_SET',
                    yooKassaSecretKey: process.env.YOOKASSA_SECRET_KEY ? 'SET' : 'NOT_SET',
                    frontendUrl: process.env.FRONTEND_URL,
                    errorMessage: paymentError.message,
                    errorStack: paymentError.stack
                });
                await ctx.answerCbQuery('Ошибка создания платежа');
                await ctx.editMessageText(`❌ Ошибка при создании платежа\n\n` +
                    `Попробуйте позже или обратитесь в поддержку.`, telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('Назад', 'back_to_menu')]
                ]));
            }
        }
        catch (error) {
            logger_1.default.error('Error in plan selection', { error, userId: ctx.from?.id });
            await ctx.answerCbQuery('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Моя подписка"
    bot.hears('Моя подписка', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            const user = await User_1.User.findOne({ telegramId: userId });
            if (!user) {
                await ctx.reply('Сначала выполните команду /start');
                return;
            }
            const subscriptionInfo = (0, subscription_1.checkSubscriptionStatus)(user);
            if (!subscriptionInfo.hasSubscription) {
                await ctx.reply('❌ У вас нет активной подписки.\n\n' +
                    'Оформите подписку для получения полного доступа ко всем функциям.', telegraf_1.Markup.inlineKeyboard([
                    [telegraf_1.Markup.button.callback('Купить подписку', 'buy_subscription')]
                ]));
                return;
            }
            // Правильный расчет даты активации и дней
            const now = new Date();
            // Используем сохраненную дату активации или текущую дату
            const activationDate = user.subscriptionActivatedAt || now;
            const daysLeft = user.subscriptionExpiry ?
                Math.max(0, Math.ceil((user.subscriptionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) :
                0;
            const message = `📋 Информация о подписке:\n\n` +
                `✅ Статус: Активна\n` +
                `📅 Дата активации: ${activationDate.toLocaleDateString('ru-RU')}\n` +
                `⏰ Осталось дней: ${daysLeft}\n` +
                `📆 Действует до: ${user.subscriptionExpiry?.toLocaleDateString('ru-RU')}\n\n` +
                `🎉 Полный доступ ко всем функциям!`;
            await ctx.reply(message, telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('Продлить подписку', 'extend_subscription')]
            ]));
        }
        catch (error) {
            logger_1.default.error('Error in "Моя подписка" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Помощь"
    bot.hears('Помощь', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            userStates.set(userId, { waitingForHelp: true });
            await ctx.reply('🆘 Помощь\n\n' +
                'Пожалуйста, поделитесь своей проблемой и опишите её.\n' +
                'В кратчайшие сроки мы вернёмся к вам с помощью!\n\n' +
                'Напишите ваше сообщение:', getBackKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in "Помощь" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка кнопки "Оставить отзыв"
    bot.hears('Оставить отзыв', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            if (!userId)
                return;
            userStates.set(userId, { waitingForReview: true });
            await ctx.reply('⭐ Оставить отзыв\n\n' +
                'Оставьте своё мнение о пользовании нашим сервисом, мы будем рады получить обратную связь.\n' +
                'Мы работаем и улучшаем наш продукт, чтобы вы были довольны.\n\n' +
                'Напишите ваш отзыв:', getBackKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in "Оставить отзыв" handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка текстовых сообщений
    bot.on('text', async (ctx) => {
        try {
            const userId = ctx.from?.id;
            const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : undefined;
            if (!userId || !messageText)
                return;
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
                    await SupportMessage_1.SupportMessage.create({
                        userId: userId.toString(),
                        telegramId: userId,
                        userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ''}`.trim(),
                        userUsername: ctx.from?.username || '',
                        message: messageText,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                catch (dbError) {
                    logger_1.default.error('Error saving support message to database', { error: dbError, userId });
                }
                // Пересылаем сообщение администратору
                if (ADMIN_ID) {
                    await ctx.telegram.sendMessage(ADMIN_ID, `🆘 Новое сообщение в поддержку:\n\n` +
                        `👤 Пользователь: @${ctx.from?.username || ctx.from?.first_name}\n` +
                        `🆔 ID: ${userId}\n` +
                        `📝 Сообщение: ${messageText}`);
                }
                await ctx.reply('✅ Ваше сообщение отправлено в службу поддержки!\n\n' +
                    'Мы свяжемся с вами в ближайшее время.', getMainKeyboard());
                return;
            }
            // Обработка отзыва
            if (userState?.waitingForReview) {
                userStates.delete(userId);
                // Сохраняем отзыв в базу данных
                try {
                    await Review_1.Review.create({
                        userId: userId.toString(),
                        telegramId: userId,
                        userName: `${ctx.from?.first_name} ${ctx.from?.last_name || ''}`.trim(),
                        userUsername: ctx.from?.username || '',
                        review: messageText,
                        rating: 0, // Можно добавить логику для определения рейтинга
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }
                catch (dbError) {
                    logger_1.default.error('Error saving review to database', { error: dbError, userId });
                }
                await ctx.reply('🙏 Спасибо за ваш отзыв, мы обязательно вернёмся с обратной связью!', getMainKeyboard());
                return;
            }
            // Если пользователь не в каком-либо состоянии, показываем главное меню
            await ctx.reply('Выберите действие:', getMainKeyboard());
        }
        catch (error) {
            logger_1.default.error('Error in text message handler', { error, userId: ctx.from?.id });
            await ctx.reply('Произошла ошибка. Попробуйте позже.');
        }
    });
    // Обработка callback кнопок
    bot.action('back_to_menu', async (ctx) => {
        await ctx.editMessageText('Выберите действие:');
        await ctx.reply('Выберите действие:', getMainKeyboard());
    });
    bot.action('buy_subscription', async (ctx) => {
        // Перенаправляем на обработчик "Купить подписку"
        await ctx.editMessageText('💎 Выберите тариф подписки:', getSubscriptionKeyboard());
    });
    bot.action('cancel_payment', async (ctx) => {
        await ctx.editMessageText('❌ Оплата отменена.');
        await ctx.reply('Выберите действие:', getMainKeyboard());
    });
    bot.action('extend_subscription', async (ctx) => {
        // Показываем тарифы для продления
        await ctx.editMessageText('💎 Выберите тариф для продления:', getSubscriptionKeyboard());
    });
    // Обработка ошибок
    bot.catch((err, ctx) => {
        logger_1.default.error('Bot error', { error: err, userId: ctx.from?.id });
    });
};
// Запуск бота
const startBot = async () => {
    try {
        // Проверяем, не запущен ли бот уже
        if (isBotRunning) {
            logger_1.default.warn('Bot is already running, skipping startup');
            return;
        }
        logger_1.default.info('Bot startup - checking environment', {
            hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
            tokenLength: process.env.TELEGRAM_BOT_TOKEN?.length || 0,
            tokenStart: process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || 'undefined'
        });
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            logger_1.default.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
            return;
        }
        // Временное отключение бота для тестирования
        if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
            logger_1.default.warn('Telegram Bot is disabled via DISABLE_TELEGRAM_BOT environment variable');
            return;
        }
        // Создаем бота с токеном
        exports.bot = bot = new telegraf_1.Telegraf(process.env.TELEGRAM_BOT_TOKEN);
        // Инициализируем обработчики
        initializeBot();
        await (0, database_1.connectDB)();
        // Проверяем, не запущен ли бот уже перед launch
        if (isBotRunning) {
            logger_1.default.warn('Bot is already running, skipping launch');
            return;
        }
        // Добавляем задержку перед запуском для предотвращения конфликтов
        await new Promise(resolve => setTimeout(resolve, 2000));
        await bot.launch();
        isBotRunning = true;
        logger_1.default.info('🤖 Telegram Bot started successfully');
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
    }
    catch (error) {
        logger_1.default.error('Failed to start bot', { error });
        isBotRunning = false;
        // Если это ошибка конфликта, не завершаем процесс
        if (error && typeof error === 'object' && 'response' in error) {
            const telegramError = error;
            if (telegramError.response?.error_code === 409) {
                logger_1.default.warn('Bot conflict detected - another instance is running');
                logger_1.default.warn('Continuing without Telegram Bot - API will work normally');
                return;
            }
        }
        // Для других ошибок тоже не завершаем процесс
        logger_1.default.warn('Bot startup failed, but continuing without it');
        return;
    }
};
exports.startBot = startBot;
//# sourceMappingURL=index.js.map