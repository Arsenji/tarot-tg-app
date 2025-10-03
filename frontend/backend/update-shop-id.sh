#!/bin/bash

echo "🔧 Обновление Shop ID Юкассы"
echo "============================"

SHOP_ID=$1

if [ -z "$SHOP_ID" ]; then
    echo "❌ Использование: $0 <SHOP_ID>"
    echo "📋 Пример: $0 1168307"
    exit 1
fi

echo "🔍 Текущие настройки:"
grep -E "YOOKASSA" .env

echo ""
echo "🔄 Обновляем Shop ID на: $SHOP_ID"

# Создаем резервную копию
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "📁 Создана резервная копия"

# Обновляем Shop ID
sed -i '' "s/YOOKASSA_SHOP_ID=.*/YOOKASSA_SHOP_ID=$SHOP_ID/" .env

echo "✅ Shop ID обновлен"
echo ""
echo "📋 Новые настройки:"
grep -E "YOOKASSA" .env

echo ""
echo "⚠️  Не забудьте обновить Secret Key вручную в файле .env"
echo "🔄 После обновления Secret Key перезапустите бэкенд:"
echo "   pkill -f 'ts-node src/index.ts' && npm run dev"
