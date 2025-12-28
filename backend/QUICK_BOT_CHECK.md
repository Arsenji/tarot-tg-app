# 🔍 Быстрая проверка: Почему бот не отвечает?

## Шаг 1: Проверьте логи бэкенда

После запуска бэкенда ищите в логах:

### ✅ Если бот запущен:
```
Bot startup - checking environment
Bot instance created
Bot handlers initialized
Bot commands registered successfully
🤖 Telegram Bot started in getUpdates mode
Bot is active and responding
```

### ❌ Если бот НЕ запущен:
```
TELEGRAM_BOT_TOKEN is not set in environment variables
```
**Решение:** Установите `TELEGRAM_BOT_TOKEN` в переменных окружения

```
Telegram Bot is disabled via DISABLE_TELEGRAM_BOT
```
**Решение:** Убедитесь, что `DISABLE_TELEGRAM_BOT` не установлен в `true`

```
Failed to start bot
```
**Решение:** Проверьте полную ошибку в логах

## Шаг 2: Проверьте переменные окружения

На Render.com или в вашем `.env` файле должны быть:

```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
# НЕ устанавливайте DISABLE_TELEGRAM_BOT или установите в false
```

## Шаг 3: Проверьте режим работы бота

### Режим Long Polling (рекомендуется для Render.com):
```env
# Не устанавливайте TELEGRAM_USE_WEBHOOK или установите в false
TELEGRAM_USE_WEBHOOK=false
```

### Режим Webhook (требует HTTPS):
```env
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

## Шаг 4: Проверьте бота в Telegram

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Если бот не отвечает — проверьте логи

## Шаг 5: Проверьте токен бота

Выполните в терминале:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

Должен вернуться JSON с информацией о боте.

## 🚨 Частые проблемы:

1. **Бот не запускается** → Проверьте `TELEGRAM_BOT_TOKEN`
2. **Бот запущен, но не отвечает** → Проверьте логи на ошибки обработки
3. **Webhook не работает** → Убедитесь, что URL доступен и использует HTTPS
4. **Ошибка 409 Conflict** → Другой экземпляр бота использует тот же токен

## 📞 Что делать дальше?

1. Проверьте логи бэкенда при запуске
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что бот не отключен через `DISABLE_TELEGRAM_BOT`
4. Если используете webhook — убедитесь, что endpoint доступен

