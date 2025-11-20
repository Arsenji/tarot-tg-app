# 📋 План тестирования для sandbox веток

**Дата создания:** 2025-11-09  
**Проект:** Tarot Telegram App  
**Ветки для тестирования:** 10 sandbox веток с исправлениями безопасности и архитектуры

---

## 📊 Общая информация

Все ветки созданы для изолированной работы над исправлениями безопасности и улучшениями архитектуры. Каждая ветка должна быть протестирована перед слиянием в `main`.

### Порядок тестирования (рекомендуемый)

1. `sandbox/cleanup-structure` - базовая очистка структуры
2. `sandbox/env-unification` - унификация переменных окружения
3. `sandbox/secure-helmet-config` - CSP hardening
4. `sandbox/fix-cors-config` - CORS strict validation
5. `sandbox/fix-health-endpoint-security` - Health endpoint security
6. `sandbox/logging-sanitization` - Logging sanitization
7. `sandbox/jwt-hardening` - JWT security (самая сложная)
8. `sandbox/fix-telegram-ssrf` - Telegram SSRF protection
9. `sandbox/fix-frontend-security` - Frontend security fixes
10. `sandbox/yookassa-config` - YooKassa configuration

---

## 1. 🧹 sandbox/cleanup-structure

### Что исправляет
- Удаляет дублированные скомпилированные файлы из корня проекта
- Очищает структуру проекта от артефактов сборки
- Обновляет `.gitignore` для предотвращения повторных проблем
- Приводит проект к чистой монорепозиторий структуре

### Изменённые файлы
- Удалены: `dist/`, `.next/`, скомпилированные `.js`, `.js.map`, `.d.ts` файлы из корня
- Обновлён: `.gitignore`
- Удалены: дублирующие папки (`bot/`, `config/`, `models/`, `routes/`, `services/`, `utils/`, `middleware/` из корня)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/cleanup-structure

# 2. Проверить структуру проекта
ls -la | grep -E "(dist|\.next|\.js$|\.d\.ts$)" | wc -l
# Должно быть 0 или минимальное количество

# 3. Проверить, что исходники на месте
ls -d backend frontend admin-backend admin-frontend

# 4. Проверить сборку backend
cd backend && npm run build && ls dist/ | head -5

# 5. Проверить сборку frontend
cd ../frontend && npm run build && ls .next/ 2>/dev/null | head -5

# 6. Проверить .gitignore
cat .gitignore | grep -E "(dist|\.next|\.js$|\.d\.ts$)" | head -5
```

### Критерии успешного тестирования

- ✅ В корне проекта нет скомпилированных файлов (`.js`, `.js.map`, `.d.ts`)
- ✅ Нет дублирующих папок с исходниками в корне
- ✅ Все сервисы (backend, frontend, admin-backend, admin-frontend) находятся в своих директориях
- ✅ `.gitignore` содержит правила для игнорирования артефактов сборки
- ✅ Backend успешно компилируется (`npm run build`)
- ✅ Frontend успешно компилируется (`npm run build`)
- ✅ Структура проекта соответствует монорепозиторию

### Проверки безопасности
- ✅ Нет `.env` файлов в репозитории (проверить через `git ls-files | grep "\.env$"`)
- ✅ Нет секретов в коммитах

---

## 2. ⚙️ sandbox/env-unification

### Что исправляет
- Создаёт единый `env.example` в корне проекта
- Объединяет переменные окружения из backend и frontend
- Добавляет все обязательные переменные с безопасными значениями по умолчанию
- Обновляет `.dockerignore` и `.gitignore` для защиты `.env` файлов

### Изменённые файлы
- Создан/обновлён: `env.example` (корень проекта)
- Обновлён: `.gitignore` (добавлены правила для `.env`)
- Обновлён: `.dockerignore` (добавлены правила для `.env`)
- Обновлён: `README.md` (раздел Environment Setup)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/env-unification

# 2. Проверить наличие env.example
ls -la env.example

# 3. Проверить содержимое env.example
cat env.example | grep -E "(MONGODB_URI|JWT_SECRET|TELEGRAM_BOT_TOKEN|OPENAI_API_KEY|YOOKASSA|FRONTEND_URL)" | head -10

# 4. Проверить, что все обязательные переменные присутствуют
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET" "TELEGRAM_BOT_TOKEN" "OPENAI_API_KEY" "FRONTEND_URL")
for var in "${REQUIRED_VARS[@]}"; do
  grep -q "^${var}=" env.example && echo "✅ $var" || echo "❌ $var отсутствует"
done

# 5. Проверить .gitignore
grep -q "\.env$" .gitignore && echo "✅ .env в .gitignore" || echo "❌ .env не в .gitignore"

# 6. Проверить .dockerignore
grep -q "\.env$" .dockerignore && echo "✅ .env в .dockerignore" || echo "❌ .env не в .dockerignore"

# 7. Создать тестовый .env и проверить запуск
cp env.example .env.test-check
cd backend && NODE_ENV=test dotenv -e ../.env.test-check -- node -e "console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅' : '❌')"
cd ..
rm .env.test-check
```

