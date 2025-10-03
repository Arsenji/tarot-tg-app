import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Общий rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за 15 минут
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Пропускаем локальные запросы в development
  skip: (req: Request) => {
    return process.env.NODE_ENV === 'development' && req.ip === '::1';
  }
});

// Строгий rate limiting для аутентификации
export const authLimiter = rateLimit({
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
export const tarotLimiter = rateLimit({
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
export const paymentLimiter = rateLimit({
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
export const createLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
