"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.validate = exports.schemas = void 0;
const joi_1 = __importDefault(require("joi"));
// Validation schemas for API endpoints
exports.schemas = {
    // Single card reading validation
    singleCardReading: joi_1.default.object({
    // No body required for single card
    }),
    // Three cards reading validation
    threeCardsReading: joi_1.default.object({
        category: joi_1.default.string()
            .valid('love', 'career', 'personal')
            .required()
            .messages({
            'any.only': 'Category must be one of: love, career, personal',
            'any.required': 'Category is required'
        })
    }),
    // Yes/No card reading validation
    yesNoReading: joi_1.default.object({
        question: joi_1.default.string()
            .min(3)
            .max(500)
            .required()
            .messages({
            'string.min': 'Question must be at least 3 characters long',
            'string.max': 'Question must not exceed 500 characters',
            'any.required': 'Question is required'
        })
    }),
    // User authentication validation
    telegramAuth: joi_1.default.object({
        initData: joi_1.default.string()
            .required()
            .messages({
            'any.required': 'initData is required'
        })
    }),
    // Payment validation
    createInvoice: joi_1.default.object({
        amount: joi_1.default.number()
            .min(100)
            .max(100000)
            .required()
            .messages({
            'number.min': 'Amount must be at least 100',
            'number.max': 'Amount must not exceed 100000',
            'any.required': 'Amount is required'
        }),
        description: joi_1.default.string()
            .min(3)
            .max(200)
            .required()
            .messages({
            'string.min': 'Description must be at least 3 characters long',
            'string.max': 'Description must not exceed 200 characters',
            'any.required': 'Description is required'
        })
    })
};
// Middleware for validation
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }
        next();
    };
};
exports.validate = validate;
// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Remove dangerous MongoDB operators
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    // Remove MongoDB operators
                    if (key.startsWith('$') || key.includes('.')) {
                        delete obj[key];
                        continue;
                    }
                    // Recursively sanitize nested objects
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    }
                    // Sanitize strings
                    if (typeof obj[key] === 'string') {
                        obj[key] = obj[key]
                            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                            .replace(/javascript:/gi, '')
                            .replace(/on\w+\s*=/gi, '');
                    }
                }
            }
        };
        sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
//# sourceMappingURL=validation.js.map