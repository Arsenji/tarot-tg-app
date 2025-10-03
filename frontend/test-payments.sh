#!/bin/bash

echo "🧪 Тестирование системы платежей"
echo "================================"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для проверки статуса
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Проверяем, что бэкенд запущен
echo "🔍 Проверяем статус бэкенда..."
curl -s http://localhost:3001/api/health > /dev/null
check_status $? "Бэкенд запущен"

# Создаем тестового пользователя
echo "👤 Создаем тестового пользователя..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/telegram \
    -H "Content-Type: application/json" \
    -d '{"initData": "user=%7B%22id%22%3A777777777%2C%22first_name%22%3A%22Test%22%2C%22last_name%22%3A%22Payment%22%2C%22username%22%3A%22testpayment%22%7D&test_hash=test"}' | \
    jq -r '.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    check_status 0 "Пользователь создан"
    echo "🔑 Токен: ${TOKEN:0:20}..."
else
    check_status 1 "Ошибка создания пользователя"
    exit 1
fi

# Тестируем создание платежа
echo "💳 Тестируем создание платежа..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/payment/create-invoice \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"plan": "monthly"}')

if echo "$PAYMENT_RESPONSE" | jq -e '.invoice' > /dev/null; then
    check_status 0 "Платеж создан"
    INVOICE_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.invoice.id')
    echo "📄 ID счета: $INVOICE_ID"
else
    check_status 1 "Ошибка создания платежа"
    echo "Ответ: $PAYMENT_RESPONSE"
fi

# Тестируем успешный платеж
echo "✅ Тестируем успешный платеж..."
SUCCESS_RESPONSE=$(curl -s -X POST http://localhost:3001/api/payment/payment-success \
    -H "Content-Type: application/json" \
    -d '{"payload": "{\"userId\":\"'$(echo "$TOKEN" | jq -r '.userId' 2>/dev/null || echo "777777777")'\",\"plan\":\"monthly\",\"telegramId\":777777777}"}')

if echo "$SUCCESS_RESPONSE" | jq -e '.success' > /dev/null; then
    check_status 0 "Платеж обработан"
    EXPIRES_AT=$(echo "$SUCCESS_RESPONSE" | jq -r '.expiresAt')
    echo "📅 Действует до: $EXPIRES_AT"
else
    check_status 1 "Ошибка обработки платежа"
    echo "Ответ: $SUCCESS_RESPONSE"
fi

# Проверяем статус подписки
echo "🔍 Проверяем статус подписки..."
SUBSCRIPTION_RESPONSE=$(curl -s -X GET http://localhost:3001/api/tarot/subscription-status \
    -H "Authorization: Bearer $TOKEN")

if echo "$SUBSCRIPTION_RESPONSE" | jq -e '.subscriptionInfo.hasSubscription' > /dev/null; then
    HAS_SUBSCRIPTION=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.subscriptionInfo.hasSubscription')
    if [ "$HAS_SUBSCRIPTION" = "true" ]; then
        check_status 0 "Подписка активна"
    else
        check_status 1 "Подписка не активна"
    fi
else
    check_status 1 "Ошибка проверки подписки"
    echo "Ответ: $SUBSCRIPTION_RESPONSE"
fi

# Тестируем webhook
echo "🔗 Тестируем webhook Юкассы..."
WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:3001/api/yookassa/webhook \
    -H "Content-Type: application/json" \
    -d '{"type": "notification", "event": "payment.succeeded", "object": {"id": "test_payment_id", "status": "succeeded", "paid": true, "amount": {"value": "299.00", "currency": "RUB"}, "metadata": {"userId": "777777777", "planType": "monthly"}}}')

if echo "$WEBHOOK_RESPONSE" | jq -e '.success' > /dev/null; then
    check_status 0 "Webhook работает"
else
    check_status 1 "Ошибка webhook"
    echo "Ответ: $WEBHOOK_RESPONSE"
fi

echo ""
echo "🎉 Тестирование завершено!"
echo "================================"