### Критерии успешного тестирования

- ✅ `env.example` существует в корне проекта
- ✅ Все обязательные переменные присутствуют в `env.example`:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `TELEGRAM_BOT_TOKEN`
  - `OPENAI_API_KEY`
  - `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
  - `FRONTEND_URL`
  - `REDIS_URL`
- ✅ Все переменные имеют безопасные значения по умолчанию (не реальные секреты)
- ✅ `.env` файлы игнорируются в `.gitignore` и `.dockerignore`
- ✅ Backend может загрузить переменные из `.env` файла
- ✅ README.md содержит раздел "⚙️ Environment Setup"

### Проверки безопасности
- ✅ В `env.example` нет реальных секретов (только placeholder значения)
- ✅ `.env` файлы не попадают в git (проверить через `git status`)

---

## 3. 🛡️ sandbox/secure-helmet-config

### Что исправляет
- Удаляет `'unsafe-inline'` из `styleSrc` в CSP
- Добавляет поддержку внешних стилей через `"https:"`
- Настраивает `connectSrc` для фронтенда через `FRONTEND_URL`
- Добавляет директивы `fontSrc`, `objectSrc`, `upgradeInsecureRequests`
- Улучшает общую безопасность Content Security Policy

### Изменённые файлы
- `backend/src/index.ts` (конфигурация helmet)
- `env.example` (добавлен `FRONTEND_URL`)
- `README.md` (документация CSP)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/secure-helmet-config

# 2. Запустить backend
cd backend && npm run dev &
BACKEND_PID=$!
sleep 5

# 3. Проверить CSP заголовки
curl -I http://localhost:3001 2>&1 | grep -i "content-security-policy"

# 4. Проверить, что unsafe-inline отсутствует
curl -s http://localhost:3001 2>&1 | grep -i "content-security-policy" | grep -v "unsafe-inline" && echo "✅ unsafe-inline удалён" || echo "❌ unsafe-inline присутствует"

# 5. Проверить, что FRONTEND_URL используется в connectSrc
curl -s http://localhost:3001 2>&1 | grep -i "content-security-policy" | grep -q "connect-src" && echo "✅ connectSrc настроен" || echo "❌ connectSrc отсутствует"

# 6. Проверить работу frontend с новым CSP
cd ../frontend && npm run dev &
FRONTEND_PID=$!
sleep 8

# 7. Проверить, что frontend загружается без ошибок CSP в консоли
curl -s http://localhost:3000 2>&1 | head -20

# 8. Остановить процессы
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
```

### Критерии успешного тестирования

- ✅ CSP заголовки присутствуют в ответах сервера
- ✅ `'unsafe-inline'` отсутствует в `styleSrc`
- ✅ `connectSrc` содержит `FRONTEND_URL` из переменных окружения
- ✅ `fontSrc` настроен с `"https:"` и `"data:"`
- ✅ `objectSrc` установлен в `"'none'"`
- ✅ `upgradeInsecureRequests` включен
- ✅ Frontend загружается без ошибок CSP в консоли браузера
- ✅ Внешние стили (если используются) загружаются корректно
- ✅ Нет ошибок в консоли браузера при загрузке страниц

### Проверки безопасности
- ✅ CSP блокирует inline стили (проверить через DevTools)
- ✅ CSP разрешает только доверенные источники для подключений

---

## 4. 🔒 sandbox/fix-cors-config

