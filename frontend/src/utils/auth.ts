/**
 * Утилиты для работы с аутентификацией через Telegram WebApp
 */

import { getApiEndpoint } from './config';

export interface AuthTokenData {
  token: string;
  userId: string;
  telegramId: number;
  expires: number;
}

/**
 * Получение токена аутентификации через Telegram WebApp
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Сначала проверяем, есть ли токен в localStorage
    let token = localStorage.getItem('authToken');
    
    if (!token && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
      // Если токена нет, получаем его через Telegram WebApp
      const initData = (window as any).Telegram.WebApp.initData;
      
      const authResponse = await fetch(getApiEndpoint('/auth/telegram'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData })
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        token = authData.token;
        
        // Сохраняем токен в localStorage
        localStorage.setItem('authToken', token);
        if (authData.expires) {
          localStorage.setItem('tokenExpires', authData.expires.toString());
        }
      } else {
        console.error('Auth response failed:', authResponse.status, authResponse.statusText);
      }
    }
    
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Проверка валидности токена
 */
export const isTokenValid = (): boolean => {
  try {
    const token = localStorage.getItem('authToken');
    const expires = localStorage.getItem('tokenExpires');
    
    if (!token || !expires) return false;
    
    const now = Date.now();
    return now < parseInt(expires);
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

/**
 * Очистка токенов
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('tokenExpires');
};

/**
 * Получение токена с автоматическим обновлением
 */
export const getValidAuthToken = async (): Promise<string | null> => {
  if (!isTokenValid()) {
    clearAuthTokens();
  }
  
  return await getAuthToken();
};
