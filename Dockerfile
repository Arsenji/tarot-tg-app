# Backend Dockerfile для Tarot Telegram App
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
RUN npm ci

# Принудительно устанавливаем типы Node.js
RUN npm install --save-dev @types/node

# Копируем исходный код
COPY . .

# Отладка: проверяем что скопировалось
RUN echo "=== Структура /app ===" && ls -la /app/
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

# Команда запуска (используем корневой index.js)
WORKDIR /app
CMD ["node", "index.js"]
