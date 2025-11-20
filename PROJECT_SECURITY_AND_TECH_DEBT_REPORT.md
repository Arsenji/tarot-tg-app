# 📋 АКТУАЛЬНЫЙ СПИСОК ПРОБЛЕМ ПРОЕКТА (после всех исправлений)

**Дата анализа:** 2025-11-09  
**Учтены исправления:** JWT hardening (refresh tokens, jti, fingerprint, blacklist, secret rotation), CSP hardening, CORS strict validation, Health endpoint security, Logging sanitization, Telegram SSRF protection, Frontend security (inline JS removal, bot username env, image hosts validation)

---

## ✅ ИСПРАВЛЕНО (не актуально)

### Безопасность:
- ✅ **JWT Security** - Реализованы refresh tokens, JTI, fingerprint binding, blacklist, secret rotation (`backend/src/utils/jwt.ts`, `backend/src/services/tokenService.ts`)
- ✅ **CSP Hardening** - Удален `unsafe-inline`, добавлены директивы для внешних ресурсов (`backend/src/index.ts:helmet config`)
- ✅ **CORS Strict Validation** - Строгая проверка в production, только `FRONTEND_URL` (`backend/src/index.ts:cors config`)
- ✅ **Health Endpoint Security** - Ограничение информации в production, опциональная защита токеном (`backend/src/index.ts:/health`)
- ✅ **Logging Sanitization** - Нет утечки секретов в логах production (`backend/src/index.ts:startup logs`)
- ✅ **Telegram SSRF Protection** - Валидация webhook URL, централизованный клиент (`backend/src/services/telegramClient.ts`, `backend/src/utils/webhookValidation.ts`)
- ✅ **Frontend Inline JS** - Удалены все `onclick`, заменены на React обработчики (`frontend/src/app/page.tsx`)
- ✅ **Frontend Bot Username** - Вынесен в `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (`frontend/src/utils/safeImage.ts`)
- ✅ **Frontend Image Hosts** - Контроль через `safeImage()` и `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS` (`frontend/src/utils/safeImage.ts`)

### Архитектура:
- ✅ **Environment Unification** - Единый `env.example` в корне проекта
- ✅ **Project Structure Cleanup** - Удалены дублированные скомпилированные файлы из корня (ветка `sandbox/cleanup-structure`)

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Хардкод конфигурационных значений

#### 1.1. YooKassa Service - Base URL
**Файл:** `backend/src/services/yookassa.ts:82`
```typescript
private baseUrl = 'https://api.yookassa.ru/v3'; // ❌ Хардкод
```
**Проблема:** URL не может быть изменен для тестовой/продакшн среды  
**Риск:** Невозможность использования тестового окружения YooKassa  
**Решение:**
```typescript
private baseUrl = process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3';
```
**Новая переменная:** `YOOKASSA_API_URL=https://api.yookassa.ru/v3`

#### 1.2. Subscription Plans - Hardcoded Prices
**Файл:** `backend/src/services/yookassa.ts:56-77`
```typescript
export const SUBSCRIPTION_PLANS = {
  weekly: { price: '99.00', duration: 7 },
  monthly: { price: '299.00', duration: 30 },
  quarterly: { price: '799.00', duration: 90 },
  yearly: { price: '2990.00', duration: 365 }
};
```
**Проблема:** Цены захардкожены, нельзя изменить без пересборки  
**Риск:** Невозможность изменения цен без деплоя, сложность A/B тестирования  
**Решение:** Вынести в переменные окружения:
```env
SUBSCRIPTION_PRICE_WEEKLY=99.00
SUBSCRIPTION_PRICE_MONTHLY=299.00
SUBSCRIPTION_PRICE_QUARTERLY=799.00
SUBSCRIPTION_PRICE_YEARLY=2990.00
SUBSCRIPTION_DURATION_WEEKLY=7
SUBSCRIPTION_DURATION_MONTHLY=30
SUBSCRIPTION_DURATION_QUARTERLY=90
SUBSCRIPTION_DURATION_YEARLY=365
```

#### 1.3. Rate Limiting - Hardcoded Values
**Файл:** `backend/src/middleware/rateLimit.ts:132-182`
```typescript
export const rateLimitConfigs = {
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // ❌ Хардкод
    maxRequests: 1000, // ❌ Хардкод
  }),
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // ❌ Хардкод
    maxRequests: 5, // ❌ Хардкод
  }),
  // ...
};
```
**Проблема:** Значения rate limiting захардкожены, нельзя настроить без изменения кода  
**Риск:** Невозможность гибкой настройки под нагрузку  
**Решение:** Вынести в env:
```env
RATE_LIMIT_API_WINDOW_MS=900000
RATE_LIMIT_API_MAX_REQUESTS=1000
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_PAYMENT_WINDOW_MS=60000
RATE_LIMIT_PAYMENT_MAX_REQUESTS=10
RATE_LIMIT_ADVICE_WINDOW_MS=60000
RATE_LIMIT_ADVICE_MAX_REQUESTS=3
```

