import Joi from 'joi';

// Validation schemas for API endpoints
export const schemas = {
  // Single card reading validation
  singleCardReading: Joi.object({
    // No body required for single card
  }),

  // Three cards reading validation
  threeCardsReading: Joi.object({
    category: Joi.string()
      .valid('love', 'career', 'personal')
      .required()
      .messages({
        'any.only': 'Category must be one of: love, career, personal',
        'any.required': 'Category is required'
      })
  }),

  // Yes/No card reading validation
  yesNoReading: Joi.object({
    question: Joi.string()
      .min(3)
      .max(500)
      .required()
      .messages({
        'string.min': 'Question must be at least 3 characters long',
        'string.max': 'Question must not exceed 500 characters',
        'any.required': 'Question is required'
      })
  }),

  // User authentication validation
  telegramAuth: Joi.object({
    initData: Joi.string()
      .required()
      .messages({
        'any.required': 'initData is required'
      })
  }),

  // Payment validation
  createInvoice: Joi.object({
    amount: Joi.number()
      .min(100)
      .max(100000)
      .required()
      .messages({
        'number.min': 'Amount must be at least 100',
        'number.max': 'Amount must not exceed 100000',
        'any.required': 'Amount is required'
      }),
    description: Joi.string()
      .min(3)
      .max(200)
      .required()
      .messages({
        'string.min': 'Description must be at least 3 characters long',
        'string.max': 'Description must not exceed 200 characters',
        'any.required': 'Description is required'
      })
  })
};

// Middleware for validation
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

// Sanitization middleware
export const sanitizeInput = (req: any, res: any, next: any) => {
  if (req.body && typeof req.body === 'object') {
    // Remove dangerous MongoDB operators
    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Remove MongoDB operators
          if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
            continue;
          }
          
          // Recursively sanitize nested objects
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
          
          // Sanitize strings
          if (typeof obj[key] === 'string') {
            obj[key] = obj[key]
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
          }
        }
      }
    };
    
    sanitizeObject(req.body);
  }
  
  next();
};