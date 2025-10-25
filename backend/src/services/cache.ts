import { Redis } from 'ioredis';
import logger from './logger';

interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      ...config
    };
  }

  async connect(): Promise<void> {
    try {
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        logger.info('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        logger.error('❌ Redis connection error:', error);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        logger.warn('⚠️ Redis connection closed');
        this.isConnected = false;
      });

      await this.redis.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
      this.isConnected = false;
    }
  }

  // Проверка доступности Redis
  isAvailable(): boolean {
    return this.isConnected && this.redis !== null;
  }

  // Установка значения с TTL
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Redis not available, skipping cache set');
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis!.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.redis!.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Получение значения
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) {
      logger.warn('Redis not available, skipping cache get');
      return null;
    }

    try {
      const value = await this.redis!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Удаление значения
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Redis not available, skipping cache delete');
      return false;
    }

    try {
      await this.redis!.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  // Удаление по паттерну
  async delPattern(pattern: string): Promise<boolean> {
    if (!this.isAvailable()) {
      logger.warn('Redis not available, skipping cache delete pattern');
      return false;
    }

    try {
      const keys = await this.redis!.keys(pattern);
      if (keys.length > 0) {
        await this.redis!.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Проверка существования ключа
  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const result = await this.redis!.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Получение TTL
  async ttl(key: string): Promise<number> {
    if (!this.isAvailable()) {
      return -1;
    }

    try {
      return await this.redis!.ttl(key);
    } catch (error) {
      logger.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Увеличение значения
  async incr(key: string, by: number = 1): Promise<number | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return await this.redis!.incrby(key, by);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return null;
    }
  }

  // Установка значения с TTL в миллисекундах
  async setWithMs(key: string, value: any, ttlMs: number): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis!.psetex(key, ttlMs, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache set with MS error:', error);
      return false;
    }
  }

  // Получение статистики
  async getStats(): Promise<any> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const info = await this.redis!.info('memory');
      const keyspace = await this.redis!.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.isConnected
      };
    } catch (error) {
      logger.error('Cache stats error:', error);
      return null;
    }
  }
}

// Создаем экземпляр кеша
export const cache = new CacheService();

// Предустановленные TTL для разных типов данных
export const CACHE_TTL = {
  USER_SUBSCRIPTION: 300, // 5 минут
  TAROT_CARDS: 3600, // 1 час
  OPENAI_RESPONSE: 1800, // 30 минут
  PAYMENT_STATUS: 600, // 10 минут
  DAILY_ADVICE: 86400, // 24 часа
  YES_NO_ADVICE: 3600, // 1 час
  THREE_CARDS_ADVICE: 1800, // 30 минут
  USER_PROFILE: 1800, // 30 минут
  API_RATE_LIMIT: 60, // 1 минута
  WEBHOOK_EVENTS: 300 // 5 минут
};

// Ключи кеша
export const CACHE_KEYS = {
  USER_SUBSCRIPTION: (userId: string) => `user:subscription:${userId}`,
  TAROT_CARDS: 'tarot:cards:all',
  OPENAI_RESPONSE: (hash: string) => `openai:response:${hash}`,
  PAYMENT_STATUS: (paymentId: string) => `payment:status:${paymentId}`,
  DAILY_ADVICE: (userId: string, date: string) => `advice:daily:${userId}:${date}`,
  YES_NO_ADVICE: (userId: string, question: string) => `advice:yesno:${userId}:${question}`,
  THREE_CARDS_ADVICE: (userId: string, question: string) => `advice:threecards:${userId}:${question}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  API_RATE_LIMIT: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  WEBHOOK_EVENTS: (eventId: string) => `webhook:event:${eventId}`
};

export default CacheService;
