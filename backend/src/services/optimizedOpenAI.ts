import OpenAI from 'openai';
import { cache, CACHE_TTL, CACHE_KEYS } from '../services/cache';
import logger from '../utils/logger';
import crypto from 'crypto';

interface OpenAIOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  enableCache?: boolean;
  cacheTtl?: number;
}

interface OpenAIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cached?: boolean;
}

class OptimizedOpenAIService {
  private openai: OpenAI;
  private options: Required<OpenAIOptions>;

  constructor(options: OpenAIOptions) {
    this.options = {
      model: 'gpt-4o-mini',
      maxTokens: 1000,
      temperature: 0.7,
      enableCache: true,
      cacheTtl: CACHE_TTL.OPENAI_RESPONSE,
      ...options
    };

    this.openai = new OpenAI({
      apiKey: this.options.apiKey
    });
  }

  // Генерация хеша для кеширования
  private generateCacheHash(prompt: string, options: Partial<OpenAIOptions> = {}): string {
    const cacheData = {
      prompt,
      model: options.model || this.options.model,
      maxTokens: options.maxTokens || this.options.maxTokens,
      temperature: options.temperature || this.options.temperature
    };

    return crypto
      .createHash('md5')
      .update(JSON.stringify(cacheData))
      .digest('hex');
  }

  // Получение ответа с кешированием
  async getResponse(
    prompt: string, 
    options: Partial<OpenAIOptions> = {}
  ): Promise<OpenAIResponse> {
    const cacheHash = this.generateCacheHash(prompt, options);
    const cacheKey = CACHE_KEYS.OPENAI_RESPONSE(cacheHash);

    // Пытаемся получить из кеша
    if (this.options.enableCache) {
      try {
        const cachedResponse = await cache.get<OpenAIResponse>(cacheKey);
        if (cachedResponse) {
          logger.debug(`OpenAI cache hit for hash: ${cacheHash}`);
          return {
            ...cachedResponse,
            cached: true
          };
        }
      } catch (error) {
        logger.warn('Failed to get cached OpenAI response:', error);
      }
    }

    // Генерируем новый ответ
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || this.options.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.options.maxTokens,
        temperature: options.temperature || this.options.temperature
      });

      const content = response.choices[0]?.message?.content || '';
      const usage = response.usage;

      const result: OpenAIResponse = {
        content,
        usage: usage ? {
          prompt_tokens: usage.prompt_tokens || 0,
          completion_tokens: usage.completion_tokens || 0,
          total_tokens: usage.total_tokens || 0
        } : undefined,
        cached: false
      };

      // Сохраняем в кеш
      if (this.options.enableCache) {
        try {
          await cache.set(cacheKey, result, options.cacheTtl || this.options.cacheTtl);
          logger.debug(`OpenAI response cached with hash: ${cacheHash}`);
        } catch (error) {
          logger.warn('Failed to cache OpenAI response:', error);
        }
      }

      logger.info('OpenAI API call completed', {
        hash: cacheHash,
        tokens: usage?.total_tokens,
        cached: false
      });

      return result;
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw error;
    }
  }

  // Получение ответа для таро с оптимизированными промптами
  async getTarotResponse(
    cards: string[],
    question: string,
    type: 'daily' | 'yesno' | 'threecards',
    options: Partial<OpenAIOptions> = {}
  ): Promise<OpenAIResponse> {
    const prompt = this.generateTarotPrompt(cards, question, type);
    return this.getResponse(prompt, options);
  }

  // Генерация оптимизированных промптов для разных типов раскладов
  private generateTarotPrompt(cards: string[], question: string, type: string): string {
    const basePrompt = `Ты опытный таролог. Проанализируй расклад карт Таро и дай мудрый совет.`;

    switch (type) {
      case 'daily':
        return `${basePrompt}

Карта дня: ${cards[0]}

Дай краткий совет на день (максимум 150 слов). Сосредоточься на практических рекомендациях.`;

      case 'yesno':
        return `${basePrompt}

Вопрос: ${question}
Карта: ${cards[0]}

Дай четкий ответ "Да" или "Нет" с кратким объяснением (максимум 100 слов).`;

      case 'threecards':
        return `${basePrompt}

Вопрос: ${question}

Расклад "Прошлое-Настоящее-Будущее":
- Прошлое: ${cards[0]}
- Настоящее: ${cards[1]}
- Будущее: ${cards[2]}

Дай подробный анализ расклада (максимум 300 слов). Объясни связь между картами и их влияние на ситуацию.`;

      default:
        return `${basePrompt}

Карты: ${cards.join(', ')}
Вопрос: ${question}

Дай мудрый совет на основе этих карт.`;
    }
  }

  // Получение статистики использования
  async getStats(): Promise<any> {
    try {
      const cacheStats = await cache.getStats();
      return {
        cache: cacheStats,
        config: {
          model: this.options.model,
          maxTokens: this.options.maxTokens,
          temperature: this.options.temperature,
          enableCache: this.options.enableCache,
          cacheTtl: this.options.cacheTtl
        }
      };
    } catch (error) {
      logger.error('Failed to get OpenAI service stats:', error);
      return null;
    }
  }

  // Очистка кеша OpenAI ответов
  async clearCache(): Promise<boolean> {
    try {
      await cache.delPattern('openai:response:*');
      logger.info('OpenAI cache cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear OpenAI cache:', error);
      return false;
    }
  }

  // Проверка доступности API
  async isAvailable(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch (error) {
      logger.error('OpenAI API not available:', error);
      return false;
    }
  }
}

// Создаем экземпляр сервиса
export const openaiService = new OptimizedOpenAIService({
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7,
  enableCache: true,
  cacheTtl: CACHE_TTL.OPENAI_RESPONSE
});

export default OptimizedOpenAIService;
