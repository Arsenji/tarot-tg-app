import crypto from 'crypto';

// Интерфейс для конфигурации JWT секрета
export interface JWTSecretConfig {
  length: number;
  includeSpecialChars: boolean;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
}

// Стандартные конфигурации для разных типов секретов
export const JWT_SECRET_CONFIGS = {
  // Основной JWT секрет - максимальная безопасность
  main: {
    length: 64,
    includeSpecialChars: true,
    includeNumbers: true,
    includeUppercase: true,
    includeLowercase: true
  },
  // Админский JWT секрет - отдельный от основного
  admin: {
    length: 64,
    includeSpecialChars: true,
    includeNumbers: true,
    includeUppercase: true,
    includeLowercase: true
  },
  // CSRF секрет - для защиты от CSRF атак
  csrf: {
    length: 32,
    includeSpecialChars: true,
    includeNumbers: true,
    includeUppercase: true,
    includeLowercase: true
  },
  // Секрет для подписи сессий
  session: {
    length: 48,
    includeSpecialChars: true,
    includeNumbers: true,
    includeUppercase: true,
    includeLowercase: true
  }
};

// Функция для генерации криптографически стойкого секрета
export const generateJWTSecret = (config: JWTSecretConfig): string => {
  const {
    length,
    includeSpecialChars,
    includeNumbers,
    includeUppercase,
    includeLowercase
  } = config;

  // Определяем набор символов
  let charset = '';
  
  if (includeLowercase) {
    charset += 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeUppercase) {
    charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeNumbers) {
    charset += '0123456789';
  }
  
  if (includeSpecialChars) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (charset.length === 0) {
    throw new Error('At least one character type must be included');
  }

  // Генерируем криптографически стойкий секрет
  const randomBytes = crypto.randomBytes(length);
  let secret = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % charset.length;
    secret += charset[randomIndex];
  }

  return secret;
};

// Функция для генерации секрета на основе окружения
export const generateEnvironmentSecret = (type: keyof typeof JWT_SECRET_CONFIGS): string => {
  const config = JWT_SECRET_CONFIGS[type];
  return generateJWTSecret(config);
};

// Функция для проверки силы существующего секрета
export const validateJWTSecret = (secret: string): {
  isValid: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 0;

  // Проверяем длину
  if (secret.length < 32) {
    issues.push('Secret is too short (minimum 32 characters)');
    score -= 20;
  } else if (secret.length >= 64) {
    score += 20;
  } else {
    score += 10;
  }

  // Проверяем наличие различных типов символов
  const hasLowercase = /[a-z]/.test(secret);
  const hasUppercase = /[A-Z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(secret);

  if (!hasLowercase) {
    issues.push('Missing lowercase letters');
    score -= 5;
  } else {
    score += 5;
  }

  if (!hasUppercase) {
    issues.push('Missing uppercase letters');
    score -= 5;
  } else {
    score += 5;
  }

  if (!hasNumbers) {
    issues.push('Missing numbers');
    score -= 5;
  } else {
    score += 5;
  }

  if (!hasSpecialChars) {
    issues.push('Missing special characters');
    score -= 10;
  } else {
    score += 10;
  }

  // Проверяем на предсказуемые паттерны
  const weakPatterns = [
    'password',
    'secret',
    'jwt',
    'token',
    'key',
    'admin',
    'user',
    '123456',
    'qwerty',
    'abcdef',
    'your-super-secret',
    'change-me',
    'fallback'
  ];

  const lowerSecret = secret.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerSecret.includes(pattern)) {
      issues.push(`Contains weak pattern: ${pattern}`);
      score -= 15;
    }
  }

  // Проверяем на повторяющиеся символы
  const repeatedChars = /(.)\1{3,}/.test(secret);
  if (repeatedChars) {
    issues.push('Contains repeated characters');
    score -= 10;
  }

  // Проверяем на последовательности
  const sequences = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(secret);
  if (sequences) {
    issues.push('Contains sequential characters');
    score -= 10;
  }

  // Проверяем энтропию
  const uniqueChars = new Set(secret).size;
  const entropy = uniqueChars / secret.length;
  
  if (entropy < 0.5) {
    issues.push('Low character diversity');
    score -= 10;
  } else if (entropy > 0.8) {
    score += 10;
  }

  // Генерируем рекомендации
  if (score < 50) {
    recommendations.push('Generate a new, stronger secret');
  }
  
  if (secret.length < 64) {
    recommendations.push('Use at least 64 characters');
  }
  
  if (!hasSpecialChars) {
    recommendations.push('Include special characters');
  }
  
  if (issues.length > 0) {
    recommendations.push('Avoid predictable patterns and sequences');
  }

  return {
    isValid: score >= 40 && issues.length === 0,
    score: Math.max(0, Math.min(100, score)),
    issues,
    recommendations
  };
};

