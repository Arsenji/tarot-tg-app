# Backend Dockerfile для Tarot Telegram App
FROM node:20-alpine

# ВАЖНО: собираем и запускаем приложение НЕ в /app.
# Некоторые хостинги (например BotHost) монтируют исходники проекта поверх /app
# в рантайме, что затирает собранный dist/ и node_modules из образа.
# Поэтому используем отдельный каталог /srv/bot, который не перекрывается монтированием.
WORKDIR /srv/bot

# Копируем package.json и package-lock.json из backend (если есть)
COPY backend/package*.json ./

# Устанавливаем зависимости (включая dev для сборки)
# Используем npm install, если package-lock.json отсутствует
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Принудительно устанавливаем типы Node.js
RUN npm install --save-dev @types/node

# Копируем tsconfig.json для сборки
COPY backend/tsconfig.json ./

# Копируем исходный код backend
COPY backend/src ./src

# Собираем TypeScript проект
RUN npm run build

# Проверяем что сборка прошла успешно
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found after build!" && ls -la dist/ && exit 1)

# Отладка: проверяем что скопировалось
RUN echo "=== Структура /srv/bot ===" && ls -la /srv/bot/
RUN echo "=== Содержимое /srv/bot/dist/ ===" && ls -la /srv/bot/dist/ || echo "dist not found"
RUN echo "=== Проверка /srv/bot/dist/index.js ===" && ls -la /srv/bot/dist/index.js || echo "index.js not found"

# Удаляем dev-зависимости для оптимизации размера образа
RUN npm prune --production

# Проверяем что dist/index.js все еще существует после prune
RUN test -f dist/index.js || (echo "ERROR: dist/index.js was deleted!" && exit 1)

# Создаём пользователя для безопасности
RUN addgroup -g 1001 -S nodejs
RUN adduser -S backend -u 1001

# Меняем владельца файлов
RUN chown -R backend:nodejs /srv/bot
USER backend

# Открываем порт
EXPOSE 3001

# Команда запуска (абсолютный путь, чтобы не зависеть от рабочей директории рантайма)
WORKDIR /srv/bot
CMD ["node", "/srv/bot/dist/index.js"]
