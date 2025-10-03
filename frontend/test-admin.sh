#!/bin/bash

echo "🧪 Тестирование админки"
echo "========================"

# Проверяем, что PostgreSQL запущен
echo "1. Проверка PostgreSQL..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "❌ PostgreSQL не запущен. Запустите: brew services start postgresql"
    exit 1
fi
echo "✅ PostgreSQL запущен"

# Создаем базу данных если не существует
echo "2. Создание базы данных..."
createdb tarot_admin 2>/dev/null || echo "База данных уже существует"
echo "✅ База данных готова"

# Запускаем backend
echo "3. Запуск admin-backend..."
cd admin-backend
npm run dev &
BACKEND_PID=$!
sleep 5

# Проверяем health endpoint
echo "4. Проверка backend..."
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✅ Backend запущен на порту 3002"
else
    echo "❌ Backend не отвечает"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Отправляем тестовое сообщение
echo "5. Отправка тестового сообщения..."
RESPONSE=$(curl -s -X POST http://localhost:3002/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "text": "Тестовое сообщение для проверки админки"
  }')

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Сообщение успешно создано"
    echo "📨 Ответ: $RESPONSE"
else
    echo "❌ Ошибка создания сообщения: $RESPONSE"
fi

# Проверяем получение сообщений
echo "6. Проверка получения сообщений..."
MESSAGES=$(curl -s http://localhost:3002/api/messages \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | \
    grep -o '"token":"[^"]*"' | cut -d'"' -f4)")

if echo "$MESSAGES" | grep -q "test_user_123"; then
    echo "✅ Сообщения успешно получены"
    echo "📋 Сообщения: $MESSAGES"
else
    echo "❌ Ошибка получения сообщений: $MESSAGES"
fi

echo ""
echo "🎉 Тестирование завершено!"
echo "📱 Теперь запустите frontend: cd admin-frontend && npm start"
echo "🔗 Откройте http://localhost:3000 и войдите как admin/admin123"

# Останавливаем backend
echo "7. Остановка backend..."
kill $BACKEND_PID 2>/dev/null
echo "✅ Backend остановлен"
