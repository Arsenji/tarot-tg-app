import OpenAI from 'openai';
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
    
    let prompt = `Интерпретируй карту "${cardName}"`;
    
    if (isReversed) {
      prompt += ' в перевернутом положении';
    }
    
    prompt += ` в позиции "${position}".`;
    
    if (question) {
      prompt += ` Вопрос: "${question}".`;
    }
    
    if (context) {
      prompt += ` Контекст: "${context}".`;
    }
    
    prompt += ' Дай глубокую и мудрую интерпретацию этой карты.';
    
    return prompt;
  }

  private buildReadingPrompt(request: ReadingRequest): string {
    const { cards, question, readingType } = request;
    
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

  async saveReading(
    userId: string,
    telegramId: number,
    request: ReadingRequest,
    interpretation: string
  ): Promise<boolean> {
    try {
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
        interpretation
      });

      await reading.save();
      logger.info('Tarot reading saved', { userId, telegramId, readingType: request.readingType });
      return true;
    } catch (error) {
      logger.error('Failed to save tarot reading', { error, userId, telegramId });
      return false;
    }
  }
}

export const openAIService = new OpenAIService();