### Что исправляет
- Реализует строгую проверку CORS в production (только `FRONTEND_URL`)
- В development разрешает `localhost:3000` и `FRONTEND_URL`
- Добавляет защиту от пустого `FRONTEND_URL` в production
- Логирует разрешённые origins для отладки

### Изменённые файлы
- `backend/src/index.ts` (конфигурация CORS)
- `env.example` (комментарии о `FRONTEND_URL`)
- `README.md` (документация CORS)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/fix-cors-config

# 2. Тест в development режиме
cd backend
NODE_ENV=development FRONTEND_URL=http://localhost:3000 npm run dev &
BACKEND_PID=$!
sleep 5

# 3. Проверить CORS для разрешённого origin
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3001/api/tarot/cards 2>&1 | grep -i "access-control"

# 4. Проверить CORS для неразрешённого origin (должен быть отклонён)
curl -H "Origin: http://evil.com" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3001/api/tarot/cards 2>&1 | grep -i "access-control"

# 5. Тест в production режиме
kill $BACKEND_PID
NODE_ENV=production FRONTEND_URL=https://example.com npm run dev &
BACKEND_PID=$!
sleep 5

# 6. Проверить, что localhost:3000 отклоняется в production
curl -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3001/api/tarot/cards 2>&1 | grep -i "access-control" || echo "✅ localhost отклонён"

# 7. Проверить, что FRONTEND_URL разрешён
curl -H "Origin: https://example.com" -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:3001/api/tarot/cards 2>&1 | grep -i "access-control-allow-origin"

# 8. Проверить предупреждение при отсутствии FRONTEND_URL в production
kill $BACKEND_PID
NODE_ENV=production npm run dev 2>&1 | grep -i "CORS SECURITY WARNING" && echo "✅ Предупреждение выводится" || echo "❌ Предупреждение отсутствует"
kill %1 2>/dev/null
```

### Критерии успешного тестирования

- ✅ В development режиме разрешены запросы с `http://localhost:3000`
- ✅ В development режиме разрешены запросы с `FRONTEND_URL`
- ✅ В production режиме разрешены запросы только с `FRONTEND_URL`
- ✅ В production режиме запросы с `localhost:3000` отклоняются
- ✅ В production режиме запросы с других origins отклоняются
- ✅ При отсутствии `FRONTEND_URL` в production выводится предупреждение
- ✅ В логах выводится список разрешённых origins
- ✅ Frontend может делать запросы к backend API

### Проверки безопасности
- ✅ CORS блокирует неавторизованные origins в production
- ✅ Нет утечки информации через CORS заголовки

---

## 5. 🏥 sandbox/fix-health-endpoint-security

### Что исправляет
- Ограничивает информацию, возвращаемую `/health` endpoint в production
- В production возвращает только `{ "status": "ok" }`
- В development возвращает расширенную информацию (uptime, memory, environment)
- Добавляет опциональную защиту токеном через `HEALTH_API_KEY`

### Изменённые файлы
- `backend/src/index.ts` (endpoint `/health`)
- `env.example` (добавлен `HEALTH_API_KEY`)
- `README.md` (документация health endpoint)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/fix-health-endpoint-security

# 2. Тест в development режиме
cd backend
NODE_ENV=development npm run dev &
BACKEND_PID=$!
sleep 5

# 3. Проверить расширенную информацию в development
curl -s http://localhost:3001/health | jq '.' || curl -s http://localhost:3001/health
# Должно содержать: status, timestamp, uptime, memory, environment

# 4. Тест в production режиме
kill $BACKEND_PID
NODE_ENV=production npm run dev &
BACKEND_PID=$!
sleep 5

# 5. Проверить ограниченную информацию в production
curl -s http://localhost:3001/health
# Должно быть только: {"status":"ok"}

# 6. Проверить защиту токеном (если HEALTH_API_KEY установлен)
kill $BACKEND_PID
NODE_ENV=production HEALTH_API_KEY=test_key_123 npm run dev &
BACKEND_PID=$!
sleep 5

# 7. Проверить доступ без токена (должен быть 403)
curl -s http://localhost:3001/health
# Должно быть: {"status":"forbidden"}

# 8. Проверить доступ с правильным токеном
curl -H "Authorization: Bearer test_key_123" -s http://localhost:3001/health
# Должно быть: {"status":"ok"}

