import dotenv from 'dotenv';
import { validateJWTSecret } from './jwtSecrets';

// Загружаем переменные окружения
dotenv.config();

interface EnvConfig {
  // Database
  MONGODB_URI: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: string;
  ADMIN_TELEGRAM_ID?: string;
  
  // Admin (для админ-логина)
  ADMIN_PASSWORD_HASH: string;
  
  // OpenAI
  OPENAI_API_KEY: string;
  
  // YooKassa
  YOOKASSA_SHOP_ID?: string;
  YOOKASSA_SECRET_KEY?: string;
  YOOKASSA_WEBHOOK_SECRET?: string;
  
  // Frontend
  FRONTEND_URL: string;
  
  // Server
  PORT: string;
  NODE_ENV: string;
  
  // Optional flags
  DISABLE_TELEGRAM_BOT?: string;
  ALLOW_NO_MONGODB?: string;
}

class EnvValidator {
  private config: EnvConfig;
  private errors: string[] = [];

  constructor() {
    this.config = {
      MONGODB_URI: process.env.MONGODB_URI || '',
      JWT_SECRET: process.env.JWT_SECRET || '',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
      ADMIN_TELEGRAM_ID: process.env.ADMIN_TELEGRAM_ID,
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID,
      YOOKASSA_SECRET_KEY: process.env.YOOKASSA_SECRET_KEY,
      YOOKASSA_WEBHOOK_SECRET: process.env.YOOKASSA_WEBHOOK_SECRET,
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
      PORT: process.env.PORT || '3001',
      NODE_ENV: process.env.NODE_ENV || 'development',
      DISABLE_TELEGRAM_BOT: process.env.DISABLE_TELEGRAM_BOT,
      ALLOW_NO_MONGODB: process.env.ALLOW_NO_MONGODB,
    };
  }

  validate(): { isValid: boolean; config: EnvConfig; errors: string[] } {
    this.errors = [];

    // Required variables
    this.validateRequired('MONGODB_URI', this.config.MONGODB_URI);
    this.validateRequired('JWT_SECRET', this.config.JWT_SECRET);
    this.validateRequired('TELEGRAM_BOT_TOKEN', this.config.TELEGRAM_BOT_TOKEN);
    this.validateRequired('ADMIN_PASSWORD_HASH', this.config.ADMIN_PASSWORD_HASH);
    this.validateRequired('OPENAI_API_KEY', this.config.OPENAI_API_KEY);

    // Format validations
    this.validateAdminPasswordHash();
    this.validateMongoUri();
    this.validateJwtSecret();
    this.validateTelegramToken();
    this.validateOpenAIKey();
    this.validateFrontendUrl();
    this.validatePort();

    // Conditional validations
    this.validateYooKassa();
    this.validateAdminTelegramId();

    return {
      isValid: this.errors.length === 0,
      config: this.config,
      errors: this.errors
    };
  }

  private validateRequired(name: string, value: string): void {
    if (!value || value.trim() === '') {
      this.errors.push(`❌ ${name} is required but not set`);
    }
  }

  private validateAdminPasswordHash(): void {
    if (this.config.ADMIN_PASSWORD_HASH && !this.config.ADMIN_PASSWORD_HASH.match(/^\$2[aby]\$\d{2}\$/)) {
      this.errors.push(`❌ ADMIN_PASSWORD_HASH must be a valid bcrypt hash (e.g. $2a$10$...)`);
    }
  }

  private validateMongoUri(): void {
    if (this.config.MONGODB_URI && !this.config.MONGODB_URI.startsWith('mongodb://') && !this.config.MONGODB_URI.startsWith('mongodb+srv://')) {
      this.errors.push(`❌ MONGODB_URI must start with 'mongodb://' or 'mongodb+srv://'`);
    }
  }

