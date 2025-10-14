"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contentTypeValidator = exports.requestSizeLimiter = exports.securityLogger = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
// Расширенная конфигурация Helmet
exports.securityHeaders = (0, helmet_1.default)({
    // Защита от XSS
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // Дополнительные заголовки безопасности
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});
// Middleware для логирования подозрительной активности
const securityLogger = (req, res, next) => {
    const suspiciousPatterns = [
        /\$where/i,
        /\$ne/i,
        /\$gt/i,
        /\$lt/i,
        /\$regex/i,
        /javascript:/i,
        /<script/i,
        /on\w+=/i,
        /union/i,
        /select/i,
        /insert/i,
        /delete/i,
        /drop/i
    ];
    // Безопасно получаем данные запроса
    const requestData = {
        body: req.body || {},
        query: req.query || {},
        params: req.params || {},
        url: req.url,
        method: req.method
    };
    const requestString = JSON.stringify(requestData);
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));
    if (isSuspicious) {
        console.warn(`🚨 Suspicious activity detected from IP: ${req.ip}`);
        console.warn(`Request: ${req.method} ${req.url}`);
        console.warn(`Data: ${requestString}`);
        // В production можно отправить уведомление в систему мониторинга
        if (process.env.NODE_ENV === 'production') {
            // Здесь можно добавить отправку в Slack, Discord, или систему мониторинга
        }
    }
    next();
};
exports.securityLogger = securityLogger;
// Middleware для проверки размера запроса
const requestSizeLimiter = (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (contentLength > maxSize) {
        return res.status(413).json({
            error: 'Request entity too large',
            maxSize: '10MB'
        });
    }
    next();
};
exports.requestSizeLimiter = requestSizeLimiter;
// Middleware для проверки типа контента
const contentTypeValidator = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                error: 'Unsupported media type',
                expected: 'application/json'
            });
        }
    }
    next();
};
exports.contentTypeValidator = contentTypeValidator;
//# sourceMappingURL=security.js.map