# 9. Проверить логирование доступа в production
curl -s http://localhost:3001/health > /dev/null
# Проверить логи на наличие записи о доступе

kill $BACKEND_PID
```

### Критерии успешного тестирования

- ✅ В development режиме `/health` возвращает полную информацию:
  - `status: "healthy"`
  - `timestamp`
  - `uptime`
  - `memory`
  - `environment`
- ✅ В production режиме `/health` возвращает только `{ "status": "ok" }`
- ✅ При установленном `HEALTH_API_KEY` запросы без токена возвращают 403
- ✅ При установленном `HEALTH_API_KEY` запросы с правильным токеном возвращают `{ "status": "ok" }`
- ✅ В production логируются обращения к `/health` endpoint
- ✅ Нет утечки информации о внутреннем состоянии сервера в production

### Проверки безопасности
- ✅ В production не возвращаются: uptime, memory usage, environment
- ✅ Токен защиты работает корректно (если настроен)

---

## 6. 🧾 sandbox/logging-sanitization

### Что исправляет
- Удаляет чувствительные данные из логов в production
- В production логирует только минимальную информацию при запуске
- В development сохраняет расширенные логи с пометкой `[DEV MODE]`
- Создаёт утилиту `src/utils/env.ts` для проверки окружения

### Изменённые файлы
- `backend/src/index.ts` (startup logging)
- `backend/src/utils/env.ts` (новый файл с `isProd` и `getLogLevel`)
- `README.md` (раздел "🧾 Logging Policy")

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/logging-sanitization

# 2. Тест в development режиме
cd backend
NODE_ENV=development FRONTEND_URL=http://localhost:3000 npm run dev 2>&1 | head -20
# Должны быть логи с [DEV MODE] и информацией о порте, окружении, FRONTEND_URL

# 3. Тест в production режиме
NODE_ENV=production FRONTEND_URL=https://example.com npm run dev 2>&1 | head -10
# Должна быть только минимальная информация без FRONTEND_URL и других переменных

# 4. Проверить, что секреты не логируются
NODE_ENV=production JWT_SECRET=secret123 FRONTEND_URL=https://example.com npm run dev 2>&1 | grep -i "secret\|jwt_secret\|frontend_url" && echo "❌ Секреты в логах!" || echo "✅ Секреты не логируются"

# 5. Проверить наличие утилиты env.ts
ls backend/src/utils/env.ts && echo "✅ env.ts существует" || echo "❌ env.ts отсутствует"

# 6. Проверить содержимое env.ts
cat backend/src/utils/env.ts | grep -E "(isProd|getLogLevel)" && echo "✅ Функции присутствуют" || echo "❌ Функции отсутствуют"
```

### Критерии успешного тестирования

- ✅ В development режиме логи содержат пометку `[DEV MODE]`
- ✅ В development режиме логи содержат информацию о порте, окружении, FRONTEND_URL
- ✅ В production режиме логи содержат только минимальную информацию: `🚀 Server started on port ${PORT} [production]`
- ✅ В production режиме НЕ логируются:
  - `FRONTEND_URL`
  - `JWT_SECRET` или другие секреты
  - Другие переменные окружения
- ✅ Файл `backend/src/utils/env.ts` существует и экспортирует `isProd` и `getLogLevel`
- ✅ README.md содержит раздел "🧾 Logging Policy"

### Проверки безопасности
- ✅ Секреты никогда не попадают в логи production
- ✅ Внутренние URL не логируются в production

---

## 7. 🔐 sandbox/jwt-hardening

### Что исправляет
- Реализует refresh tokens с долгим сроком жизни
- Добавляет JTI (JWT ID) для каждого токена
- Добавляет fingerprint (IP + User Agent) для привязки токенов к устройству
- Реализует blacklist для аннулирования токенов
- Добавляет поддержку ротации секретов (`JWT_SECRET_ROTATED`)
- Обновляет все endpoints для работы с новой системой токенов

### Изменённые файлы
- `backend/src/utils/jwt.ts` (новая архитектура токенов)
- `backend/src/services/tokenService.ts` (новый файл для управления токенами)
- `backend/src/middleware/auth.ts` (обновлён для работы с JTI и blacklist)
- `backend/src/routes/auth.ts` (добавлен endpoint `/refresh`, обновлён `/logout`)
- `backend/src/controllers/authController.ts` (обновлён для новой системы)
- `env.example` (новые переменные: `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_SECRET_ROTATED`, `FP_SALT`)
- `README.md` (раздел "🔐 JWT Security")

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/jwt-hardening

