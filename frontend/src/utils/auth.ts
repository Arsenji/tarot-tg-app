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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData })
      });
      
      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log('📥 Auth response received:', {
          hasData: !!authData.data,
          hasToken: !!authData.token,
          hasDataToken: !!authData.data?.token,
          fullResponse: authData
        });
        
        // Токен может быть в authData.token или authData.data.token
        token = authData.data?.token || authData.token;
        
        if (token) {
          // Сохраняем токен в localStorage
          localStorage.setItem('authToken', token);
          console.log('✅ Token saved to localStorage:', token.substring(0, 20) + '...');
          const expires = authData.data?.expires || authData.expires;
          if (expires) {
            // expires может быть в секундах — нормализуем до миллисекунд для isTokenValid()
            const raw = typeof expires === 'string' ? parseInt(expires) : expires;
            const expiresMs = raw < 1_000_000_000_000 ? raw * 1000 : raw;
            localStorage.setItem('tokenExpires', expiresMs.toString());
          }
        } else {
          console.error('❌ Token not found in auth response:', authData);
        }
      } else {
        const errorText = await authResponse.text();
        console.error('❌ Auth response failed:', authResponse.status, authResponse.statusText, errorText);
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
    
    const nowMs = Date.now();
    const raw = parseInt(expires);
    if (!raw || Number.isNaN(raw)) return false;

    // Backend отдаёт expires в секундах (AuthController.telegramAuth),
    // а Date.now() — в миллисекундах. Поддерживаем оба формата.
    const expiresMs = raw < 1_000_000_000_000 ? raw * 1000 : raw;
    return nowMs < expiresMs;
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
  // Проверяем валидность токена
  if (!isTokenValid()) {
    clearAuthTokens();
    // Если токен невалиден, пытаемся получить новый
    return await getAuthToken();
  }
  
  // Токен валиден, возвращаем его
  const token = localStorage.getItem('authToken');
  if (token) {
    return token;
  }
  
  // Если токена нет, пытаемся получить новый
  return await getAuthToken();
};
