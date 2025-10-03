#!/bin/bash

echo "🔄 Исправляем токены во всех файлах фронтенда..."

# Новый токен для Telegram ID 399476674
NEW_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVDJ9.eyJ1c2VySWQiOiI2OGNkYjFiNTViNzRiOWJiMTFlODUyNjMiLCJ0ZWxlZ3JhbUlkIjozOTk0NzY2NzQsImlhdCI6MTc1OTM5Mjc0NCwiZXhwIjoxNzkwOTI4NzQ0fQ.GFUO5jXuv57c0v06sg_fPmtMbCtKqs8GXqbqd2-7S9Q"

# Находим все файлы с токенами и заменяем их
find frontend/src/ -name "*.tsx" -o -name "*.ts" | while read file; do
    if grep -q "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVDJ9" "$file"; then
        echo "Обновляем токен в: $file"
        sed -i '' 's/Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\..*/Bearer '"$NEW_TOKEN"'/g' "$file"
    fi
done

echo "✅ Токены обновлены!"
