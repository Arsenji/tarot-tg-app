#!/bin/bash

# Скрипт для безопасного запуска Tarot Telegram App в Docker

set -e

echo "🚀 Запуск Tarot Telegram App в Docker..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️  Файл .env не найден."
    if [ -f docker.env.secure ]; then
        echo "📝 Создаем .env из безопасного шаблона..."
        cp docker.env.secure .env
        echo "🔐 Пожалуйста, отредактируйте файл .env и добавьте ваши реальные токены и ключи"
        echo "📋 Обязательно замените все значения CHANGE_ME_* на реальные"
        echo "🚨 НЕ коммитьте .env файл в Git!"
        echo ""
        echo "После настройки запустите скрипт снова"
        exit 1
    else
        echo "❌ Файл docker.env.secure не найден. Создайте его из примера"
        exit 1
    fi
fi

# Проверяем наличие критических переменных
echo "🔍 Проверяем критические переменные окружения..."

# Функция для проверки переменной
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env | cut -d'=' -f2)
    
    if [ -z "$var_value" ] || [[ "$var_value" == *"CHANGE_ME"* ]] || [[ "$var_value" == *"YOUR_"* ]]; then
        echo "❌ ${var_name} не настроен или содержит placeholder значение"
        return 1
    else
        echo "✅ ${var_name} настроен"
        return 0
    fi
}

# Проверяем критические переменные
CRITICAL_VARS=(
    "MONGO_ROOT_PASSWORD"
    "REDIS_PASSWORD" 
    "JWT_SECRET"
    "ADMIN_JWT_SECRET"
    "ADMIN_PASSWORD"
    "TELEGRAM_BOT_TOKEN"
    "OPENAI_API_KEY"
)

MISSING_VARS=0
for var in "${CRITICAL_VARS[@]}"; do
    if ! check_env_var "$var"; then
        MISSING_VARS=$((MISSING_VARS + 1))
    fi
done

if [ $MISSING_VARS -gt 0 ]; then
    echo ""
    echo "🚨 Найдено $MISSING_VARS критических переменных, которые не настроены!"
    echo "📝 Пожалуйста, отредактируйте файл .env и настройте все переменные"
    echo "🔐 Особенно важно настроить пароли и секретные ключи"
    exit 1
fi

echo "✅ Все критические переменные настроены"

# Проверяем права доступа к .env файлу
if [ "$(stat -c %a .env 2>/dev/null || stat -f %A .env 2>/dev/null)" != "600" ]; then
    echo "🔒 Устанавливаем безопасные права доступа к .env файлу..."
    chmod 600 .env
fi

# Проверяем наличие Docker и Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Пожалуйста, установите Docker Compose"
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down

# Собираем образы
echo "🔨 Собираем Docker образы..."
docker-compose build

# Запускаем сервисы
echo "🚀 Запускаем сервисы..."
docker-compose up -d

# Ждем запуска сервисов
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус сервисов
echo "📊 Статус сервисов:"
docker-compose ps

# Проверяем здоровье сервисов
echo "🏥 Проверяем здоровье сервисов..."

# Backend
echo "🔍 Проверяем Backend API..."
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend API работает"
else
    echo "❌ Backend API не отвечает"
fi

# Frontend
echo "🔍 Проверяем Frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend работает"
else
    echo "❌ Frontend не отвечает"
fi

# Admin Backend
echo "🔍 Проверяем Admin Backend..."
if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ Admin Backend работает"
else
    echo "❌ Admin Backend не отвечает"
fi

# Admin Frontend
echo "🔍 Проверяем Admin Frontend..."
if curl -f http://localhost:3003 > /dev/null 2>&1; then
    echo "✅ Admin Frontend работает"
else
    echo "❌ Admin Frontend не отвечает"
fi

echo ""
echo "🎉 Tarot Telegram App запущен!"
echo ""
echo "📱 Сервисы доступны по адресам:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:3001"
echo "   • Admin Frontend: http://localhost:3003"
echo "   • Admin Backend: http://localhost:3002"
echo ""
echo "📊 Для просмотра логов используйте:"
echo "   docker-compose logs -f [service-name]"
echo ""
echo "🛑 Для остановки используйте:"
echo "   docker-compose down"
