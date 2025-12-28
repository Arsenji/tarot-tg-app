# 🔍 Проверка статуса Telegram бота

## Быстрая диагностика

### 1. Проверьте логи бэкенда при запуске

Ищите следующие сообщения:

**✅ Бот запущен успешно:**
```
Bot startup - checking environment
Bot instance created
Bot handlers initialized
Bot commands registered successfully
🤖 Telegram Bot started in getUpdates mode
```
или
```
🤖 Telegram Bot started in webhook mode
```

**❌ Бот НЕ запущен:**
```
TELEGRAM_BOT_TOKEN is not set in environment variables
Telegram Bot is disabled via DISABLE_TELEGRAM_BOT
Failed to start bot
```

### 2. Проверьте переменные окружения

Убедитесь, что в `.env` или переменных окружения на сервере установлены:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
DISABLE_TELEGRAM_BOT=false  # или не устанавливайте эту переменную
```

Если используете webhook:
```env
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

### 3. Проверьте статус бота через API

Выполните запрос к Telegram API:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

Должен вернуться JSON с информацией о боте:
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "TaroAI",
    "username": "your_bot_username"
  }
}
```

### 4. Проверьте webhook (если используется)

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Должен показать информацию о webhook, если он установлен.

### 5. Проверьте, что endpoint доступен

Если используете webhook, проверьте, что endpoint доступен:

```bash
curl -X POST https://your-domain.com/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"update_id": 1, "message": {"message_id": 1, "from": {"id": 123}, "chat": {"id": 123}, "text": "/start"}}'
```

## Типичные проблемы

### Проблема 1: Бот не запускается

**Причины:**
- Нет токена `TELEGRAM_BOT_TOKEN`
- Бот отключен через `DISABLE_TELEGRAM_BOT=true`
- Ошибка подключения к Telegram API

**Решение:**
1. Проверьте переменные окружения
2. Проверьте логи на наличие ошибок
3. Убедитесь, что сервер имеет доступ к интернету

### Проблема 2: Бот запущен, но не отвечает

**Причины:**
- Webhook не настроен правильно
- Endpoint для webhook не работает
- Бот работает в режиме long polling, но есть конфликт

**Решение:**
1. Проверьте логи - должен быть один из режимов:
   - `Bot started in webhook mode` - нужен endpoint
   - `Bot started in getUpdates mode` - должен работать автоматически
2. Если webhook - проверьте, что URL доступен и endpoint работает
3. Если long polling - убедитесь, что нет конфликта (ошибка 409)

### Проблема 3: Бот отвечает с задержкой

**Причины:**
- Webhook не получает обновления
- Проблемы с сетью
- Высокая нагрузка на сервер

**Решение:**
1. Проверьте логи webhook endpoint
2. Проверьте статус webhook через API
3. Рассмотрите переход на long polling для тестирования

## Команды для диагностики

### Проверка информации о боте
```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Проверка webhook
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### Удаление webhook (для перехода на long polling)
```bash
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

### Установка webhook
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://your-domain.com/api/telegram/webhook"
```

## Что делать, если бот не отвечает

1. **Проверьте логи бэкенда** - ищите сообщения о боте
2. **Проверьте переменные окружения** - убедитесь, что токен установлен
3. **Проверьте статус бота через API** - используйте `getMe`
4. **Проверьте webhook** - если используется, убедитесь, что он настроен правильно
5. **Перезапустите бэкенд** - иногда помогает перезапуск
6. **Проверьте, что бот не заблокирован** - убедитесь, что бот активен в Telegram

## Логи для проверки

При запуске бэкенда должны быть логи:
- `Bot startup - checking environment` - проверка переменных
- `Bot instance created` - создание экземпляра бота
- `Bot handlers initialized` - инициализация обработчиков
- `Bot started in ... mode` - запуск бота

При получении команды `/start` должны быть логи:
- `Received /start command` - получение команды
- `User created/updated in /start` - создание/обновление пользователя
- `Reply sent in /start with main menu` - отправка ответа

Если этих логов нет - бот не запущен или не получает обновления.

