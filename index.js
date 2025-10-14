"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const axios_1 = __importDefault(require("axios"));
require("./types/express");
const database_1 = require("./utils/database");
const auth_1 = __importDefault(require("./routes/auth"));
const tarot_1 = __importDefault(require("./routes/tarot"));
const payment_1 = __importDefault(require("./routes/payment"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const errorHandler_1 = require("./middleware/errorHandler");
const validation_1 = require("./middleware/validation");
const logger_1 = __importStar(require("./utils/logger"));
const bot_1 = require("./bot");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Global error handlers
(0, errorHandler_1.handleUnhandledRejection)();
(0, errorHandler_1.handleUncaughtException)();
// Connect to database
(0, database_1.connectDB)();
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // max requests per window
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
// CORS configuration - allow multiple origins
const allowedOrigins = [
    'http://localhost:3000',
    'https://tarot-frontend-3.onrender.com',
    'https://tarot-frontend-lr0t.onrender.com',
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            console.log('Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Request logging
app.use(logger_1.requestLogger);
// Morgan logging
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger_1.default.info(message.trim())
    }
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Security middleware
app.use(limiter);
app.use(validation_1.sanitizeInput);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/tarot', tarot_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/subscription', subscription_1.default);
app.use('/api', webhook_1.default);
// OpenAI Proxy Routes
app.post('/openai/v1/chat/completions', async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate request
        if (!req.body.messages || !Array.isArray(req.body.messages)) {
            return res.status(400).json({
                error: 'Invalid request: messages array is required'
            });
        }
        // Prepare OpenAI request
        const openaiRequest = {
            model: req.body.model || 'gpt-4o-mini',
            messages: req.body.messages,
            max_tokens: req.body.max_tokens || 1000,
            temperature: req.body.temperature || 0.7,
            stream: false
        };
        // Make request to OpenAI
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', openaiRequest, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Tarot-App-Proxy/1.0'
            },
            timeout: 30000 // 30 seconds timeout
        });
        const endTime = Date.now();
        const duration = endTime - startTime;
        // Log successful request
        logger_1.default.info(`✅ OpenAI request completed in ${duration}ms`);
        // Return response
        res.json({
            ...response.data,
            _proxy: {
                duration: duration,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger_1.default.error('❌ OpenAI request failed:', {
            error: error.message,
            status: error.response?.status,
            duration: duration
        });
        // Handle different error types
        if (error.response) {
            // OpenAI API error
            res.status(error.response.status).json({
                error: error.response.data?.error || 'OpenAI API error',
                _proxy: {
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    error: true
                }
            });
        }
        else if (error.code === 'ECONNABORTED') {
            // Timeout error
            res.status(408).json({
                error: 'Request timeout',
                _proxy: {
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    error: true
                }
            });
        }
        else {
            // Other errors
            res.status(500).json({
                error: 'Internal proxy error',
                _proxy: {
                    duration: duration,
                    timestamp: new Date().toISOString(),
                    error: true
                }
            });
        }
    }
});
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Tarot Telegram Bot API',
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            tarot: '/api/tarot',
            payment: '/api/payment',
            webhook: '/api/webhook',
            openai: '/openai/v1/chat/completions'
        }
    });
});
// Favicon handler
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No Content
});
// 404 handler
app.use(errorHandler_1.notFound);
// Global error handler
app.use(errorHandler_1.errorHandler);
// Start server
app.listen(PORT, async () => {
    logger_1.default.info(`🚀 Server running on port ${PORT}`);
    logger_1.default.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.default.info(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DEVELOPMENT MODE'}`);
    // Запускаем Telegram бота
    await (0, bot_1.startBot)();
});
//# sourceMappingURL=index.js.map