# 2. Убедиться, что Redis запущен
redis-cli ping || echo "⚠️  Redis не запущен, но тесты могут работать с моками"

# 3. Запустить backend
cd backend
npm run dev &
BACKEND_PID=$!
sleep 5

# 4. Тест авторизации через Telegram (получение access + refresh токенов)
curl -X POST http://localhost:3001/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData": "test_init_data"}' 2>&1 | jq '.' || curl -X POST http://localhost:3001/api/auth/telegram \
  -H "Content-Type: application/json" \
  -d '{"initData": "test_init_data"}'

# 5. Тест refresh токена
# Сохранить refreshToken из предыдущего ответа
REFRESH_TOKEN="your_refresh_token_here"
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" 2>&1 | jq '.'

# 6. Тест использования access token
ACCESS_TOKEN="your_access_token_here"
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3001/api/auth/verify 2>&1 | jq '.'

# 7. Тест logout (аннулирование токенов)
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" 2>&1 | jq '.'

# 8. Тест использования аннулированного токена (должен вернуть ошибку)
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:3001/api/auth/verify 2>&1 | jq '.'
# Должно быть: {"success": false, "error": "Token revoked"}

# 9. Проверить Redis (если доступен)
redis-cli KEYS "refresh:*" | head -5
redis-cli KEYS "jwt:blacklist:*" | head -5

# 10. Тест fingerprint защиты (попытка использовать refresh token с другого IP)
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -H "User-Agent: Different Browser" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" 2>&1 | jq '.'
# Должно быть отклонено из-за несовпадения fingerprint

kill $BACKEND_PID
```

### Критерии успешного тестирования

- ✅ Авторизация возвращает `accessToken` и `refreshToken`
- ✅ Access token имеет короткий срок жизни (15 минут по умолчанию)
- ✅ Refresh token имеет долгий срок жизни (30 дней по умолчанию)
- ✅ Endpoint `/api/auth/refresh` успешно обновляет access token
- ✅ Endpoint `/api/auth/logout` аннулирует токены (добавляет в blacklist)
- ✅ Аннулированные токены не проходят верификацию
- ✅ Refresh token хранится в Redis с fingerprint
- ✅ Попытка использовать refresh token с другого устройства (другой IP/UA) отклоняется
- ✅ JTI присутствует в токенах (можно проверить через jwt.io)
- ✅ Issuer и audience проверяются при верификации
- ✅ Ротация секретов работает (старые токены с основным секретом работают, новые с rotated)

### Проверки безопасности
- ✅ Токены содержат JTI для отслеживания
- ✅ Fingerprint предотвращает использование украденного refresh token
- ✅ Blacklist работает корректно
- ✅ Секреты не логируются

---

## 8. 🛡️ sandbox/fix-telegram-ssrf

### Что исправляет
- Выносит базовый URL Telegram API в переменную окружения `TELEGRAM_API_BASE_URL`
- Создаёт централизованный клиент `telegramClient` для всех Telegram API вызовов
- Добавляет валидацию webhook URL для предотвращения SSRF
- Реализует whitelist хостов для webhook (только `FRONTEND_URL` или `TELEGRAM_ALLOWED_HOSTS`)
- Блокирует HTTP URLs и внутренние IP адреса

### Изменённые файлы
- `backend/src/services/telegramClient.ts` (новый файл - централизованный клиент)
- `backend/src/utils/webhookValidation.ts` (новый файл - валидация webhook)
- `backend/src/services/telegram.ts` (использует новый клиент и валидацию)
- `backend/src/utils/__tests__/webhookValidation.test.ts` (unit тесты)
- `backend/src/services/__tests__/telegramClient.test.ts` (интеграционные тесты)
- `env.example` (добавлены `TELEGRAM_API_BASE_URL`, `TELEGRAM_ALLOWED_HOSTS`)
- `README.md` (документация Telegram API и webhook)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/fix-telegram-ssrf

# 2. Запустить backend
cd backend
npm run dev &
BACKEND_PID=$!
sleep 5

# 3. Проверить, что telegramClient использует правильный baseURL
# (проверить через логи или тесты)

# 4. Тест валидного webhook URL
FRONTEND_URL=https://example.com node -e "
const { isAllowedWebhookUrl } = require('./dist/utils/webhookValidation');
const result = isAllowedWebhookUrl('https://example.com/webhook');
console.log(result.valid ? '✅ Валидный URL принят' : '❌ Валидный URL отклонён');
"

# 5. Тест отклонения HTTP URL
node -e "
const { isAllowedWebhookUrl } = require('./dist/utils/webhookValidation');
const result = isAllowedWebhookUrl('http://example.com/webhook');
console.log(result.valid ? '❌ HTTP URL принят (не должно быть!)' : '✅ HTTP URL отклонён');
"

# 6. Тест отклонения чужого домена
FRONTEND_URL=https://example.com node -e "
const { isAllowedWebhookUrl } = require('./dist/utils/webhookValidation');
const result = isAllowedWebhookUrl('https://evil.com/webhook');
console.log(result.valid ? '❌ Чужой домен принят (не должно быть!)' : '✅ Чужой домен отклонён');
"

# 7. Тест production режима (требует настройки)
NODE_ENV=production FRONTEND_URL= node -e "
const { isAllowedWebhookUrl } = require('./dist/utils/webhookValidation');
const result = isAllowedWebhookUrl('https://example.com/webhook');
console.log(result.valid ? '❌ URL принят без настройки (не должно быть!)' : '✅ URL отклонён без настройки');
"

# 8. Запустить unit тесты (если настроены)
npm test -- webhookValidation.test.ts 2>&1 | tail -20

# 9. Проверить, что все вызовы используют telegramClient
grep -r "api.telegram.org" src/ --exclude-dir=__tests__ && echo "❌ Найдены прямые вызовы" || echo "✅ Все вызовы через telegramClient"

kill $BACKEND_PID
```