#### 1.4. Cache TTL - Hardcoded Values
**Файл:** `backend/src/services/cache.ts` (используется в различных местах)
**Проблема:** TTL для кэша захардкожены в коде  
**Риск:** Невозможность оптимизации кэширования без пересборки  
**Решение:** Вынести в env:
```env
CACHE_TTL_TAROT_CARDS=3600
CACHE_TTL_OPENAI=1800
CACHE_TTL_DAILY_ADVICE=86400
CACHE_TTL_YES_NO=3600
CACHE_TTL_THREE_CARDS=1800
CACHE_TTL_USER_PROFILE=1800
```

---

### 2. Архитектурные проблемы

#### 2.1. Backup файлы в репозитории
**Файлы:**
- `backend/src/bot/index.ts.backup`
- `backend/src/data/tarotCards.ts.backup`
- `frontend/src/services/api.ts.new`

**Проблема:** Backup файлы в репозитории создают путаницу  
**Риск:** Возможное использование устаревшего кода, увеличение размера репозитория  
**Решение:** Удалить все `.backup`, `.new`, `.old` файлы, добавить в `.gitignore`:
```
*.backup
*.new
*.old
```

#### 2.2. Frontend admin-frontend дублирование
**Проблема:** `frontend/admin-frontend/` содержит скомпилированные HTML файлы, дублирует `admin-frontend/` в корне  
**Риск:** Путаница, дублирование кода  
**Решение:** Удалить `frontend/admin-frontend/` или переместить в правильное место

#### 2.3. Множество отчетов в корне
**Проблема:** В корне проекта 20+ `.md` файлов с отчетами  
**Файлы:** `PROJECT_ISSUES_REPORT.md`, `PROJECT_ERRORS_ANALYSIS.md`, `JWT_SECURITY_FIX_COMPLETE.md`, `FRONTEND_SECURITY_FIX_REPORT.md`, и др.  
**Риск:** Запутывание структуры, сложность навигации  
**Решение:** Организовать в `docs/`:
```
docs/
  security/
    JWT_SECURITY_FIX_COMPLETE.md
    FRONTEND_SECURITY_FIX_REPORT.md
    TELEGRAM_SSRF_FIX_REPORT.md
  analysis/
    PROJECT_ISSUES_REPORT.md
    PROJECT_ERRORS_ANALYSIS.md
    PROJECT_HARDCODE_AUDIT.md
  deployment/
    PRODUCTION_DEPLOYMENT_COMPLETE.md
    RENDER_FIX_INSTRUCTIONS.md
```

---

### 3. Проблемы с зависимостями

#### 3.1. Несоответствие версий зависимостей
**Проблема:** Разные версии одних и тех же пакетов в разных workspace  
**Примеры:**
- `express`: backend `^4.18.2`, admin-backend `^4.18.2` (одинаковые, но могут быть конфликты при обновлении)
- `dotenv`: backend `^16.4.5`, admin-backend `^16.4.5` (одинаковые)
- `winston`: backend `^3.11.0`, admin-backend `^3.18.3` (разные минорные версии)

**Риск:** Непредсказуемое поведение, сложность отладки  
**Решение:** Унифицировать версии через корневой `package.json` или использовать lockfile

#### 3.2. @types пакеты в dependencies (admin-backend)
**Файл:** `admin-backend/package.json:35-43`
**Проблема:** `@types/*` пакеты в `devDependencies` (правильно), но есть `dompurify` в `devDependencies` который используется в runtime  
**Риск:** Увеличение размера production bundle  
**Решение:** Проверить использование `dompurify` - если в runtime, переместить в `dependencies`

---

### 4. Проблемы с базой данных

#### 4.1. Отсутствие миграций MongoDB
**Проблема:** Нет системы миграций для MongoDB  
**Риск:** Сложность обновления схемы БД, возможные конфликты при деплое  
**Решение:** Добавить `mongoose-migrate` или `migrate-mongo`:
```bash
npm install --save-dev migrate-mongo
```

#### 4.2. MongoDB timeouts - Hardcoded
**Проблема:** Таймауты подключения захардкожены (если есть)  
**Риск:** Невозможность настройки под инфраструктуру  
**Решение:** Вынести в env (если используются):
```env
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_TIMEOUT=5000
MONGO_SOCKET_TIMEOUT=45000
```

