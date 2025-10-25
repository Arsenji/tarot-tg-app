import fs from 'fs';
import path from 'path';

// Интерфейс для лога
export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'security';
  message: string;
  service?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Конфигурация логирования
const LOG_CONFIG = {
  LOG_DIR: process.env.LOG_DIR || './logs',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_CONSOLE: process.env.NODE_ENV !== 'production',
  ENABLE_FILE: true,
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'jwt',
    'api_key',
    'access_token',
    'refresh_token',
    'credit_card',
    'ssn',
    'phone',
    'email'
  ]
};

// Уровни логирования
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  security: 4
};

class SecureLogger {
  private logDir: string;
  private currentLogFile: string;
  private logStream: fs.WriteStream | null = null;

  constructor() {
    this.logDir = LOG_CONFIG.LOG_DIR;
    this.currentLogFile = path.join(this.logDir, 'app.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogStream(): fs.WriteStream {
    if (!this.logStream) {
      this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    }
    return this.logStream;
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = LOG_CONFIG.SENSITIVE_FIELDS.some(field => 
          lowerKey.includes(field)
        );
        
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  private sanitizeString(str: string): string {
    // Удаляем потенциально чувствительные данные
    let sanitized = str;
    
    // Удаляем JWT токены
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, 'Bearer [REDACTED]');
    
    // Удаляем API ключи
    sanitized = sanitized.replace(/sk-[A-Za-z0-9]{48}/g, 'sk-[REDACTED]');
    sanitized = sanitized.replace(/pk_[A-Za-z0-9]{24}/g, 'pk_[REDACTED]');
    
    // Удаляем пароли
    sanitized = sanitized.replace(/password[=:]\s*[^\s]+/gi, 'password=[REDACTED]');
    
    // Удаляем email адреса (частично)
    sanitized = sanitized.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED]@$2');
    
    // Удаляем номера телефонов
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED]');
    
    return sanitized;
  }

  private shouldLog(level: string): boolean {
    return LOG_LEVELS[level as keyof typeof LOG_LEVELS] >= LOG_LEVELS[LOG_CONFIG.LOG_LEVEL as keyof typeof LOG_LEVELS];
  }

  private formatLogEntry(entry: LogEntry): string {
    const sanitizedMetadata = entry.metadata ? this.sanitizeData(entry.metadata) : undefined;
    
    const logObject = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: this.sanitizeString(entry.message),
      service: entry.service,
      userId: entry.userId,
      ip: entry.ip,
      userAgent: entry.userAgent,
      ...(sanitizedMetadata && { metadata: sanitizedMetadata })
    };
    
    return JSON.stringify(logObject) + '\n';
  }

  private async rotateLogFile(): Promise<void> {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
    
    // Проверяем размер текущего файла
    try {
      const stats = fs.statSync(this.currentLogFile);
      if (stats.size >= LOG_CONFIG.MAX_FILE_SIZE) {
        // Переименовываем существующие файлы
        for (let i = LOG_CONFIG.MAX_FILES - 1; i > 0; i--) {
          const oldFile = path.join(this.logDir, `app.${i}.log`);
          const newFile = path.join(this.logDir, `app.${i + 1}.log`);
          
          if (fs.existsSync(oldFile)) {
            if (i === LOG_CONFIG.MAX_FILES - 1) {
              fs.unlinkSync(oldFile); // Удаляем самый старый файл
            } else {
              fs.renameSync(oldFile, newFile);
            }
          }
        }
        
        // Переименовываем текущий файл
        fs.renameSync(this.currentLogFile, path.join(this.logDir, 'app.1.log'));
      }
    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }
    
    // Консольный вывод
    if (LOG_CONFIG.ENABLE_CONSOLE) {
      const levelColors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
        security: '\x1b[35m' // magenta
      };
      
      const resetColor = '\x1b[0m';
      const color = levelColors[entry.level] || '';
      
      console.log(
        `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${this.sanitizeString(entry.message)}${resetColor}`
      );
    }
    
    // Файловый вывод
    if (LOG_CONFIG.ENABLE_FILE) {
      try {
        await this.rotateLogFile();
        const logLine = this.formatLogEntry(entry);
        this.getLogStream().write(logLine);
      } catch (error) {
        console.error('Error writing to log file:', error);
      }
    }
  }

  // Публичные методы
  async info(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      metadata
    });
  }

  async warn(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      metadata
    });
  }

  async error(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      metadata
    });
  }

  async debug(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      metadata
    });
  }

  async security(message: string, metadata?: Record<string, any>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'security',
      message,
      metadata
    });
  }

  // Метод для логирования HTTP запросов
  async logRequest(req: any, res: any, duration?: number): Promise<void> {
    const metadata = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      duration: duration ? `${duration}ms` : undefined
    };
    
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: level as any,
      message: `HTTP ${req.method} ${req.url}`,
      metadata
    });
  }

  // Метод для логирования ошибок аутентификации
  async logAuthFailure(req: any, reason: string): Promise<void> {
    await this.security('Authentication failure', {
      reason,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
  }

  // Метод для логирования успешной аутентификации
  async logAuthSuccess(req: any, userId: string): Promise<void> {
    await this.security('Authentication success', {
      userId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });
  }

  // Метод для логирования подозрительной активности
  async logSuspiciousActivity(req: any, activity: string, details?: Record<string, any>): Promise<void> {
    await this.security('Suspicious activity detected', {
      activity,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      ...details
    });
  }

  // Закрытие логгера
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// Экспортируем единственный экземпляр
export const secureLogger = new SecureLogger();

// Middleware для логирования HTTP запросов
export const requestLogger = (req: any, res: any, next: any): void => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    await secureLogger.logRequest(req, res, duration);
  });
  
  next();
};

// Middleware для логирования ошибок
export const errorLogger = (err: any, req: any, res: any, next: any): void => {
  secureLogger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
  next(err);
};
