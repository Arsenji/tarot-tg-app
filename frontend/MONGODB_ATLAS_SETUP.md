# MongoDB Atlas Setup для Render.com

## Проблема
MongoDB Atlas кластер недоступен или приостановлен. Ошибка: `querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net`

## Решение

### 1. Проверьте MongoDB Atlas Dashboard
1. Войдите в [MongoDB Atlas](https://cloud.mongodb.com/)
2. Найдите ваш кластер `taro-tg-cluster`
3. Убедитесь, что статус кластера **"Running"** (не "Paused")

### 2. Если кластер приостановлен
1. Нажмите **"Resume"** или **"Resume Cluster"**
2. Дождитесь запуска кластера (2-3 минуты)

### 3. Проверьте Connection String
1. Нажмите **"Connect"** на кластере
2. Выберите **"Connect your application"**
3. Скопируйте connection string
4. Убедитесь, что имя кластера правильное: `taro-tg-cluster`

### 4. Настройте Network Access
1. Перейдите в **"Network Access"** в левом меню
2. Нажмите **"Add IP Address"**
3. Выберите **"Allow access from anywhere"** (0.0.0.0/0)
4. Или добавьте IP адреса Render.com

### 5. Проверьте Database User
1. Перейдите в **"Database Access"**
2. Убедитесь, что пользователь `taro-admin` существует
3. Проверьте права доступа: **"Read and write to any database"**

### 6. Обновите Environment Variables на Render.com
```bash
MONGODB_URI=mongodb+srv://taro-admin:ВАШ_РЕАЛЬНЫЙ_ПАРОЛЬ@taro-tg-cluster.tw2dacc.mongodb.net/?retryWrites=true&w=majority&appName=taro-tg-cluster
ALLOW_NO_MONGODB=false
```

### 7. Альтернативное решение - Создать новый кластер
Если текущий кластер не работает:

1. **Создайте новый кластер:**
   - Нажмите **"Create"** → **"Cluster"**
   - Выберите **"M0 Sandbox"** (бесплатный)
   - Выберите регион близко к Render.com (например, US East)

2. **Настройте доступ:**
   - Network Access: 0.0.0.0/0
   - Database User: `taro-admin` с паролем

3. **Обновите MONGODB_URI** с новым connection string

## Временное решение
Пока MongoDB не настроен, приложение работает с флагом `ALLOW_NO_MONGODB=true`:
- ✅ Основные функции работают
- ❌ История раскладов отключена
- ❌ Уточняющие вопросы отключены
- ❌ Аутентификация отключена

## Тестирование
После настройки MongoDB:
1. Установите `ALLOW_NO_MONGODB=false`
2. Перезапустите деплой
3. Проверьте логи на успешное подключение