### Критерии успешного тестирования

- ✅ Все прямые вызовы `axios.post('https://api.telegram.org/...')` заменены на `telegramClient.post('/...')`
- ✅ `telegramClient` использует `TELEGRAM_API_BASE_URL` из переменных окружения
- ✅ Валидация webhook URL принимает только HTTPS URLs
- ✅ Валидация webhook URL принимает только хосты из whitelist (`FRONTEND_URL` или `TELEGRAM_ALLOWED_HOSTS`)
- ✅ HTTP URLs отклоняются с понятным сообщением
- ✅ Чужие домены отклоняются с понятным сообщением
- ✅ В production режиме требуется явная настройка whitelist
- ✅ Все попытки установки webhook логируются
- ✅ Unit тесты проходят успешно
- ✅ Нет прямых вызовов `api.telegram.org` в коде (кроме тестов)

### Проверки безопасности
- ✅ SSRF защита работает: нельзя установить webhook на произвольный URL
- ✅ Внутренние IP адреса блокируются
- ✅ Логирование всех попыток установки webhook

---

## 9. 🎨 sandbox/fix-frontend-security

### Что исправляет
- Удаляет inline `onclick` обработчики (XSS риск)
- Выносит Telegram bot username в переменную окружения `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- Добавляет валидацию внешних изображений через `safeImage()` и `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS`
- Создаёт утилиту `frontend/src/utils/safeImage.ts` для безопасной работы с изображениями

### Изменённые файлы
- `frontend/src/utils/safeImage.ts` (новый файл)
- `frontend/src/app/page.tsx` (удалены inline onclick, добавлен React компонент)
- `frontend/src/components/SubscriptionModal.tsx` (использует `getTelegramBotUrl()`)
- `frontend/src/screens/HistoryScreen.tsx` (использует `safeImage()`)
- `frontend/src/screens/OneCardScreen.tsx` (использует `safeImage()`)
- `frontend/src/screens/ThreeCardsScreen.tsx` (использует `safeImage()`)
- `frontend/src/screens/YesNoScreen.tsx` (использует `safeImage()`)
- `env.example` (добавлены `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS`)
- `README.md` (документация frontend security)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/fix-frontend-security

# 2. Проверить компиляцию frontend
cd frontend
npm run build 2>&1 | tail -20

# 3. Проверить, что нет inline onclick в коде
grep -r "onclick=" src/ && echo "❌ Найдены inline onclick" || echo "✅ Нет inline onclick"

# 4. Проверить, что нет хардкода Telegram username
grep -r "tarolog_app_bot\|your_bot_username" src/ --exclude="*.test.*" && echo "❌ Найден хардкод username" || echo "✅ Нет хардкода username"

# 5. Проверить использование safeImage
grep -r "safeImage(" src/screens/ | wc -l
# Должно быть несколько использований

# 6. Запустить frontend
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=test_bot \
NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS=images.unsplash.com,cdn.jsdelivr.net \
npm run dev &
FRONTEND_PID=$!
sleep 8

# 7. Проверить, что frontend загружается
curl -s http://localhost:3000 | head -20

# 8. Проверить в браузере (вручную):
# - Нет inline onclick в HTML (через DevTools)
# - Все ссылки на Telegram используют правильный username
# - Изображения загружаются корректно
# - Нет ошибок CSP в консоли

# 9. Проверить fallback изображение
ls frontend/public/fallback.jpg && echo "✅ Fallback изображение существует" || echo "⚠️  Fallback изображение отсутствует"

kill $FRONTEND_PID
```

