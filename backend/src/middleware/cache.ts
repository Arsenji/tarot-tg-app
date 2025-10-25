import { Request, Response, NextFunction } from 'express';
import { cache, CACHE_TTL, CACHE_KEYS } from '../services/cache';
import logger from '../utils/logger';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  varyBy?: string[];
}

// Middleware для кеширования GET запросов
export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Кешируем только GET запросы
    if (req.method !== 'GET') {
      return next();
    }

    // Проверяем, нужно ли пропустить кеширование
    if (options.skipCache && options.skipCache(req)) {
      return next();
    }

    // Генерируем ключ кеша
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateDefaultCacheKey(req, options.varyBy);

    try {
      // Пытаемся получить данные из кеша
      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`Cache hit for key: ${cacheKey}`);
        
        // Добавляем заголовки кеша
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${options.ttl || 300}`
        });
        
        return res.json(cachedData);
      }

      logger.debug(`Cache miss for key: ${cacheKey}`);

      // Перехватываем оригинальный res.json
      const originalJson = res.json;
      res.json = function(data: any) {
        // Сохраняем в кеш
        cache.set(cacheKey, data, options.ttl || 300).catch(error => {
          logger.error('Failed to cache response:', error);
        });

        // Добавляем заголовки кеша
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${options.ttl || 300}`
        });

        // Вызываем оригинальный метод
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Middleware для инвалидации кеша
export const invalidateCache = (keyPatterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Перехватываем оригинальный res.json
    const originalJson = res.json;
    res.json = function(data: any) {
      // Инвалидируем кеш после успешного ответа
      Promise.all(
        keyPatterns.map(pattern => cache.delPattern(pattern))
      ).catch(error => {
        logger.error('Failed to invalidate cache:', error);
      });

      return originalJson.call(this, data);
    };

    next();
  };
};

// Middleware для кеширования с условной логикой
export const conditionalCache = (condition: (req: Request) => boolean, options: CacheOptions = {}) => {
  return cacheMiddleware({
    ...options,
    skipCache: (req: Request) => !condition(req)
  });
};

// Генерация ключа кеша по умолчанию
function generateDefaultCacheKey(req: Request, varyBy?: string[]): string {
  const baseKey = `${req.method}:${req.originalUrl}`;
  
  if (!varyBy || varyBy.length === 0) {
    return baseKey;
  }

  const varyValues = varyBy.map(header => {
    const value = req.get(header) || req.query[header] || req.params[header];
    return value ? String(value) : '';
  }).filter(Boolean);

  if (varyValues.length === 0) {
    return baseKey;
  }

  const varyString = varyValues.join(':');
  const hash = crypto.createHash('md5').update(varyString).digest('hex');
  
  return `${baseKey}:${hash}`;
}

// Предустановленные конфигурации кеша
export const cacheConfigs = {
  // Кеширование таро карт
  tarotCards: cacheMiddleware({
    ttl: CACHE_TTL.TAROT_CARDS,
    keyGenerator: () => CACHE_KEYS.TAROT_CARDS
  }),

  // Кеширование подписки пользователя
  userSubscription: cacheMiddleware({
    ttl: CACHE_TTL.USER_SUBSCRIPTION,
    keyGenerator: (req) => CACHE_KEYS.USER_SUBSCRIPTION(req.params.userId || req.query.userId as string),
    varyBy: ['authorization']
  }),

  // Кеширование профиля пользователя
  userProfile: cacheMiddleware({
    ttl: CACHE_TTL.USER_PROFILE,
    keyGenerator: (req) => CACHE_KEYS.USER_PROFILE(req.params.userId || req.query.userId as string),
    varyBy: ['authorization']
  }),

  // Кеширование статуса платежа
  paymentStatus: cacheMiddleware({
    ttl: CACHE_TTL.PAYMENT_STATUS,
    keyGenerator: (req) => CACHE_KEYS.PAYMENT_STATUS(req.params.paymentId || req.query.paymentId as string)
  }),

  // Кеширование советов (только для авторизованных пользователей)
  advice: conditionalCache(
    (req) => !!req.headers.authorization,
    {
      ttl: CACHE_TTL.DAILY_ADVICE,
      varyBy: ['authorization']
    }
  ),

  // Кеширование с инвалидацией
  withInvalidation: (patterns: string[]) => [
    invalidateCache(patterns),
    cacheMiddleware()
  ]
};

// Утилиты для работы с кешем
export const cacheUtils = {
  // Очистка кеша пользователя
  clearUserCache: async (userId: string) => {
    const patterns = [
      `user:subscription:${userId}`,
      `user:profile:${userId}`,
      `advice:daily:${userId}:*`,
      `advice:yesno:${userId}:*`,
      `advice:threecards:${userId}:*`
    ];

    await Promise.all(
      patterns.map(pattern => cache.delPattern(pattern))
    );
  },

  // Очистка кеша платежей
  clearPaymentCache: async (paymentId: string) => {
    await cache.del(CACHE_KEYS.PAYMENT_STATUS(paymentId));
  },

  // Очистка всего кеша
  clearAllCache: async () => {
    await cache.delPattern('*');
  },

  // Получение статистики кеша
  getCacheStats: async () => {
    return await cache.getStats();
  }
};

export default cacheMiddleware;
