"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBusinessEvent = exports.logSecurityEvent = exports.logError = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
// Create logs directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Define log format
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.prettyPrint());
// Define console format for development
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
    format: 'HH:mm:ss'
}), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
        metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
}));
// Create logger instance
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'taro-tg-backend',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        // Console transport for development
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
        })
    ],
    exceptionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: 'logs/exceptions-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ],
    rejectionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: 'logs/rejections-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});
// Add file transports for production
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston_daily_rotate_file_1.default({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat
    }));
    logger.add(new winston_daily_rotate_file_1.default({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat
    }));
}
// Logging middleware for Express
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.userId || 'anonymous'
        };
        if (res.statusCode >= 400) {
            logger.warn('HTTP Request', logData);
        }
        else {
            logger.info('HTTP Request', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
// Error logging helper
const logError = (error, context) => {
    logger.error('Application Error', {
        message: error.message,
        stack: error.stack,
        context
    });
};
exports.logError = logError;
// Security event logging
const logSecurityEvent = (event, details) => {
    logger.warn('Security Event', {
        event,
        details,
        timestamp: new Date().toISOString()
    });
};
exports.logSecurityEvent = logSecurityEvent;
// Business logic logging
const logBusinessEvent = (event, details) => {
    logger.info('Business Event', {
        event,
        details,
        timestamp: new Date().toISOString()
    });
};
exports.logBusinessEvent = logBusinessEvent;
exports.default = logger;
//# sourceMappingURL=logger.js.map