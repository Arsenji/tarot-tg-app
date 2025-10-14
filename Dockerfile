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

# Отладка: проверяем что скопировалось
RUN echo "=== Структура /app ===" && ls -la /app/
RUN echo "=== Структура /app/backend ===" && ls -la /app/backend/ || echo "backend not found"
RUN echo "=== Структура /app/backend/dist ===" && ls -la /app/backend/dist/ || echo "backend/dist not found"

# Backend уже скомпилирован в dist/, пропускаем сборку
# RUN npm run build

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

# Команда запуска (используем скомпилированные файлы из dist)
WORKDIR /app/backend

# Отладка: проверяем файлы перед запуском
RUN echo "=== Проверка dist/index.js ===" && ls -la dist/index.js || echo "index.js not found"
RUN echo "=== Текущая директория ===" && pwd
RUN echo "=== Содержимое dist/ ===" && ls -la dist/ || echo "dist not found"

CMD ["node", "dist/index.js"]