**Примечание:** Индексы MongoDB уже настроены правильно в моделях (`User.ts:62-64`, `TarotReading.ts:69-72`, `SupportMessage.ts:62-63`, `Review.ts:51-52`)

---

## 🟡 СРЕДНИЕ ПРОБЛЕМЫ

### 5. Проблемы с кодом

#### 5.1. Отсутствие централизованной обработки ошибок
**Проблема:** Не все async функции имеют единообразную обработку ошибок  
**Примеры:**
- `frontend/src/services/api.ts:132-140` - обработка есть, но можно улучшить
- `backend/src/services/telegram.ts` - обработка есть, но нет retry логики

**Риск:** Непредсказуемые падения приложения  
**Решение:** Создать централизованный error handler middleware:
```typescript
// backend/src/middleware/errorHandler.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
```

#### 5.2. Отсутствие retry логики для внешних API
**Проблема:** Нет retry логики для Telegram API, YooKassa API, OpenAI API  
**Файлы:**
- `backend/src/services/telegram.ts`
- `backend/src/services/yookassa.ts`
- `backend/src/services/openai.ts`

**Риск:** Падения при временной недоступности внешних сервисов  
**Решение:** Добавить retry с exponential backoff (например, `axios-retry`)

#### 5.3. Отсутствие error boundaries (Frontend)
**Проблема:** Нет error boundaries в React  
**Риск:** Весь app падает при ошибке в любом компоненте  
**Решение:** Добавить Error Boundary:
```typescript
// frontend/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  // ...
}
```

---

### 6. Проблемы с API

#### 6.1. Отсутствие версионирования API
**Проблема:** Нет версии в URL (`/api/v1/...`)  
**Риск:** Сложность обновления без breaking changes  
**Решение:** Добавить версионирование:
```typescript
// backend/src/routes/index.ts
app.use('/api/v1', routes);
```

#### 6.2. Нет документации API
**Проблема:** Отсутствует OpenAPI/Swagger документация  
**Риск:** Сложность разработки frontend/интеграций  
**Решение:** Добавить Swagger:
```bash
npm install swagger-jsdoc swagger-ui-express
```

#### 6.3. Неполная валидация входных данных
**Проблема:** Не все endpoints проверяют входные данные через middleware  
**Риск:** NoSQL injection, XSS  
**Решение:** Добавить `express-validator` на все endpoints (частично уже используется)

---

### 7. Проблемы с Telegram Bot

#### 7.1. Отсутствие очереди для сообщений
**Проблема:** Сообщения отправляются сразу, без очереди  
**Файл:** `backend/src/services/telegram.ts`  
**Риск:** Превышение rate limits Telegram (30 сообщений/сек)  
**Решение:** Добавить очередь (Bull/BullMQ):
```bash
npm install bull ioredis
```

#### 7.2. Нет обработки ошибок Telegram API с retry
**Проблема:** Ошибки логируются, но нет автоматического retry  
**Риск:** Потеря сообщений при временных сбоях  
**Решение:** Добавить retry логику с exponential backoff

---

### 8. Проблемы с производительностью

#### 8.1. Нет кэширования запросов везде
**Проблема:** Redis подключен, но не все запросы кэшируются  
**Риск:** Лишняя нагрузка на БД  
**Решение:** Добавить кэширование для:
- Список таро карт
- Пользовательские профили
- Статистика подписок

#### 8.2. Большой размер bundle (Frontend)
**Проблема:** Frontend bundle может быть излишне большим  
**Риск:** Медленная загрузка  
**Решение:** Настроить code splitting, lazy loading:
```typescript
// next.config.js
experimental: {
  optimizePackageImports: ['lucide-react', 'motion/react']
}
```

---

## 🟢 НИЗКИЕ ПРОБЛЕМЫ

### 9. Проблемы с тестированием

#### 9.1. Недостаточное покрытие тестами
**Проблема:** Есть только unit тесты для `telegramClient` и `webhookValidation`  
**Файлы с тестами:**
- `backend/src/services/__tests__/telegramClient.test.ts`
- `backend/src/utils/__tests__/webhookValidation.test.ts`

**Риск:** Высокая вероятность регрессий  
**Решение:** Добавить тесты для:
- JWT генерация/валидация
- YooKassa payment flow
- OpenAI integration
- Rate limiting
- Cache service

