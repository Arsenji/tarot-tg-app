// Утилиты для кэширования данных
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 минут

  set<T>(key: string, data: T, expiry: number = this.DEFAULT_EXPIRY): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? Date.now() <= item.expiry : false;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Специальные методы для истории
  setHistory(history: any[]): void {
    this.set('history', history, 10 * 60 * 1000); // 10 минут
  }

  getHistory(): any[] | null {
    return this.get('history');
  }

  // Специальные методы для дневного совета
  setDailyAdvice(advice: any, date: string): void {
    this.set(`daily_advice_${date}`, advice, 24 * 60 * 60 * 1000); // 24 часа
  }

  getDailyAdvice(date: string): any | null {
    return this.get(`daily_advice_${date}`);
  }

  // Специальные методы для карт Таро
  setTarotCards(cards: any[]): void {
    this.set('tarot_cards', cards, 60 * 60 * 1000); // 1 час
  }

  getTarotCards(): any[] | null {
    return this.get('tarot_cards');
  }

  // Получить размер кэша
  getSize(): number {
    return this.cache.size;
  }

  // Получить информацию о кэше
  getInfo(): { size: number; keys: string[]; items: Array<{ key: string; expiry: number; age: number }> } {
    const now = Date.now();
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      expiry: item.expiry,
      age: now - item.timestamp
    }));

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      items
    };
  }
}

// Создаем глобальный экземпляр кэша
export const cache = new CacheManager();

// Утилиты для работы с localStorage
export const localStorageCache = {
  set<T>(key: string, data: T, expiry: number = 24 * 60 * 60 * 1000): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiry
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  },

  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  },

  has(key: string): boolean {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return false;

      const item: CacheItem<any> = JSON.parse(itemStr);
      return Date.now() <= item.expiry;
    } catch (error) {
      return false;
    }
  },

  delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to delete from localStorage:', error);
    }
  },

  clear(): void {
    try {
      // Удаляем только наши ключи кэша
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('tarot_cache_')
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }
};

// Специальные методы для истории с localStorage
export const historyCache = {
  set(history: any[]): void {
    localStorageCache.set('tarot_cache_history', history, 10 * 60 * 1000); // 10 минут
  },

  get(): any[] | null {
    return localStorageCache.get('tarot_cache_history');
  },

  has(): boolean {
    return localStorageCache.has('tarot_cache_history');
  },

  clear(): void {
    localStorageCache.delete('tarot_cache_history');
  }
};

// Специальные методы для дневного совета с localStorage
export const dailyAdviceCache = {
  set(advice: any, date: string): void {
    localStorageCache.set(`tarot_cache_daily_advice_${date}`, advice, 24 * 60 * 60 * 1000); // 24 часа
  },

  get(date: string): any | null {
    return localStorageCache.get(`tarot_cache_daily_advice_${date}`);
  },

  has(date: string): boolean {
    return localStorageCache.has(`tarot_cache_daily_advice_${date}`);
  },

  clear(date: string): void {
    localStorageCache.delete(`tarot_cache_daily_advice_${date}`);
  }
};

// Утилита для получения текущей даты в формате YYYY-MM-DD
export const getCurrentDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Утилита для проверки, нужно ли обновить кэш
export const shouldRefreshCache = (lastUpdate: number, maxAge: number = 5 * 60 * 1000): boolean => {
  return Date.now() - lastUpdate > maxAge;
};