// Функция для генерации всех необходимых секретов
export const generateAllSecrets = (): Record<string, string> => {
  return {
    JWT_SECRET: generateEnvironmentSecret('main'),
    ADMIN_JWT_SECRET: generateEnvironmentSecret('admin'),
    CSRF_SECRET: generateEnvironmentSecret('csrf'),
    SESSION_SECRET: generateEnvironmentSecret('session')
  };
};

// Функция для создания .env файла с безопасными секретами
export const createSecureEnvFile = (): string => {
  const secrets = generateAllSecrets();
  
  return `# ===========================================
# 🔐 БЕЗОПАСНЫЕ JWT СЕКРЕТЫ
# ===========================================
# Сгенерированы: ${new Date().toISOString()}
# ВНИМАНИЕ: НЕ КОММИТЬТЕ ЭТОТ ФАЙЛ В GIT!

# Основной JWT секрет для пользователей
JWT_SECRET=${secrets.JWT_SECRET}

# Админский JWT секрет (отдельный от основного)
ADMIN_JWT_SECRET=${secrets.ADMIN_JWT_SECRET}

# CSRF секрет для защиты от атак
CSRF_SECRET=${secrets.CSRF_SECRET}

# Секрет для подписи сессий
SESSION_SECRET=${secrets.SESSION_SECRET}

# ===========================================
# 📝 ИНСТРУКЦИИ ПО БЕЗОПАСНОСТИ
# ===========================================

# ✅ Используйте разные секреты для разных окружений
# ✅ Регулярно меняйте секреты (каждые 90 дней)
# ✅ Храните секреты в безопасном месте
# ✅ Не передавайте секреты через небезопасные каналы
# ✅ Используйте менеджеры секретов в продакшене
# ✅ Мониторьте использование секретов
# ✅ Логируйте попытки несанкционированного доступа

# ===========================================
# 🔍 ПРОВЕРКА СЕКРЕТОВ
# ===========================================

# Для проверки силы секретов используйте:
# node -e "const { validateJWTSecret } = require('./src/utils/jwtSecrets'); console.log(validateJWTSecret('YOUR_SECRET_HERE'));"
`;
};

// CLI утилита для генерации секретов
export const generateSecretsCLI = (): void => {
  console.log('🔐 Генерация безопасных JWT секретов...\n');
  
  const secrets = generateAllSecrets();
  
  console.log('📋 Сгенерированные секреты:');
  console.log('=====================================');
  
  for (const [name, secret] of Object.entries(secrets)) {
    const validation = validateJWTSecret(secret);
    console.log(`${name}:`);
    console.log(`  Секрет: ${secret}`);
    console.log(`  Сила: ${validation.score}/100`);
    console.log(`  Статус: ${validation.isValid ? '✅ Безопасен' : '⚠️ Требует улучшения'}`);
    if (validation.issues.length > 0) {
      console.log(`  Проблемы: ${validation.issues.join(', ')}`);
    }
    console.log('');
  }
  
  console.log('📝 Рекомендации:');
  console.log('=====================================');
  console.log('1. Сохраните эти секреты в безопасном месте');
  console.log('2. Добавьте их в ваш .env файл');
  console.log('3. НЕ коммитьте .env файл в Git');
  console.log('4. Используйте разные секреты для разных окружений');
  console.log('5. Регулярно меняйте секреты');
  console.log('');
  
  console.log('🚨 ВАЖНО: Эти секреты показаны только один раз!');
  console.log('Сохраните их сейчас, так как они больше не будут отображены.');
};

// Экспорт для использования в других модулях
export default {
  generateJWTSecret,
  generateEnvironmentSecret,
  validateJWTSecret,
  generateAllSecrets,
  createSecureEnvFile,
  generateSecretsCLI,
  JWT_SECRET_CONFIGS
};
