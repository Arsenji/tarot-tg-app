import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Интерфейс для ошибок валидации
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Интерфейс для правил валидации
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'email' | 'url' | 'boolean';
  custom?: (value: any) => string | null;
}

// Правила валидации для разных типов данных
export const VALIDATION_RULES = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    type: 'string' as const
  },
  password: {
    required: true,
    minLength: 12,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    type: 'string' as const
  },
  email: {
    required: true,
    type: 'email' as const,
    maxLength: 254
  },
  question: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    type: 'string' as const,
    custom: (value: string) => {
      // Проверяем на осмысленность вопроса
      const trimmedValue = value.trim();
      
      if (!trimmedValue.endsWith('?')) {
        return 'Question must end with a question mark';
      }
      
      // Проверяем на наличие русских или английских слов
      const hasValidWords = /[а-яёА-ЯЁa-zA-Z]{2,}/.test(trimmedValue);
      if (!hasValidWords) {
        return 'Question must contain meaningful words';
      }
      
      // Проверяем на спам (повторяющиеся символы)
      const repeatedChars = /(.)\1{4,}/.test(trimmedValue);
      if (repeatedChars) {
        return 'Question contains too many repeated characters';
      }
      
      // Проверяем на HTML теги
      const hasHtmlTags = /<[^>]*>/.test(trimmedValue);
      if (hasHtmlTags) {
        return 'Question cannot contain HTML tags';
      }
      
      return null;
    }
  },
  telegramId: {
    required: true,
    type: 'string' as const,
    pattern: /^\d+$/,
    custom: (value: string) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num <= 0) {
        return 'Invalid Telegram ID';
      }
      return null;
    }
  },
  jwtSecret: {
    required: true,
    minLength: 32,
    maxLength: 256,
    type: 'string' as const,
    custom: (value: string) => {
      // Проверяем на предсказуемые значения
      const weakSecrets = [
        'your-super-secret-jwt-key-here-change-in-production',
        'fallback-secret',
        'secret',
        'jwt-secret',
        'admin-secret'
      ];
      
      if (weakSecrets.includes(value.toLowerCase())) {
        return 'JWT secret is too weak or predictable';
      }
      
      return null;
    }
  }
};

// Функция для санитизации строки
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Удаляем потенциально опасные символы
  let sanitized = input
    .replace(/[<>]/g, '') // Удаляем угловые скобки
    .replace(/javascript:/gi, '') // Удаляем javascript: протоколы
    .replace(/data:/gi, '') // Удаляем data: протоколы
    .replace(/vbscript:/gi, '') // Удаляем vbscript: протоколы
    .trim();
  
  // Используем DOMPurify для дополнительной очистки
  try {
    sanitized = DOMPurify.sanitize(sanitized, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  } catch (error) {
    console.warn('DOMPurify sanitization failed:', error);
  }
  
  return sanitized;
};

// Функция для валидации одного поля
export const validateField = (
  fieldName: string, 
  value: any, 
  rules: ValidationRule
): ValidationError | null => {
  // Проверка обязательности
  if (rules.required && (value === undefined || value === null || value === '')) {
    return {
      field: fieldName,
      message: `${fieldName} is required`,
      code: 'REQUIRED'
    };
  }
  
  // Если поле не обязательное и пустое, пропускаем остальные проверки
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return null;
  }
  
  // Проверка типа
  if (rules.type) {
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field: fieldName,
            message: `${fieldName} must be a string`,
            code: 'INVALID_TYPE'
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return {
            field: fieldName,
            message: `${fieldName} must be a number`,
            code: 'INVALID_TYPE'
          };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return {
            field: fieldName,
            message: `${fieldName} must be a boolean`,
            code: 'INVALID_TYPE'
          };
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            field: fieldName,
            message: `${fieldName} must be a valid email`,
            code: 'INVALID_EMAIL'
          };
        }
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          return {
            field: fieldName,
            message: `${fieldName} must be a valid URL`,
            code: 'INVALID_URL'
          };
        }
        break;
    }
  }
  
  // Проверка длины для строк
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${rules.minLength} characters long`,
        code: 'MIN_LENGTH'
      };
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      return {
        field: fieldName,
        message: `${fieldName} must be no more than ${rules.maxLength} characters long`,
        code: 'MAX_LENGTH'
      };
    }
    
    // Проверка паттерна
    if (rules.pattern && !rules.pattern.test(value)) {
      return {
        field: fieldName,
        message: `${fieldName} format is invalid`,
        code: 'INVALID_PATTERN'
      };
    }
  }
  
  // Кастомная валидация
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      return {
        field: fieldName,
        message: customError,
        code: 'CUSTOM_VALIDATION'
      };
    }
  }
  
  return null;
};

// Middleware для валидации тела запроса
export const validateBody = (rules: Record<string, ValidationRule>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: ValidationError[] = [];
      
      // Валидируем каждое поле
      for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const value = req.body[fieldName];
        const error = validateField(fieldName, value, fieldRules);
        
        if (error) {
          errors.push(error);
        } else if (typeof value === 'string') {
          // Санитизируем строковые значения
          req.body[fieldName] = sanitizeString(value);
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Validation service error' });
    }
  };
};

// Middleware для валидации параметров запроса
export const validateParams = (rules: Record<string, ValidationRule>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: ValidationError[] = [];
      
      for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const value = req.params[fieldName];
        const error = validateField(fieldName, value, fieldRules);
        
        if (error) {
          errors.push(error);
        } else if (typeof value === 'string') {
          req.params[fieldName] = sanitizeString(value);
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Invalid parameters',
          details: errors,
          code: 'PARAM_VALIDATION_ERROR'
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Parameter validation middleware error:', error);
      res.status(500).json({ error: 'Parameter validation service error' });
    }
  };
};

// Middleware для валидации query параметров
export const validateQuery = (rules: Record<string, ValidationRule>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: ValidationError[] = [];
      
      for (const [fieldName, fieldRules] of Object.entries(rules)) {
        const value = req.query[fieldName];
        const error = validateField(fieldName, value, fieldRules);
        
        if (error) {
          errors.push(error);
        } else if (typeof value === 'string') {
          req.query[fieldName] = sanitizeString(value);
        }
      }
      
      if (errors.length > 0) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
          code: 'QUERY_VALIDATION_ERROR'
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error('Query validation middleware error:', error);
      res.status(500).json({ error: 'Query validation service error' });
    }
  };
};

// Функция для валидации массива объектов
export const validateArray = (
  arrayName: string,
  items: any[],
  itemRules: ValidationRule
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(items)) {
    errors.push({
      field: arrayName,
      message: `${arrayName} must be an array`,
      code: 'INVALID_TYPE'
    });
    return errors;
  }
  
  items.forEach((item, index) => {
    const error = validateField(`${arrayName}[${index}]`, item, itemRules);
    if (error) {
      errors.push(error);
    }
  });
  
  return errors;
};
