import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import './types/express';
import { connectDB } from './utils/database';
import authRoutes from './routes/auth';
import tarotRoutes from './routes/tarot';
import paymentRoutes from './routes/payment';
import webhookRoutes from './routes/webhook';
import subscriptionRoutes from './routes/subscription';
import { errorHandler, notFound, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler';
import { validate, sanitizeInput } from './middleware/validation';
import logger, { requestLogger } from './utils/logger';
import { startBot } from './bot';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Global error handlers
handleUnhandledRejection();
handleUncaughtException();

// Connect to database
connectDB();

// Rate limiting
const limiter = rateLimit({
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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(requestLogger);

// Morgan logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(limiter);
app.use(sanitizeInput);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tarot', tarotRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api', webhookRoutes);

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
    const response = await axios.post('https://api.openai.com/v1/chat/completions', openaiRequest, {
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
    logger.info(`✅ OpenAI request completed in ${duration}ms`);

    // Return response
    res.json({
      ...response.data,
      _proxy: {
        duration: duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    logger.error('❌ OpenAI request failed:', {
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
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(408).json({
        error: 'Request timeout',
        _proxy: {
          duration: duration,
          timestamp: new Date().toISOString(),
          error: true
        }
      });
    } else {
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
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'ENABLED' : 'DEVELOPMENT MODE'}`);

  // Запускаем Telegram бота
  await startBot();
});
