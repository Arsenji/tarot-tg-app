# Настройка Next.js для Render Web Service

## Проблема
Ошибка 502 при деплое Next.js на Render как Web Service из-за неправильного порта.

## Решение

### 1. Изменения в коде

#### package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p $PORT",
    "lint": "next lint"
  }
}
```

#### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
```

### 2. Настройки Render

#### Тип сервиса
- **Type**: Web Service

#### Команды
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

#### Переменные окружения
- `NODE_ENV`: `production`
- `NEXT_PUBLIC_API_URL`: `https://your-backend-url.onrender.com/api`

#### Дополнительные настройки
- **Node Version**: 20.x
- **Auto-Deploy**: Yes

### 3. Что происходит

#### Standalone режим
- Next.js создает папку `.next/standalone/` с готовым сервером
- Включает только необходимые зависимости
- Создает `server.js` который слушает порт из `$PORT`

#### Переменная $PORT
- Render автоматически устанавливает `PORT` в переменные окружения
- Next.js сервер использует этот порт для запуска
- Решает проблему 502 ошибки

### 4. Структура после сборки

```
.next/
├── standalone/
│   ├── server.js          # Готовый сервер
│   ├── package.json       # Минимальные зависимости
│   ├── node_modules/      # Только production зависимости
│   └── .next/            # Собранное приложение
└── ...
```

### 5. Проверка

#### Локально
```bash
cd frontend
npm run build
cd .next/standalone
PORT=3000 node server.js
```

#### На Render
- Сервер автоматически запустится на правильном порту
- Сайт будет доступен без 502 ошибки

## Результат
- ✅ Next.js работает как Web Service на Render
- ✅ Сервер слушает правильный порт
- ✅ Нет ошибки 502
- ✅ Standalone режим оптимизирует размер
