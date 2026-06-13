import OpenAI from 'openai';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { TarotReading } from '../models/TarotReading';
import { getRussianCardName, localizeCardNames } from '../utils/cardTranslations';

export interface OpenAIResponse {
  success: boolean;
  interpretation?: string;
  error?: string;
  fallback?: boolean;
}

export interface CardInterpretationRequest {
  cardName: string;
  position: string;
  isReversed: boolean;
  question?: string;
  context?: string;
}

export interface ReadingRequest {
  cards: Array<{
    name: string;
    position: string;
    isReversed: boolean;
  }>;
  question?: string;
  readingType: 'single' | 'three' | 'yesno';
}

class OpenAIService {
  private openai: OpenAI | null = null;
  private isConfigured = false;
  private _gptAvailable = false;
  private _lastCheckAt: Date | null = null;
  private _checkInterval: ReturnType<typeof setInterval> | null = null;

  private static readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 минут

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      logger.warn('OpenAI API key not configured');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
      this.isConfigured = true;
      logger.info('OpenAI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI service', { error });
    }
  }

  get gptAvailable(): boolean {
    return this._gptAvailable;
  }

  get lastCheckAt(): Date | null {
    return this._lastCheckAt;
  }

  async isAvailable(): Promise<boolean> {
    return this.isConfigured && this.openai !== null && this._gptAvailable;
  }

  /**
   * Проверяет реальную доступность OpenAI API коротким запросом.
   */
  async checkGptConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.openai) {
      this._gptAvailable = false;
      this._lastCheckAt = new Date();
      logger.warn('GPT check skipped: not configured');
      return false;
    }

    try {
      await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      });
      this._gptAvailable = true;
      this._lastCheckAt = new Date();
      logger.info('GPT health check passed');
      return true;
    } catch (error: any) {
      this._gptAvailable = false;
      this._lastCheckAt = new Date();
      logger.error('GPT health check failed', {
        error: error.message || error,
        status: error.status,
        code: error.code,
      });
      return false;
    }
  }

  /**
   * Запускает первоначальную проверку и периодический опрос.
   */
  async startHealthCheck(): Promise<void> {
    await this.checkGptConnection();

    if (this._checkInterval) clearInterval(this._checkInterval);
    this._checkInterval = setInterval(() => {
      this.checkGptConnection().catch(() => {});
    }, OpenAIService.CHECK_INTERVAL_MS);

    logger.info('GPT periodic health check started', {
      intervalMs: OpenAIService.CHECK_INTERVAL_MS,
      initialStatus: this._gptAvailable,
    });
  }

  async getCardInterpretation(request: CardInterpretationRequest): Promise<OpenAIResponse> {
    if (!this.isConfigured || !this.openai) {
      return { success: false, error: 'OpenAI service not configured', fallback: true };
    }

    if (!this._gptAvailable) {
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }

    try {
      const prompt = this.buildCardInterpretationPrompt(request);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты опытный таролог, который дает глубокие и мудрые интерпретации карт Таро. Отвечай на русском языке.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const interpretation = response.choices[0]?.message?.content?.trim();
      
      if (!interpretation) {
        return { success: false, error: 'Empty response from OpenAI' };
      }

      return { success: true, interpretation: localizeCardNames(interpretation) };
    } catch (error) {
      this._gptAvailable = false;
      logger.error('OpenAI card interpretation error — marking GPT unavailable', { error, request });
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }
  }

  async getReadingInterpretation(request: ReadingRequest): Promise<OpenAIResponse> {
    if (!this.isConfigured || !this.openai) {
      return { success: false, error: 'OpenAI service not configured', fallback: true };
    }

    if (!this._gptAvailable) {
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }

    try {
      const prompt = this.buildReadingPrompt(request);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты опытный таролог, который дает глубокие и мудрые интерпретации раскладов Таро. Отвечай на русском языке.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const interpretation = response.choices[0]?.message?.content?.trim();
      
      if (!interpretation) {
        return { success: false, error: 'Empty response from OpenAI' };
      }

      return { success: true, interpretation: localizeCardNames(interpretation) };
    } catch (error) {
      this._gptAvailable = false;
      logger.error('OpenAI reading interpretation error — marking GPT unavailable', { error, request });
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }
  }

  private buildCardInterpretationPrompt(request: CardInterpretationRequest): string {
    const { cardName, position, isReversed, question, context } = request;
    
    // Определяем русское название позиции
    let positionText = '';
    if (position === 'daily') {
      positionText = 'совет дня';
    } else if (position === 'past') {
      positionText = 'прошлое';
    } else if (position === 'present') {
      positionText = 'настоящее';
    } else if (position === 'future') {
      positionText = 'будущее';
    } else {
      positionText = position;
    }
    
    let prompt = `Ты опытный таролог. Дай интерпретацию карты "${getRussianCardName(cardName)}"`;
    
    if (isReversed) {
      prompt += ' в перевернутом положении';
    }
    
    if (position === 'daily') {
      prompt += ' для совета на день.';
    } else {
      prompt += ` в позиции "${positionText}".`;
    }
    
    if (question) {
      prompt += ` Вопрос: "${question}".`;
    }
    
    if (context) {
      prompt += ` Контекст: "${context}".`;
    }
    
    if (position === 'daily') {
      prompt += '\n\nВАЖНО:\n';
      prompt += '- Используй только русский язык, не упоминай английские названия карт или позиций.\n';
      prompt += '- Дай практический совет на день, связанный с этой картой.\n';
      prompt += '- Пиши естественно, как опытный таролог, обращаясь к человеку на "ты".\n';
      prompt += '- Не упоминай название карты в кавычках или английские слова вроде "daily" или "position".\n';
      prompt += '- Сосредоточься на практических рекомендациях и мудрых советах.';
    } else {
      prompt += '\n\nДай глубокую и мудрую интерпретацию этой карты. Используй только русский язык, не упоминай английские названия.';
    }
    
    return prompt;
  }

  private buildReadingPrompt(request: ReadingRequest): string {
    const { cards, question, readingType } = request;
    
    if (readingType === 'yesno') {
      // Специальный промпт для да/нет расклада
      const card = cards[0];
      let prompt = `Ты опытный таролог. Ты получил вопрос: "${question}"\n\n`;
      prompt += `Выпала карта: ${getRussianCardName(card.name)}`;
      if (card.isReversed) {
        prompt += ' (перевернутая)';
      }
      prompt += '\n\n';
      prompt += 'ВАЖНО: Твой ответ должен начинаться с четкого ответа "Да" или "Нет" в первой строке.\n';
      prompt += 'После этого дай краткую интерпретацию (2-3 предложения), объясняющую, почему карта указывает на этот ответ.\n';
      prompt += 'Интерпретация должна быть конкретной и связанной с вопросом пользователя.\n';
      prompt += 'Используй ТОЛЬКО русский язык. Если упоминаешь карту, используй её русское название (например, "Звезда", "Башня", "Смерть"), никогда не пиши английские названия вроде "The Star".\n';
      prompt += 'Не упоминай другие карты или позиции - это расклад из одной карты для ответа да/нет.';
      
      return prompt;
    }
    
    // Обычный промпт для других типов раскладов
    // Для расклада "три карты" используем русские названия позиций
    let prompt = '';
    
    if (readingType === 'three') {
      // Промпт для расклада трех карт
      const positionNames: { [key: string]: string } = {
        'past': 'Прошлое',
        'present': 'Настоящее',
        'future': 'Будущее'
      };
      
      prompt = `Ты опытный таролог. Проанализируй расклад трех карт:\n\n`;
      
      cards.forEach((card, index) => {
        const positionName = positionNames[card.position] || card.position;
        prompt += `${index + 1}. Карта в позиции "${positionName}"`;
        if (card.isReversed) {
          prompt += ' (перевернутая)';
        }
        prompt += '\n';
      });
      
      if (question) {
        prompt += `\nВопрос пользователя: "${question}"\n`;
      }
      
      prompt += '\nВАЖНО:\n';
      prompt += '- Используй ТОЛЬКО русский язык, не упоминай английские названия карт, позиций или слова вроде "three", "past", "present", "future", "position", "card".\n';
      prompt += '- Используй русские названия позиций: "Прошлое", "Настоящее", "Будущее" вместо английских.\n';
      prompt += '- Не упоминай английские названия карт (например, "Wheel of Fortune", "The World", "Death").\n';
      prompt += '- Если нужно упомянуть карту, используй только русское название или опиши её значение.\n';
      prompt += '- Дай глубокую и мудрую интерпретацию всего расклада, учитывая взаимосвязь карт.\n';
      prompt += '- Пиши естественно, обращаясь к человеку на "ты".';
    } else {
      prompt = `Интерпретируй расклад "${readingType}" с картами:\n`;
      
      cards.forEach((card, index) => {
        prompt += `${index + 1}. ${getRussianCardName(card.name)}`;
        if (card.isReversed) {
          prompt += ' (перевернутая)';
        }
        prompt += ` в позиции "${card.position}"\n`;
      });
      
      if (question) {
        prompt += `\nВопрос: "${question}"`;
      }
      
      prompt += '\n\nДай глубокую и мудрую интерпретацию всего расклада, учитывая взаимосвязь карт.';
      prompt += '\nВАЖНО: Используй только русский язык, не упоминай английские названия карт или позиций.';
    }
    
    return prompt;
  }

  async getClarifyingAnswer(
    clarifyingQuestion: string,
    originalQuestion: string,
    originalCard: { name: string; isReversed?: boolean },
    originalInterpretation: string,
    readingType: string
  ): Promise<OpenAIResponse> {
    if (!this.isConfigured || !this.openai) {
      return { success: false, error: 'OpenAI service not configured', fallback: true };
    }

    if (!this._gptAvailable) {
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }

    try {
      let prompt = `Ты опытный таролог. Пользователь задал основной вопрос: "${originalQuestion}"\n\n`;
      prompt += `На этот вопрос выпала карта "${getRussianCardName(originalCard.name)}"`;
      if (originalCard.isReversed) {
        prompt += ' (перевернутая)';
      }
      prompt += `.\n\n`;
      prompt += `Интерпретация основного расклада: "${originalInterpretation}"\n\n`;
      prompt += `Теперь пользователь задает уточняющий вопрос: "${clarifyingQuestion}"\n\n`;
      
      if (readingType === 'yesno') {
        prompt += 'ВАЖНО:\n';
        prompt += '- Твой ответ должен начинаться с четкого ответа "Да" или "Нет" в первой строке.\n';
        prompt += '- После этого дай краткую интерпретацию (2-3 предложения), объясняющую, почему карта указывает на этот ответ в контексте уточняющего вопроса.\n';
        prompt += '- Используй только русский язык, не упоминай английские названия карт, позиций или слова вроде "yesno", "position", "card".\n';
        prompt += '- Не упоминай название карты в кавычках или английские слова.\n';
        prompt += '- Интерпретация должна быть конкретной и связанной с уточняющим вопросом пользователя.\n';
        prompt += '- Пиши естественно, обращаясь к человеку на "ты".';
      } else {
        prompt += 'ВАЖНО:\n';
        prompt += '- Дай мудрый ответ на уточняющий вопрос, основываясь на карте и интерпретации основного расклада.\n';
        prompt += '- Используй только русский язык, не упоминай английские названия карт, позиций или слова вроде "position", "card".\n';
        prompt += '- Не упоминай название карты в кавычках или английские слова.\n';
        prompt += '- Ответ должен быть конкретным и связанным с уточняющим вопросом.\n';
        prompt += '- Пиши естественно, обращаясь к человеку на "ты".';
      }
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Ты опытный таролог, который дает глубокие и мудрые интерпретации карт Таро. Отвечай на русском языке.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      });

      const interpretation = response.choices[0]?.message?.content?.trim();
      
      if (!interpretation) {
        return {
          success: false,
          error: 'Empty response from OpenAI'
        };
      }

      return {
        success: true,
        interpretation: localizeCardNames(interpretation)
      };
    } catch (error) {
      this._gptAvailable = false;
      logger.error('OpenAI clarifying answer error — marking GPT unavailable', { error, clarifyingQuestion, originalQuestion });
      return { success: false, error: 'AI временно недоступен', fallback: true };
    }
  }

  async saveReading(
    userId: string,
    telegramId: number,
    request: ReadingRequest,
    interpretation: string
  ): Promise<boolean> {
    try {
      // Проверяем подключение к базе данных
      if (mongoose.connection.readyState !== 1) {
        logger.error('MongoDB not connected, cannot save reading', {
          readyState: mongoose.connection.readyState,
          userId,
          telegramId,
          readingType: request.readingType
        });
        return false;
      }

      // Проверяем, что интерпретация не пустая
      if (!interpretation || interpretation.trim().length === 0) {
        logger.error('Cannot save reading: interpretation is empty', {
          userId,
          telegramId,
          readingType: request.readingType
        });
        return false;
      }

      // Проверяем, что есть карты
      if (!request.cards || request.cards.length === 0) {
        logger.error('Cannot save reading: no cards provided', {
          userId,
          telegramId,
          readingType: request.readingType
        });
        return false;
      }

      logger.info('Attempting to save reading', {
        userId,
        telegramId,
        readingType: request.readingType,
        cardsCount: request.cards.length,
        hasQuestion: !!request.question,
        interpretationLength: interpretation?.length || 0,
        dbReadyState: mongoose.connection.readyState,
        dbName: mongoose.connection.name
      });

      const reading = new TarotReading({
        userId,
        telegramId,
        readingType: request.readingType,
        cards: request.cards.map(card => ({
          name: card.name,
          position: card.position,
          isReversed: card.isReversed,
          interpretation: interpretation.trim() || '' // Используем общую интерпретацию для каждой карты
        })),
        question: request.question || '',
        interpretation: interpretation.trim()
      });

      const savedReading = await reading.save();
      logger.info('Tarot reading saved successfully', {
        userId,
        telegramId,
        readingType: request.readingType,
        readingId: savedReading._id.toString(),
        createdAt: savedReading.createdAt,
        cardsCount: savedReading.cards.length,
        savedUserId: savedReading.userId,
        savedTelegramId: savedReading.telegramId,
        savedReadingType: savedReading.readingType
      });
      
      // Проверяем, что запись действительно сохранена в БД
      const verifyReading = await TarotReading.findById(savedReading._id);
      if (!verifyReading) {
        logger.error('Reading was not found after save!', {
          readingId: savedReading._id.toString(),
          userId,
          telegramId
        });
        return false;
      } else {
        logger.info('Reading verified in database', {
          readingId: savedReading._id.toString(),
          verifiedUserId: verifyReading.userId,
          verifiedTelegramId: verifyReading.telegramId
        });
      }
      
      // Подсчитываем общее количество записей пользователя для информации
      const userReadingsCount = await TarotReading.countDocuments({ telegramId });
      logger.info('User readings count after save', {
        userId,
        telegramId,
        totalReadings: userReadingsCount
      });
      
      return true;
    } catch (error: any) {
      logger.error('Failed to save tarot reading', {
        error: error.message,
        stack: error.stack,
        userId,
        telegramId,
        readingType: request.readingType,
        errorName: error.name,
        dbReadyState: mongoose.connection.readyState,
        errorCode: error.code
      });
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
