"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const yookassa_1 = require("../services/yookassa");
const logger_1 = __importDefault(require("../utils/logger"));
const bot_1 = require("../bot");
const router = (0, express_1.Router)();
// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Инициализация Юкассы
const yooKassa = new yookassa_1.YooKassaService(process.env.YOOKASSA_SHOP_ID || '', process.env.YOOKASSA_SECRET_KEY || '');
// Webhook для обработки уведомлений от Юкассы
router.post('/yookassa/webhook', async (req, res) => {
    try {
        const webhookData = req.body;
        logger_1.default.info('YooKassa webhook received', { webhookData });
        const success = await yooKassa.processWebhook(webhookData);
        if (success) {
            const { object } = webhookData;
            const { metadata } = object;
            const { userId, planType } = metadata;
            // Обновляем подписку пользователя
            const user = await User_1.User.findOne({ telegramId: parseInt(userId) });
            if (user) {
                let duration = 30; // по умолчанию
                switch (planType) {
                    case 'weekly':
                        duration = 7;
                        break;
                    case 'monthly':
                        duration = 30;
                        break;
                    case 'quarterly':
                        duration = 90;
                        break;
                    case 'yearly':
                        duration = 365;
                        break;
                }
                const plan = { duration };
                const now = new Date();
                let expiryDate;
                if (user.subscriptionStatus === 1 && user.subscriptionExpiry && user.subscriptionExpiry > now) {
                    // Если подписка активна - продлеваем (суммируем сроки)
                    expiryDate = new Date(user.subscriptionExpiry.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
                }
                else {
                    // Если подписки нет или она истекла - создаем новую
                    expiryDate = new Date(now.getTime() + (plan.duration * 24 * 60 * 60 * 1000));
                    user.subscriptionActivatedAt = now;
                }
                user.subscriptionStatus = 1;
                user.subscriptionExpiry = expiryDate;
                await user.save();
                logger_1.default.info('Subscription updated', {
                    userId,
                    planType,
                    expiryDate: expiryDate.toISOString()
                });
                // Отправляем уведомление пользователю в Telegram
                try {
                    if (bot_1.bot) {
                        const plan = yookassa_1.SUBSCRIPTION_PLANS[planType];
                        const expiryDateFormatted = expiryDate.toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        });
                        await bot_1.bot.telegram.sendMessage(parseInt(userId), `🎉 Подписка успешно активирована!\n\n` +
                            `📦 Тариф: ${plan.name}\n` +
                            `📅 Срок действия до: ${expiryDateFormatted}\n\n` +
                            `✨ Теперь вам доступны:\n` +
                            `• Безлимитные расклады\n` +
                            `• Полная история раскладов\n` +
                            `• Все виды гаданий\n\n` +
                            `Приятного использования! 🔮`);
                        logger_1.default.info('Subscription notification sent', { userId });
                    }
                }
                catch (notificationError) {
                    logger_1.default.error('Failed to send subscription notification', {
                        error: notificationError,
                        userId
                    });
                    // Не прерываем процесс, даже если уведомление не отправилось
                }
            }
        }
        res.status(200).json({ success: true });
    }
    catch (error) {
        logger_1.default.error('YooKassa webhook error', { error });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
// Проверка статуса платежа
router.get('/payment/status/:paymentId', authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await yooKassa.getPaymentStatus(paymentId);
        res.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                paid: payment.paid,
                amount: payment.amount,
                metadata: payment.metadata
            }
        });
    }
    catch (error) {
        logger_1.default.error('Payment status check error', { error });
        res.status(500).json({ error: 'Failed to check payment status' });
    }
});
exports.default = router;
//# sourceMappingURL=webhook.js.map