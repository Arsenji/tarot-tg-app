# Frontend Dockerfile для Tarot Telegram App
FROM node:20-alpine AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Копируем package.json и устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранное приложение
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.js ./

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Меняем владельца файлов
RUN chown -R nextjs:nodejs /app
USER nextjs

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["npm", "start"]