import dotenv from 'dotenv';
dotenv.config();

// Валидация env (при ошибке — process.exit(1))
import './utils/envValidation';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB } from './utils/database';
import logger from './utils/logger';
import { startBot } from './bot/index';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(helmet({
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
  crossOriginEmbedderPolicy: false
}));

// CORS конфигурация
const isProduction = process.env.NODE_ENV === 'production';
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // В production разрешаем только фронтенд
    if (isProduction) {
      const allowedOrigins = [
        'https://tarot-frontend-3.onrender.com',
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // В development разрешаем локальные адреса
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3004',
        'http://127.0.0.1:3004',
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      // Разрешаем запросы без origin (например, из Postman)
      if (!origin || allowedOrigins.includes(origin) || origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Маршруты
app.get('/', (req, res) => {
  res.json({
    message: 'Tarot Telegram App Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API маршруты
import tarotRoutes from './routes/tarot';
import subscriptionRoutes from './routes/subscription';
import authRoutes from './routes/auth';
import telegramRoutes from './routes/telegram';
 
app.use('/api/tarot', tarotRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/auth', authRoutes);
 app.use('/api/telegram', telegramRoutes);

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err, url: req.url, method: req.method });
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Запуск сервера
const startServer = async () => {
  try {
    // Подключаемся к базе данных
    await connectDB();
    
    // КРИТИЧНО: Запускаем HTTP сервер ПЕРЕД ботом
    // app.listen() - неблокирующая операция, сервер запустится и продолжит выполнение
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      logger.info(`HTTP server started on port ${PORT}`, { port: PORT, environment: process.env.NODE_ENV });
    });
    
    // Запускаем Telegram бота ПОСЛЕ сервера
    // bot.launch() - блокирующая операция (long polling), но сервер уже запущен
    // Важно: запускаем бота в отдельном промиссе, чтобы ошибки бота не завершали сервер
    startBot().catch((error) => {
      logger.error('Failed to start bot, but server is running', { error });
      // НЕ завершаем процесс - сервер должен работать даже без бота
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    // Только критические ошибки (например, не удалось подключиться к БД) завершают процесс
    // Но если есть ALLOW_NO_MONGODB, продолжаем работу
    if (process.env.ALLOW_NO_MONGODB !== 'true') {
      process.exit(1);
    } else {
      logger.warn('Continuing without database connection');
      // Запускаем сервер даже без БД
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT} (without MongoDB)`);
        logger.info(`HTTP server started on port ${PORT} (without MongoDB)`, { port: PORT, environment: process.env.NODE_ENV });
      });
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await mongoose.disconnect();
  process.exit(0);
});

// Обработка необработанных исключений
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

startServer();