#!/usr/bin/env node

/**
 * Скрипт для генерации безопасных JWT секретов
 * Использование: node scripts/generate-secrets.js
 */

import { generateSecretsCLI, createSecureEnvFile, validateJWTSecret } from '../src/utils/jwtSecrets';
import fs from 'fs';
import path from 'path';

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'generate':
    console.log('🔐 Генерация безопасных JWT секретов...\n');
    generateSecretsCLI();
    break;
    
  case 'create-env':
    console.log('📝 Создание .env файла с безопасными секретами...\n');
    
    const envContent = createSecureEnvFile();
    const envPath = path.join(process.cwd(), '.env.secrets');
    
    try {
      fs.writeFileSync(envPath, envContent);
      console.log(`✅ Файл .env.secrets создан: ${envPath}`);
      console.log('📋 Скопируйте нужные секреты в ваш основной .env файл');
      console.log('🚨 НЕ коммитьте .env.secrets в Git!');
    } catch (error) {
      console.error('❌ Ошибка создания файла:', error);
      process.exit(1);
    }
    break;
    
  case 'validate':
    const secretToValidate = args[1];
    if (!secretToValidate) {
      console.error('❌ Укажите секрет для проверки: node scripts/generate-secrets.js validate YOUR_SECRET');
      process.exit(1);
    }
    
    console.log('🔍 Проверка силы JWT секрета...\n');
    const validation = validateJWTSecret(secretToValidate);
    
    console.log(`Секрет: ${secretToValidate}`);
    console.log(`Сила: ${validation.score}/100`);
    console.log(`Статус: ${validation.isValid ? '✅ Безопасен' : '⚠️ Требует улучшения'}`);
    
    if (validation.issues.length > 0) {
      console.log('\n❌ Проблемы:');
      validation.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('\n💡 Рекомендации:');
      validation.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    break;
    
  case 'help':
  case '--help':
  case '-h':
    console.log(`
🔐 Утилита для генерации безопасных JWT секретов

Использование:
  node scripts/generate-secrets.js <команда> [опции]

Команды:
  generate          Генерировать и показать новые секреты
  create-env        Создать .env.secrets файл с секретами
  validate <secret> Проверить силу существующего секрета
  help              Показать эту справку

Примеры:
  node scripts/generate-secrets.js generate
  node scripts/generate-secrets.js create-env
  node scripts/generate-secrets.js validate "my-secret-here"

Безопасность:
  - Используйте разные секреты для разных окружений
  - Регулярно меняйте секреты (каждые 90 дней)
  - НЕ коммитьте секреты в Git
  - Храните секреты в безопасном месте
`);
    break;
    
  default:
    console.log('❌ Неизвестная команда. Используйте "help" для справки.');
    console.log('Доступные команды: generate, create-env, validate, help');
    process.exit(1);
}
