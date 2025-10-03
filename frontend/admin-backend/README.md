# Admin Backend

Backend для админ-панели управления сообщениями пользователей Tarot Telegram App.

## Технологии

- **Node.js** + **Express.js** - веб-сервер
- **TypeScript** - типизация
- **PostgreSQL** - база данных
- **JWT** - аутентификация
- **Telegram Bot API** - интеграция с Telegram

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте `env.example` в `.env` и настройте переменные:

```bash
cp env.example .env
```

Настройте следующие переменные:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/tarot_admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
ADMIN_TELEGRAM_ID=your-telegram-user-id

# Server
PORT=3002
NODE_ENV=development
```

### 3. Настройка PostgreSQL

Создайте базу данных:

```sql
CREATE DATABASE tarot_admin;
```

Таблицы создаются автоматически при запуске приложения.

### 4. Запуск

Для разработки:
```bash
npm run dev
```

Для продакшена:
```bash
npm run build
npm start
```

## API Endpoints

### Аутентификация

- `POST /api/auth/login` - авторизация
- `GET /api/auth/verify` - проверка токена

### Сообщения

- `GET /api/messages` - получить все сообщения (с фильтрацией)
- `GET /api/messages/:id` - получить сообщение по ID
- `POST /api/messages` - создать новое сообщение
- `PUT /api/messages/:id/status` - обновить статус сообщения
- `POST /api/messages/:id/reply` - ответить на сообщение
- `DELETE /api/messages/:id` - удалить сообщение

### Фильтрация сообщений

Параметры запроса для `GET /api/messages`:

- `status` - статус сообщения (new, in_progress, resolved)
- `userId` - ID пользователя
- `startDate` - дата от (YYYY-MM-DD)
- `endDate` - дата до (YYYY-MM-DD)

## Структура проекта

```
src/
├── controllers/     # Контроллеры
├── routes/         # Маршруты
├── middleware/     # Middleware
├── services/       # Сервисы (Telegram)
├── types/          # TypeScript типы
├── utils/          # Утилиты (база данных)
└── index.ts        # Точка входа
```

## Интеграция с Telegram

При создании нового сообщения, админ получает уведомление в Telegram.
При отправке ответа, сообщение доставляется пользователю в Telegram.

## Безопасность

- JWT токены для аутентификации
- Helmet для безопасности заголовков
- CORS настроен для фронтенда
- Валидация входных данных