  private validateJwtSecret(): void {
    if (this.config.JWT_SECRET && this.config.JWT_SECRET.length < 32) {
      this.errors.push(`❌ JWT_SECRET must be at least 32 characters long`);
    }

    // Проверяем силу секрета
    if (this.config.JWT_SECRET) {
      const validation = validateJWTSecret(this.config.JWT_SECRET);
      if (!validation.isValid) {
        this.errors.push(`❌ JWT_SECRET is weak (score: ${validation.score}/100). Issues: ${validation.issues.join(', ')}`);
      }

      // Проверяем на предсказуемые значения
      const weakSecrets = [
        'your-super-secret-jwt-key-here-change-in-production',
        'fallback-secret',
        'secret',
        'jwt-secret',
        'admin-secret',
        'change-me',
        'your-secret-here'
      ];

      if (weakSecrets.includes(this.config.JWT_SECRET.toLowerCase())) {
        this.errors.push('❌ JWT_SECRET contains a weak or predictable value');
      }
    }
  }

  private validateTelegramToken(): void {
    if (this.config.TELEGRAM_BOT_TOKEN && !this.config.TELEGRAM_BOT_TOKEN.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      this.errors.push(`❌ TELEGRAM_BOT_TOKEN format is invalid`);
    }
  }

  private validateOpenAIKey(): void {
    if (this.config.OPENAI_API_KEY && !this.config.OPENAI_API_KEY.startsWith('sk-')) {
      this.errors.push(`❌ OPENAI_API_KEY must start with 'sk-'`);
    }
  }

  private validateFrontendUrl(): void {
    try {
      new URL(this.config.FRONTEND_URL);
    } catch {
      this.errors.push(`❌ FRONTEND_URL must be a valid URL`);
    }
  }

  private validatePort(): void {
    const port = parseInt(this.config.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      this.errors.push(`❌ PORT must be a valid port number (1-65535)`);
    }
  }

  private validateYooKassa(): void {
    const hasShopId = !!this.config.YOOKASSA_SHOP_ID;
    const hasSecretKey = !!this.config.YOOKASSA_SECRET_KEY;
    const hasWebhookSecret = !!this.config.YOOKASSA_WEBHOOK_SECRET;

    if (hasShopId !== hasSecretKey) {
      this.errors.push(`❌ Both YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY must be set together`);
    }

    if (hasShopId && this.config.YOOKASSA_SHOP_ID === 'your_yookassa_shop_id') {
      this.errors.push(`❌ YOOKASSA_SHOP_ID contains placeholder value`);
    }

    if (hasSecretKey && this.config.YOOKASSA_SECRET_KEY === 'your_yookassa_secret_key') {
      this.errors.push(`❌ YOOKASSA_SECRET_KEY contains placeholder value`);
    }

    if (hasShopId && hasSecretKey && !hasWebhookSecret) {
      console.warn('⚠️  YOOKASSA_WEBHOOK_SECRET not set — webhook signature verification disabled. Set it in YooKassa dashboard for production security.');
    }
  }

  private validateAdminTelegramId(): void {
    if (this.config.ADMIN_TELEGRAM_ID && !this.config.ADMIN_TELEGRAM_ID.match(/^\d+$/)) {
      this.errors.push(`❌ ADMIN_TELEGRAM_ID must be a numeric user ID`);
    }
  }

  // Helper methods
  isYooKassaConfigured(): boolean {
    return !!(
      this.config.YOOKASSA_SHOP_ID &&
      this.config.YOOKASSA_SECRET_KEY &&
      this.config.YOOKASSA_SHOP_ID !== 'your_yookassa_shop_id' &&
      this.config.YOOKASSA_SECRET_KEY !== 'your_yookassa_secret_key'
    );
  }

  isTelegramBotEnabled(): boolean {
    return this.config.DISABLE_TELEGRAM_BOT !== 'true';
  }

  isMongoRequired(): boolean {
    return this.config.ALLOW_NO_MONGODB !== 'true';
  }
}

// Создаем экземпляр валидатора
const envValidator = new EnvValidator();

// Выполняем валидацию
const validation = envValidator.validate();

// Экспортируем результат
export const envConfig = validation.config;
export const envErrors = validation.errors;
export const isEnvValid = validation.isValid;

// Экспортируем валидатор для использования в других местах
export { envValidator };

// При ошибке валидации — сервер не должен запускаться
if (!isEnvValid) {
  console.error('🚨 Environment validation failed:');
  envErrors.forEach(error => console.error(error));
  console.error('\n📋 Please check your .env file and fix the issues above.');
  process.exit(1);
}
console.log('✅ Environment validation passed');
