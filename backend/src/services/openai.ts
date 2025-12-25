import OpenAI from 'openai';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import { TarotReading } from '../models/TarotReading';

export interface OpenAIResponse {
  success: boolean;
  interpretation?: string;
  error?: string;
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

  async isAvailable(): Promise<boolean> {
    return this.isConfigured && this.openai !== null;
  }

  async getCardInterpretation(request: CardInterpretationRequest): Promise<OpenAIResponse> {
    if (!this.isConfigured || !this.openai) {
      return {
        success: false,
        error: 'OpenAI service not configured'
      };
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
        return {
          success: false,
          error: 'Empty response from OpenAI'
        };
      }

      return {
        success: true,
        interpretation
      };
    } catch (error) {
      logger.error('OpenAI card interpretation error', { error, request });
      return {
        success: false,
        error: 'Failed to get card interpretation'
      };
    }
  }

  async getReadingInterpretation(request: ReadingRequest): Promise<OpenAIResponse> {
    if (!this.isConfigured || !this.openai) {
      return {
        success: false,
        error: 'OpenAI service not configured'
      };
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
        return {
          success: false,
          error: 'Empty response from OpenAI'
        };
      }

      return {
        success: true,
        interpretation
      };
    } catch (error) {
      logger.error('OpenAI reading interpretation error', { error, request });
      return {
        success: false,
        error: 'Failed to get reading interpretation'
      };
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
    
    let prompt = `Ты опытный таролог. Дай интерпретацию карты "${cardName}"`;
    
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
      prompt += `Выпала карта: ${card.name}`;
      if (card.isReversed) {
        prompt += ' (перевернутая)';
      }
      prompt += '\n\n';
      prompt += 'ВАЖНО: Твой ответ должен начинаться с четкого ответа "Да" или "Нет" в первой строке.\n';
      prompt += 'После этого дай краткую интерпретацию (2-3 предложения), объясняющую, почему карта указывает на этот ответ.\n';
      prompt += 'Интерпретация должна быть конкретной и связанной с вопросом пользователя.\n';
      prompt += 'Не упоминай другие карты или позиции - это расклад из одной карты для ответа да/нет.';
      
      return prompt;
    }
    
    // Обычный промпт для других типов раскладов
    let prompt = `Интерпретируй расклад "${readingType}" с картами:\n`;
    
    cards.forEach((card, index) => {
      prompt += `${index + 1}. ${card.name}`;
      if (card.isReversed) {
        prompt += ' (перевернутая)';
      }
      prompt += ` в позиции "${card.position}"\n`;
    });
    
    if (question) {
      prompt += `\nВопрос: "${question}"`;
    }
    
    prompt += '\n\nДай глубокую и мудрую интерпретацию всего расклада, учитывая взаимосвязь карт.';
    
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
      return {
        success: false,
        error: 'OpenAI service not configured'
      };
    }

    try {
      let prompt = `Ты опытный таролог. Пользователь задал основной вопрос: "${originalQuestion}"\n\n`;
      prompt += `На этот вопрос выпала карта "${originalCard.name}"`;
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
        interpretation
      };
    } catch (error) {
      logger.error('OpenAI clarifying answer error', { error, clarifyingQuestion, originalQuestion });
      return {
        success: false,
        error: 'Failed to get clarifying answer'
      };
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
          interpretation: '' // Будет заполнено отдельно для каждой карты
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
      } else {
        logger.info('Reading verified in database', {
          readingId: savedReading._id.toString(),
          verifiedUserId: verifyReading.userId,
          verifiedTelegramId: verifyReading.telegramId
        });
      }
      
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
