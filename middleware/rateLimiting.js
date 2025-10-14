"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLimiter = exports.paymentLimiter = exports.tarotLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Общий rate limiting
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов за 15 минут
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Пропускаем локальные запросы в development
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && req.ip === '::1';
    }
});
// Строгий rate limiting для аутентификации
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток входа за 15 минут
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Не считаем успешные запросы
});
// Rate limiting для раскладов
exports.tarotLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 минута
    max: 10, // максимум 10 раскладов в минуту
    message: {
        error: 'Too many tarot readings, please wait before trying again.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Rate limiting для платежей
exports.paymentLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 минута
    max: 3, // максимум 3 попытки оплаты в минуту
    message: {
        error: 'Too many payment attempts, please try again later.',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Функция для создания кастомного лимитера
const createLimiter = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createLimiter = createLimiter;
//# sourceMappingURL=rateLimiting.js.map