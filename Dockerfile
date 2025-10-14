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
CMD ["node", "dist/index.js"]
