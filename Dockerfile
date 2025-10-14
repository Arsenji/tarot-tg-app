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
RUN echo "=== Что в /app/backend/ ===" && find /app/backend -type f -name "*.js" | head -10
RUN echo "=== Поиск index.js ===" && find /app -name "index.js" -type f

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

# Команда запуска (используем скомпилированные файлы из backend/dist)
WORKDIR /app/backend

# Отладка: проверяем файлы перед запуском
RUN echo "=== Проверка backend/dist/index.js ===" && ls -la /app/backend/dist/index.js || echo "backend/dist/index.js not found"
RUN echo "=== Текущая директория ===" && pwd
RUN echo "=== Содержимое /app/backend/dist/ ===" && ls -la /app/backend/dist/ || echo "backend/dist not found"

CMD ["node", "dist/index.js"]