### Критерии успешного тестирования

- ✅ Frontend успешно компилируется без ошибок
- ✅ Нет inline `onclick` обработчиков в коде
- ✅ Нет хардкода Telegram bot username в коде
- ✅ Все ссылки на Telegram используют `getTelegramBotUrl()` с переменной окружения
- ✅ Все внешние изображения обёрнуты через `safeImage()`
- ✅ `safeImage()` валидирует хосты против `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS`
- ✅ При неразрешённом хосте используется fallback изображение
- ✅ Frontend загружается без ошибок CSP в консоли браузера
- ✅ В production выводится предупреждение, если `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` не задан

### Проверки безопасности
- ✅ Нет inline JavaScript (проверить через DevTools)
- ✅ CSP не нарушается
- ✅ Внешние изображения контролируются через whitelist

---

## 10. 💳 sandbox/yookassa-config

### Что исправляет
- Выносит базовый URL YooKassa API в переменную окружения `YOOKASSA_API_URL`
- Выносит цены подписок в переменные окружения (`SUBSCRIPTION_PRICE_*`)
- Выносит длительности подписок в переменные окружения (`SUBSCRIPTION_DURATION_*`)
- Добавляет валидацию цен и длительностей с fallback на значения по умолчанию
- Добавляет проверку цены перед созданием платежа (цена должна быть > 0)

### Изменённые файлы
- `backend/src/services/yookassa.ts` (динамические планы, валидация)
- `backend/src/routes/subscription.ts` (использует динамические планы)
- `env.example` (добавлены переменные YooKassa и подписок)
- `README.md` (раздел "💳 YooKassa Payments Configuration")
- `backend/test-yookassa-config.js` (тестовый скрипт)

### Команды для тестирования

```bash
# 1. Переключиться на ветку
git checkout sandbox/yookassa-config

# 2. Запустить тестовый скрипт с дефолтными значениями
cd backend
npm run build
NODE_ENV=development node test-yookassa-config.js 2>&1

# 3. Запустить тестовый скрипт с переопределёнными ценами
SUBSCRIPTION_PRICE_WEEKLY=149.00 \
SUBSCRIPTION_PRICE_MONTHLY=399.00 \
NODE_ENV=development \
node test-yookassa-config.js 2>&1

# 4. Запустить backend
npm run dev &
BACKEND_PID=$!
sleep 5

# 5. Проверить endpoint /api/subscription/plans
curl -s http://localhost:3001/api/subscription/plans | jq '.' || curl -s http://localhost:3001/api/subscription/plans

# 6. Проверить, что цены загружаются из env
# Изменить цены в .env и перезапустить backend
SUBSCRIPTION_PRICE_WEEKLY=199.00 npm run dev &
sleep 5
curl -s http://localhost:3001/api/subscription/plans | grep "199.00" && echo "✅ Цены из env" || echo "❌ Цены не из env"

# 7. Тест валидации цены (попытка создать платеж с невалидной ценой)
# Это должно быть обработано в коде

# 8. Проверить, что YOOKASSA_API_URL используется
grep -r "api.yookassa.ru/v3" src/services/yookassa.ts && echo "❌ Хардкод найден" || echo "✅ Хардкод удалён"

kill $BACKEND_PID
```

