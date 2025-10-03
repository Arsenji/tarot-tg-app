#!/bin/bash

echo "🔧 Обновление настроек Юкассы"
echo "=============================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем, что файл .env существует
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Файл .env не найден${NC}"
    exit 1
fi

echo "📋 Текущие настройки:"
grep -E "YOOKASSA" .env

echo ""
echo "🔑 Введите реальные данные Юкассы:"
echo -n "Shop ID: "
read -r SHOP_ID

echo -n "Secret Key: "
read -r SECRET_KEY

# Проверяем, что данные не пустые
if [ -z "$SHOP_ID" ] || [ -z "$SECRET_KEY" ]; then
    echo -e "${RED}❌ Shop ID и Secret Key не могут быть пустыми${NC}"
    exit 1
fi

# Создаем резервную копию
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${YELLOW}📁 Создана резервная копия: .env.backup.$(date +%Y%m%d_%H%M%S)${NC}"

# Обновляем настройки
sed -i '' "s/YOOKASSA_SHOP_ID=.*/YOOKASSA_SHOP_ID=$SHOP_ID/" .env
sed -i '' "s/YOOKASSA_SECRET_KEY=.*/YOOKASSA_SECRET_KEY=$SECRET_KEY/" .env

echo -e "${GREEN}✅ Настройки обновлены${NC}"

echo ""
echo "📋 Новые настройки:"
grep -E "YOOKASSA" .env

echo ""
echo "🔄 Перезапустите бэкенд для применения изменений:"
echo "   pkill -f 'ts-node src/index.ts' && npm run dev"
