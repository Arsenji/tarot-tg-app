"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taro-tg-app',
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    paymentProviderToken: process.env.PAYMENT_PROVIDER_TOKEN || '',
    paymentProviderSecret: process.env.PAYMENT_PROVIDER_SECRET || ''
};
//# sourceMappingURL=index.js.map