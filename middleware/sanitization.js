"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customSanitize = exports.sanitizeMongo = void 0;
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
// Middleware для санитизации MongoDB инъекций
exports.sanitizeMongo = (0, express_mongo_sanitize_1.default)({
    // Удаляем $ и . из ключей
    replaceWith: '_',
    // Дополнительные опции безопасности
    onSanitize: ({ req, key }) => {
        console.log(`Sanitized MongoDB injection attempt: ${key}`);
    }
});
// Дополнительная санитизация для специфичных случаев
const customSanitize = (req, res, next) => {
    // Санитизируем только body, если он существует
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
};
exports.customSanitize = customSanitize;
// Рекурсивная санитизация объектов
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object')
        return;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            // Удаляем опасные операторы MongoDB
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
                continue;
            }
            // Санитизируем значения
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitizeObject(obj[key]);
            }
        }
    }
}
// Санитизация строк
function sanitizeString(str) {
    if (typeof str !== 'string')
        return str;
    return str
        .replace(/\$/g, '') // Удаляем $
        .replace(/\./g, '') // Удаляем точки
        .replace(/javascript:/gi, '') // Удаляем javascript:
        .replace(/on\w+=/gi, '') // Удаляем обработчики событий
        .trim();
}
//# sourceMappingURL=sanitization.js.map