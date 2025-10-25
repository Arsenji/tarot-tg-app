import { Request, Response, NextFunction } from 'express';
import { cache, CACHE_TTL, CACHE_KEYS } from '../services/cache';
import logger from '../utils/logger';

interface RateLimitOptions {
  windowMs: number; // Время окна в миллисекундах
  maxRequests: number; // Максимальное количество запросов
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Middleware для rate limiting с использованием кеша
export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Генерируем ключ для rate limiting
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultRateLimitKey(req);

      const now = Date.now();
      const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
      const cacheKey = `rate_limit:${key}:${windowStart}`;

      // Получаем текущее количество запросов
      const currentRequests = await cache.incr(cacheKey) || 0;

      // Если это первый запрос в окне, устанавливаем TTL
      if (currentRequests === 1) {
        const ttlSeconds = Math.ceil(options.windowMs / 1000);
        await cache.set(cacheKey, 1, ttlSeconds);
      }

      // Вычисляем информацию о лимите
      const remaining = Math.max(0, options.maxRequests - currentRequests);
      const resetTime = windowStart + options.windowMs;
      const retryAfter = remaining === 0 ? Math.ceil((resetTime - now) / 1000) : undefined;

      // Добавляем заголовки rate limit
      res.set({
        'X-RateLimit-Limit': options.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
        ...(retryAfter && { 'Retry-After': retryAfter.toString() })
      });

      // Проверяем превышение лимита
      if (currentRequests > options.maxRequests) {
        logger.warn(`Rate limit exceeded for key: ${key}`, {
          key,
          currentRequests,
          maxRequests: options.maxRequests,
          windowMs: options.windowMs,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(options.statusCode || 429).json({
          error: options.message || 'Too Many Requests',
          retryAfter,
          limit: options.maxRequests,
          remaining: 0,
          resetTime: new Date(resetTime).toISOString()
        });
      }

      // Перехватываем ответ для отслеживания успешных/неуспешных запросов
      if (options.skipSuccessfulRequests || options.skipFailedRequests) {
        const originalJson = res.json;
        const originalSend = res.send;
        const originalEnd = res.end;

        res.json = function(data: any) {
          if (options.skipSuccessfulRequests && res.statusCode < 400) {
            // Уменьшаем счетчик для успешных запросов
            cache.incr(cacheKey, -1).catch(() => {});
          }
          return originalJson.call(this, data);
        };

        res.send = function(data: any) {
          if (options.skipSuccessfulRequests && res.statusCode < 400) {
            cache.incr(cacheKey, -1).catch(() => {});
          }
          return originalSend.call(this, data);
        };

        res.end = function(data?: any) {
          if (options.skipSuccessfulRequests && res.statusCode < 400) {
            cache.incr(cacheKey, -1).catch(() => {});
          }
          return originalEnd.call(this, data);
        };
      }

      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      // В случае ошибки пропускаем rate limiting
      next();
    }
  };
};

// Генерация ключа rate limiting по умолчанию
function generateDefaultRateLimitKey(req: Request): string {
  // Используем IP адрес как основной идентификатор
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Добавляем User-Agent для более точной идентификации
  const userAgent = req.get('User-Agent') || 'unknown';
  const userAgentHash = require('crypto')
    .createHash('md5')
    .update(userAgent)
    .digest('hex')
    .substring(0, 8);

  return `${ip}:${userAgentHash}`;
}

// Предустановленные конфигурации rate limiting
export const rateLimitConfigs = {
  // Общий лимит для всех API
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 1000,
    message: 'Too many API requests, please try again later'
  }),

  // Строгий лимит для аутентификации
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
    statusCode: 429
  }),

  // Лимит для создания платежей
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 10,
    message: 'Too many payment requests, please try again later'
  }),

  // Лимит для получения советов
  advice: rateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 3,
    message: 'Too many advice requests, please wait before requesting another reading'
  }),

  // Лимит для webhook'ов
  webhook: rateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 100,
    message: 'Too many webhook requests'
  }),

  // Лимит для админских операций
  admin: rateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 50,
    message: 'Too many admin requests, please try again later'
  }),

  // Лимит для загрузки файлов
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 минута
    maxRequests: 5,
    message: 'Too many upload requests, please try again later'
  })
};

// Утилиты для работы с rate limiting
export const rateLimitUtils = {
  // Получение информации о текущем лимите
  getRateLimitInfo: async (req: Request, options: RateLimitOptions): Promise<RateLimitInfo | null> => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultRateLimitKey(req);

      const now = Date.now();
      const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
      const cacheKey = `rate_limit:${key}:${windowStart}`;

      const currentRequests = await cache.get<number>(cacheKey) || 0;
      const remaining = Math.max(0, options.maxRequests - currentRequests);
      const resetTime = windowStart + options.windowMs;

      return {
        limit: options.maxRequests,
        remaining,
        resetTime,
        retryAfter: remaining === 0 ? Math.ceil((resetTime - now) / 1000) : undefined
      };
    } catch (error) {
      logger.error('Failed to get rate limit info:', error);
      return null;
    }
  },

  // Сброс rate limit для конкретного ключа
  resetRateLimit: async (req: Request, options: RateLimitOptions): Promise<boolean> => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : generateDefaultRateLimitKey(req);

      const now = Date.now();
      const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
      const cacheKey = `rate_limit:${key}:${windowStart}`;

      await cache.del(cacheKey);
      return true;
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
      return false;
    }
  },

  // Получение статистики rate limiting
  getRateLimitStats: async (): Promise<any> => {
    try {
      const stats = await cache.getStats();
      return {
        ...stats,
        rateLimitKeys: await cache.get('rate_limit:*') || []
      };
    } catch (error) {
      logger.error('Failed to get rate limit stats:', error);
      return null;
    }
  }
};

export default rateLimit;