### Критерии успешного тестирования

- ✅ `YOOKASSA_API_URL` используется вместо хардкода
- ✅ Цены подписок загружаются из переменных окружения
- ✅ Длительности подписок загружаются из переменных окружения
- ✅ Endpoint `/api/subscription/plans` возвращает актуальные цены из env
- ✅ При невалидных значениях используются значения по умолчанию
- ✅ При невалидных значениях логируется предупреждение
- ✅ Перед созданием платежа проверяется, что цена > 0
- ✅ Тестовый скрипт `test-yookassa-config.js` работает корректно
- ✅ Валидация цен работает (число > 0, формат до 2 знаков)
- ✅ Валидация длительностей работает (целое число > 0)

### Проверки безопасности
- ✅ Секреты YooKassa не логируются
- ✅ В production выводится предупреждение, если `YOOKASSA_API_URL` не задан

---

## 🔄 Интеграционное тестирование (все ветки вместе)

После тестирования каждой ветки по отдельности рекомендуется протестировать их вместе:

### Команды для интеграционного тестирования

```bash
# 1. Создать тестовую ветку со всеми изменениями
git checkout main
git checkout -b test/integration-all-fixes

# 2. Последовательно слить все ветки
git merge sandbox/cleanup-structure
git merge sandbox/env-unification
git merge sandbox/secure-helmet-config
git merge sandbox/fix-cors-config
git merge sandbox/fix-health-endpoint-security
git merge sandbox/logging-sanitization
git merge sandbox/jwt-hardening
git merge sandbox/fix-telegram-ssrf
git merge sandbox/fix-frontend-security
git merge sandbox/yookassa-config

# 3. Проверить компиляцию
cd backend && npm run build
cd ../frontend && npm run build

# 4. Запустить тестовое окружение
cd ..
npm run dev:test

# 5. Выполнить все проверки из каждой ветки
```

### Критерии успешного интеграционного тестирования

- ✅ Все сервисы компилируются без ошибок
- ✅ Backend запускается без ошибок
- ✅ Frontend запускается без ошибок
- ✅ Все API endpoints работают корректно
- ✅ Все проверки безопасности проходят
- ✅ Нет конфликтов между изменениями из разных веток

---

## 📝 Общие рекомендации по тестированию

### Перед началом тестирования

1. **Создать резервную копию:**
   ```bash
   git branch backup-before-testing-$(date +%Y%m%d)
   ```

2. **Убедиться, что зависимости установлены:**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Проверить наличие необходимых сервисов:**
   - MongoDB (для backend)
   - Redis (для JWT blacklist и refresh tokens)
   - Node.js >= 20.0.0

### Порядок выполнения тестов

1. Для каждой ветки:
   - Переключиться на ветку
   - Выполнить команды тестирования
   - Проверить критерии успешного тестирования
   - Задокументировать результаты

2. После тестирования всех веток:
   - Выполнить интеграционное тестирование
   - Проверить совместимость изменений
   - Подготовить отчёт о результатах

### Шаблон отчёта о тестировании

Для каждой ветки рекомендуется создать отчёт:

```markdown
## Ветка: sandbox/xxx

**Дата тестирования:** YYYY-MM-DD
**Тестировщик:** [имя]

### Результаты:
- ✅ Компиляция: PASSED/FAILED
- ✅ Функциональность: PASSED/FAILED
- ✅ Безопасность: PASSED/FAILED
- ✅ Документация: PASSED/FAILED

### Найденные проблемы:
- [описание проблемы]

### Рекомендации:
- [рекомендации по слиянию]
```

---

## 🚨 Критические проверки перед слиянием

Перед слиянием любой ветки в `main` необходимо убедиться:

1. ✅ Все тесты проходят
2. ✅ Код компилируется без ошибок
3. ✅ Нет утечки секретов в коде или логах
4. ✅ Документация обновлена
5. ✅ `env.example` содержит все новые переменные
6. ✅ Обратная совместимость сохранена (где возможно)
7. ✅ Нет конфликтов с `main` веткой

---

**Дата создания плана:** 2025-11-09  
**Версия:** 1.0  
**Статус:** Готов к использованию

