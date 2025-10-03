/**
 * Конфигурация для API endpoints
 */

export const getApiBaseUrl = (): string => {
  // В продакшене используем URL основного backend сервиса на Render
  if (process.env.NODE_ENV === 'production') {
    return 'https://tarot-tg-backend.onrender.com';
  }
  
  // В разработке используем localhost
  return 'http://localhost:3001';
};

export const getApiEndpoint = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}/api${path}` : `/api${path}`;
};
