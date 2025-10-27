import { cache, historyCache, dailyAdviceCache, getCurrentDate } from '@/utils/cache';
import { getValidAuthToken } from '@/utils/auth';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  subscriptionRequired?: boolean;
  subscriptionInfo?: {
    hasSubscription: boolean;
    isExpired: boolean;
    canUseYesNo: boolean;
    canUseThreeCards: boolean;
    canUseDailyAdvice: boolean;
    historyLimit: number;
    freeDailyAdviceUsed: boolean;
    remainingDailyAdvice: number;
    remainingYesNo: number;
    remainingThreeCards: number;
  };
}

export interface ReadingResult {
  readingId: string;
  cards: CardData[];
  interpretation: string;
  category: string;
}

export interface DailyAdviceResponse {
  card: {
    name: string;
    category: string;
    uprightImage: string;
    reversedImage: string;
    uprightInterpretation: string;
    reversedInterpretation: string;
  };
  interpretation: string;
  category: string;
}

export interface YesNoResult {
  card: {
    name: string;
    category: string;
    uprightImage: string;
    reversedImage: string;
    uprightInterpretation: string;
    reversedInterpretation: string;
  };
  answer: 'Да' | 'Нет';
  interpretation: string;
  category: string;
}

export interface ThreeCardsReading {
  readingId: string;
  cards: CardData[];
  interpretation: string;
  category: string;
}

export interface TarotReading {
  readingId: string;
  date: number;
  spreadType: string;
  question: string;
  cards: CardData[];
  interpretation: string;
  category: string;
}

// Другие интерфейсы остаются без изменений...
interface TarotCard {
  name: string;
  category: string;
  uprightImage: string;
  reversedImage: string;
  uprightInterpretation: string;
  reversedInterpretation: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://tarot-tg-backend.onrender.com' 
      : 'http://localhost:3001';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    
    try {
      // Получаем токен аутентификации автоматически
      const token = await getValidAuthToken();
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      });

      const duration = performance.now() - startTime;
      const success = response.ok;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const serverResponse = await response.json();
      
      // Если сервер возвращает структуру { success: true, data: ... }, извлекаем data
      if (serverResponse.success && serverResponse.data) {
        return { 
          success: true, 
          data: serverResponse.data,
          subscriptionRequired: serverResponse.subscriptionRequired,
          subscriptionInfo: serverResponse.subscriptionInfo
        };
      }

      // Иначе считаем весь ответ данными
      return { 
        success: true, 
        data: serverResponse as T,
        subscriptionInfo: serverResponse.subscriptionInfo
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('API request error:', error, { endpoint, duration });
      return { 
        success: false, 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getDailyAdvice(): Promise<ApiResponse<String>> {
    // Отключаем кэширование для получения разных карт каждый раз
    const response = await this.request<DailyAdviceResponse>('/api/tarot/daily-advice', {
      method: 'POST',
    });

    return response;
  }

  async getThreeCardsReading(category: string, userQuestion?: string): Promise<ApiResponse<ThreeCardsReading>> {
    return this.request<ThreeCardsReading>('/api/tarot/three-cards', {
      method: 'POST',
      body: JSON.stringify({ category, userQuestion }),
    });
  }

  async getYesNoReading(question: string): Promise<ApiResponse<YesNoResult>> {
    return this.request<YesNoResult>('/api/tarot/yes-no', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async saveThreeCardsReading(question: string, card: CardData[], interpretation: string, category: string, readingId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/api/tarot/save-three-cards', {
      method: 'POST',
      body: JSON.stringify({ question, card, interpretation, category, readingId }),
    });
  }

  async saveYesNoReading(readingId: string, question: string, card: CardData[], interpretation: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/api/tarot/save-yes-no', {
      method: 'POST',
      body: JSON.stringify({ readingId, question, card, interpretation }),
    });
  }

  async getCardEnrichment(cardName: string, category: string): Promise<ApiResponse<any>> {
    return this.request<any>('/api/tarot/enrich-card', {
      method: 'POST',
      body: JSON.stringify({ cardName, category }),
    });
  }

  async getHistory(): Promise<ApiResponse<{ readings: TarotReading[] }>> {
    return this.request<{ readings: TarotReading[] }>('/api/tarot/history');
  }

  async getSubscriptionStatus(userId: string): Promise<ApiResponse<{ subscriptionInfo: any }>> {
    return this.request<{ subscriptionInfo: any }>(`/api/subscription/${userId}/status`);
  }

  async generateSubscriptionPayment(spreadType: string): Promise<ApiResponse<any>> {
    return this.request<any>('/api/subscription/generate-payment', {
      method: 'POST',
      body: JSON.stringify({ spreadType }),
    });
  }
}

export const apiService = new ApiService();
