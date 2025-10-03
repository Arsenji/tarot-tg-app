import mongoSanitize from 'express-mongo-sanitize';
import { Request, Response, NextFunction } from 'express';

// Middleware для санитизации MongoDB инъекций
export const sanitizeMongo = mongoSanitize({
  // Удаляем $ и . из ключей
  replaceWith: '_',
  // Дополнительные опции безопасности
  onSanitize: ({ req, key }) => {
    console.log(`Sanitized MongoDB injection attempt: ${key}`);
  }
});

// Дополнительная санитизация для специфичных случаев
export const customSanitize = (req: Request, res: Response, next: NextFunction) => {
  // Санитизируем только body, если он существует
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  next();
};

// Рекурсивная санитизация объектов
function sanitizeObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Удаляем опасные операторы MongoDB
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        continue;
      }
      
      // Санитизируем значения
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

// Санитизация строк
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/\$/g, '') // Удаляем $
    .replace(/\./g, '') // Удаляем точки
    .replace(/javascript:/gi, '') // Удаляем javascript:
    .replace(/on\w+=/gi, '') // Удаляем обработчики событий
    .trim();
}
