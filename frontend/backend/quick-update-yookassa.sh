#!/bin/bash

echo "🔧 Быстрое обновление настроек Юкассы"
echo "====================================="

# Проверяем аргументы
if [ $# -ne 2 ]; then
    echo "Использование: $0 <SHOP_ID> <SECRET_KEY>"
    echo "Пример: $0 123456 test_secret_key_123"
    exit 1
fi

SHOP_ID=$1
SECRET_KEY=$2

# Создаем резервную копию
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "📁 Создана резервная копия"

# Обновляем настройки
sed -i '' "s/YOOKASSA_SHOP_ID=.*/YOOKASSA_SHOP_ID=$SHOP_ID/" .env
sed -i '' "s/YOOKASSA_SECRET_KEY=.*/YOOKASSA_SECRET_KEY=$SECRET_KEY/" .env

echo "✅ Настройки обновлены"
echo ""
echo "📋 Новые настройки:"
grep -E "YOOKASSA" .env

echo ""
echo "🔄 Перезапустите бэкенд:"
echo "   pkill -f 'ts-node src/index.ts' && npm run dev"