#### 9.2. Нет CI/CD
**Проблема:** Отсутствует автоматизированный деплой  
**Риск:** Ручной деплой, возможные ошибки  
**Решение:** Настроить GitHub Actions:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
```

---

### 10. Проблемы с документацией

#### 10.1. Устаревшая документация
**Проблема:** Некоторые `.md` файлы могут не соответствовать текущей структуре  
**Решение:** Провести аудит и обновить всю документацию

#### 10.2. Отсутствие архитектурной документации
**Проблема:** Нет описания архитектуры системы  
**Риск:** Сложность понимания системы новыми разработчиками  
**Решение:** Создать `docs/ARCHITECTURE.md` с диаграммами

---

### 11. Проблемы с Docker

#### 11.1. Большой размер Docker images
**Проблема:** Images содержат dev зависимости  
**Риск:** Большой размер, медленный деплой  
**Решение:** Использовать multi-stage builds:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

#### 11.2. Отсутствие health checks
**Проблема:** Нет health checks в Docker  
**Риск:** Некорректное определение работоспособности  
**Решение:** Добавить в `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 📊 СВОДКА ПО ПРИОРИТЕТАМ

### 🔴 Высокий приоритет (критично для работы)
1. **Вынести хардкод YooKassa** (URL, цены) - влияет на бизнес-логику
2. **Вынести хардкод rate limiting** - влияет на безопасность и производительность
3. **Вынести хардкод cache TTL** - влияет на производительность
4. **Удалить backup файлы** - запутывание структуры
5. **Организовать документацию** - улучшение поддерживаемости

### 🟡 Средний приоритет (важно для стабильности)
6. **Добавить централизованную обработку ошибок** - стабильность
7. **Добавить retry логику для внешних API** - надежность
8. **Добавить версионирование API** - совместимость
9. **Добавить error boundaries** - UX
10. **Добавить очередь для Telegram сообщений** - надежность

### 🟢 Низкий приоритет (желательно)
11. **Добавить тесты** - качество
12. **Настроить CI/CD** - автоматизация
13. **Улучшить документацию** - поддерживаемость
14. **Оптимизировать Docker images** - деплой

---

## 🎯 РЕКОМЕНДУЕМЫЙ ПЛАН ДЕЙСТВИЙ

### Неделя 1 (Критично)
- [ ] Вынести хардкод YooKassa API URL в `YOOKASSA_API_URL`
- [ ] Вынести цены подписок в env переменные
- [ ] Вынести rate limiting конфигурацию в env
- [ ] Вынести cache TTL значения в env
- [ ] Удалить все backup файлы (`.backup`, `.new`, `.old`)
- [ ] Организовать документацию в `docs/` структуру

### Неделя 2 (Важно)
- [ ] Добавить централизованный error handler middleware
- [ ] Добавить retry логику для Telegram API (axios-retry)
- [ ] Добавить retry логику для YooKassa API
- [ ] Добавить retry логику для OpenAI API
- [ ] Добавить error boundaries в React frontend

### Неделя 3 (Улучшения)
- [ ] Добавить версионирование API (`/api/v1/...`)
- [ ] Добавить Swagger документацию
- [ ] Добавить очередь для Telegram сообщений (Bull/BullMQ)
- [ ] Улучшить кэширование (добавить для всех частых запросов)
- [ ] Добавить миграции MongoDB

### Неделя 4 (Оптимизация)
- [ ] Добавить unit тесты для критических сервисов
- [ ] Настроить CI/CD (GitHub Actions)
- [ ] Оптимизировать Docker images (multi-stage builds)
- [ ] Добавить health checks в docker-compose
- [ ] Создать архитектурную документацию

---

## 📝 ЗАМЕТКИ

### Уже исправлено (не требует внимания):
- ✅ JWT security (refresh tokens, jti, fingerprint, blacklist, secret rotation)
- ✅ CSP hardening
- ✅ CORS strict validation
- ✅ Health endpoint security
- ✅ Logging sanitization
- ✅ Telegram SSRF protection
- ✅ Frontend security (inline JS, bot username, image hosts)
- ✅ MongoDB индексы настроены правильно

### Требует мониторинга:
- Rate limiting настройки (после вынесения в env)
- Cache TTL значения (после вынесения в env)
- Версии зависимостей (при обновлении)

### Ветки с исправлениями:
- `sandbox/cleanup-structure` - очистка структуры проекта
- `sandbox/env-unification` - унификация переменных окружения
- `sandbox/secure-helmet-config` - CSP hardening
- `sandbox/fix-cors-config` - CORS strict validation
- `sandbox/fix-health-endpoint-security` - Health endpoint security
- `sandbox/logging-sanitization` - Logging sanitization
- `sandbox/jwt-hardening` - JWT security
- `sandbox/fix-telegram-ssrf` - Telegram SSRF protection
- `sandbox/fix-frontend-security` - Frontend security fixes

---

**Последнее обновление:** 2025-11-09  
**Следующий аудит рекомендуется:** После исправления критических проблем (неделя 1-2)

