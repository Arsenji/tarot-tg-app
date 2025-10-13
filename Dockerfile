# Backend Dockerfile для Tarot Telegram App
FROM node:20-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем TypeScript в JavaScript
RUN npm run build

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Меняем владельца файлов
RUN chown -R backend:nodejs /app
USER backend

# Открываем порт
EXPOSE 3001

# Команда запуска
CMD ["npm", "start"]
