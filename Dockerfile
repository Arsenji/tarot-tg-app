# Backend Dockerfile для Tarot Telegram App
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем TypeScript в JavaScript
RUN echo "=== Запуск сборки TypeScript ===" && npm run build

# Отладка: проверяем что собралось
RUN echo "=== Структура /app после сборки ===" && ls -la /app/
RUN echo "=== Содержимое /app/dist/ ===" && ls -la /app/dist/ || echo "dist not found"
RUN echo "=== Проверка /app/dist/index.js ===" && ls -la /app/dist/index.js || echo "index.js not found"

# Удаляем dev-зависимости для оптимизации размера образа
RUN npm prune --production

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Меняем владельца файлов
RUN chown -R backend:nodejs /app
USER backend

# Открываем порт
EXPOSE 3001

# Команда запуска (используем скомпилированные файлы из корневой dist)
WORKDIR /app
CMD ["node", "dist/index.js"]
