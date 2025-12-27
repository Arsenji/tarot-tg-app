# 🔧 Диагностика проблем с Telegram ботом

## Почему бот не отвечает на команды?

### Возможные причины:

1. **Бот не запущен**
   - Нет токена `TELEGRAM_BOT_TOKEN` в переменных окружения
   - Бот отключен через `DISABLE_TELEGRAM_BOT=true`
   - Бот не смог подключиться к Telegram API

2. **Бот работает в режиме webhook, но webhook не настроен**
   - Установлен `TELEGRAM_USE_WEBHOOK=true`, но `TELEGRAM_WEBHOOK_URL` не указан или неверный
   - Webhook не может получить обновления от Telegram

3. **Конфликт с другим экземпляром бота**
   - Другой процесс использует тот же токен
   - Ошибка 409 Conflict

## 📋 Проверка статуса бота

### 1. Проверьте логи бэкенда

Ищите следующие сообщения в логах:

```
✅ Bot startup - checking environment
✅ Bot instance created
✅ Bot handlers initialized
✅ Bot commands registered successfully
✅ 🤖 Telegram Bot started in getUpdates mode
```

Или:

```
❌ TELEGRAM_BOT_TOKEN is not set in environment variables
❌ Telegram Bot is disabled via DISABLE_TELEGRAM_BOT
❌ Failed to start bot
```

### 2. Проверьте переменные окружения

Убедитесь, что в `.env` файле установлены:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
DISABLE_TELEGRAM_BOT=false  # или не устанавливайте эту переменную
```

Если используете webhook:

```env
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```

### 3. Проверьте, что бот запущен

Выполните команду в Telegram:

```
/start
```

Если бот не отвечает, проверьте логи.

## 🔍 Диагностика

### Проверка 1: Токен бота

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Проверьте, что токен совпадает с `TELEGRAM_BOT_TOKEN` в `.env`

### Проверка 2: Режим работы бота

**Режим getUpdates (long polling):**
- Бот должен работать, если `TELEGRAM_USE_WEBHOOK` не установлен или равен `false`
- Бот сам запрашивает обновления у Telegram

**Режим webhook:**
- Требуется `TELEGRAM_USE_WEBHOOK=true` и `TELEGRAM_WEBHOOK_URL`
- Telegram отправляет обновления на ваш сервер
- Нужен HTTPS сертификат

### Проверка 3: Логи бэкенда

Проверьте логи при запуске бэкенда:

```bash
# Если бот запущен локально
cd backend
npm run dev

# Ищите сообщения о боте
```

### Проверка 4: Тест подключения

Выполните запрос к Telegram API напрямую:

```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

Должен вернуться JSON с информацией о боте.

## 🛠️ Решение проблем

### Проблема: Бот не запускается

**Решение:**
1. Проверьте, что `TELEGRAM_BOT_TOKEN` установлен в `.env`
2. Убедитесь, что `DISABLE_TELEGRAM_BOT` не установлен в `true`
3. Проверьте логи на наличие ошибок

### Проблема: Бот запущен, но не отвечает

**Решение:**
1. Проверьте, что обработчики зарегистрированы (ищите "Bot handlers initialized" в логах)
2. Убедитесь, что бот работает в правильном режиме (getUpdates или webhook)
3. Проверьте, что нет конфликтов с другим экземпляром бота

### Проблема: Ошибка 409 Conflict

**Решение:**
1. Убедитесь, что только один экземпляр бота запущен
2. Удалите webhook: `curl https://api.telegram.org/bot<TOKEN>/deleteWebhook`
3. Перезапустите бота

### Проблема: Webhook не работает

**Решение:**
1. Проверьте, что `TELEGRAM_WEBHOOK_URL` доступен из интернета
2. Убедитесь, что URL использует HTTPS
3. Проверьте, что endpoint `/api/telegram/webhook` существует и обрабатывает POST запросы

## 📝 Команды для проверки

### Проверка информации о боте
```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```

### Проверка webhook
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### Удаление webhook
```bash
curl https://api.telegram.org/bot<TOKEN>/deleteWebhook
```

### Установка webhook
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://your-domain.com/api/telegram/webhook"
```

## 🎯 Быстрая проверка

1. **Проверьте токен:**
   ```bash
   grep TELEGRAM_BOT_TOKEN backend/.env
   ```

2. **Проверьте, не отключен ли бот:**
   ```bash
   grep DISABLE_TELEGRAM_BOT backend/.env
   ```

3. **Проверьте логи при запуске:**
   - Ищите сообщения о боте
   - Проверьте наличие ошибок

4. **Проверьте статус бота в Telegram:**
   - Отправьте `/start` боту
   - Если не отвечает - проблема в запуске или подключении

## 📞 Дополнительная помощь

Если проблема не решена:
1. Проверьте полные логи бэкенда
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что бот не заблокирован в Telegram
4. Убедитесь, что сервер имеет доступ к интернету для подключения к Telegram API

