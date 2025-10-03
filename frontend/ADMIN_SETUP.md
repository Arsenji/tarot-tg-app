# 🛠️ Настройка и тестирование админки

## 📋 Пошаговая инструкция

### 1. Подготовка окружения

```bash
# Установите PostgreSQL (если не установлен)
brew install postgresql
brew services start postgresql

# Создайте базу данных
createdb tarot_admin
```

### 2. Настройка переменных окружения

**admin-backend/.env:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tarot_admin
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=admin-super-secret-jwt-key-2024
JWT_EXPIRES_IN=24h

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Telegram Bot (замените на ваши данные)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ADMIN_TELEGRAM_ID=your-telegram-user-id

# Server
PORT=3002
NODE_ENV=development
```

**admin-frontend/.env:**
```env
REACT_APP_API_URL=http://localhost:3002
```

### 3. Запуск админки

```bash
# Терминал 1: Backend
cd admin-backend
npm run dev

# Терминал 2: Frontend
cd admin-frontend
npm start
```

### 4. Автоматическое тестирование

```bash
# Запустите тестовый скрипт
./test-admin.sh
```

### 5. Ручное тестирование

#### 5.1. Проверка авторизации
```bash
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### 5.2. Создание сообщения
```bash
curl -X POST http://localhost:3002/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "text": "Тестовое сообщение для проверки"
  }'
```

#### 5.3. Получение сообщений
```bash
# Сначала получите токен из шага 5.1
TOKEN="your-jwt-token-here"

curl -X GET http://localhost:3002/api/messages \
  -H "Authorization: Bearer $TOKEN"
```

#### 5.4. Ответ на сообщение
```bash
curl -X POST http://localhost:3002/api/messages/1/reply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"text": "Спасибо за ваше сообщение!"}'
```

### 6. Проверка через веб-интерфейс

1. Откройте http://localhost:3000
2. Войдите как `admin` / `admin123`
3. Создайте тестовое сообщение через API
4. Проверьте, что оно появилось в таблице
5. Откройте сообщение и отправьте ответ

### 7. Интеграция с Telegram

#### 7.1. Настройка бота
1. Создайте бота через @BotFather
2. Получите токен бота
3. Узнайте свой Telegram ID через @userinfobot
4. Обновите `.env` файл

#### 7.2. Тестирование уведомлений
```bash
# Создайте сообщение - админ получит уведомление в Telegram
curl -X POST http://localhost:3002/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123456789",
    "text": "Пользователь написал сообщение"
  }'
```

#### 7.3. Ответ через админку
1. Откройте сообщение в веб-интерфейсе
2. Напишите ответ
3. Нажмите "Отправить ответ"
4. Пользователь получит сообщение в Telegram

## 🔍 Отладка

### Проверка логов backend
```bash
cd admin-backend
npm run dev
# Смотрите логи в консоли
```

### Проверка базы данных
```bash
psql tarot_admin
\dt
SELECT * FROM messages;
```

### Проверка Telegram API
```bash
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

## 🚨 Возможные проблемы

1. **PostgreSQL не запущен**: `brew services start postgresql`
2. **Порт занят**: Измените PORT в `.env`
3. **CORS ошибки**: Проверьте FRONTEND_URL в backend
4. **Telegram не работает**: Проверьте токен и ID
5. **JWT ошибки**: Проверьте JWT_SECRET

## 📱 Готовые тестовые данные

- **Логин**: admin
- **Пароль**: admin123
- **Тестовый пользователь**: test_user_123
- **Backend URL**: http://localhost:3002
- **Frontend URL**: http://localhost:3000
