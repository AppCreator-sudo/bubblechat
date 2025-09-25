# Dreams - Telegram Mini App Setup

## 🎯 Обзор

Проект "Dreams" теперь поддерживает Telegram Mini Apps! Приложение автоматически определяет окружение и адаптируется под Telegram или обычный веб-сайт.

## 🚀 Функциональность

### Автоматическое определение окружения:
- **В Telegram**: Инициализируется как Mini App с адаптированным интерфейсом
- **В браузере**: Работает как обычный веб-сайт

### Telegram Mini App особенности:
- Автоматическое расширение интерфейса
- Синхронизация с темой Telegram
- Подтверждение закрытия
- Адаптированная верстка для мобильных устройств
- Скрытый переключатель тем (используется тема Telegram)

## 📋 Настройка Telegram Mini App

### 1. Создание бота в Telegram
```bash
# Напишите @BotFather в Telegram
/newbot
# Следуйте инструкциям для создания бота
```

### 2. Настройка Web App
```bash
# В @BotFather:
/setmenubutton
# Выберите вашего бота
# Отправьте ссылку на ваше приложение
```

### 3. Структура URL для Mini App
```
https://your-domain.com/?tgWebAppData=...&tgWebAppVersion=...
```

### 4. Тестирование
```bash
# Откройте приложение через бота
# Проверьте консоль браузера на сообщения:
# - "🎯 Telegram Mini App detected"
# - "🎨 UI adapted for Telegram Mini App"
```

## 🔧 Техническая реализация

### Файлы:
- `index.html` - Добавлен Telegram WebApp API скрипт и manifest
- `script.js` - Логика инициализации и адаптации UI
- `telegram-manifest.json` - Manifest для PWA/Mini App

### Ключевые функции:
```javascript
// Инициализация Telegram Mini App
initTelegramMiniApp()

// Адаптация UI для Telegram
adaptUIForTelegram()
```

### Переменные состояния:
```javascript
let isTelegramMiniApp = false;  // Флаг Telegram окружения
let telegramWebApp = null;      // Экземпляр Telegram WebApp
```

## 🎨 Адаптация интерфейса

### В Telegram Mini App:
- Скрывается переключатель тем (используется тема Telegram)
- Корректируется позиционирование элементов
- Увеличиваются отступы от системных элементов

### В обычном браузере:
- Работает стандартный интерфейс
- Доступен переключатель тем
- Обычное позиционирование элементов

## 🔍 Отладка

### Проверка окружения:
```javascript
console.log('Telegram API available:', typeof Telegram !== 'undefined');
console.log('WebApp available:', Telegram?.WebApp);
console.log('Is Mini App:', isTelegramMiniApp);
```

### Логи Telegram:
- `🎯 Telegram Mini App detected` - Успешная инициализация
- `🌐 Regular web app (not Telegram)` - Обычное веб-приложение
- `🎨 UI adapted for Telegram Mini App` - UI адаптирован

## 📱 Мобильная оптимизация

### Telegram Mini App:
- Оптимизировано для вертикальной ориентации
- Учитывает системные элементы интерфейса
- Touch-friendly элементы управления

### Обычный браузер:
- Адаптивная верстка
- Поддержка всех устройств
- Клавиатурные и touch события

## 🚀 Деплой

### Требования к серверу:
- HTTPS (обязательно для Telegram Mini Apps)
- CORS headers настроены
- Socket.io поддержка

### Переменные окружения:
```bash
NODE_ENV=production
PORT=3000
```

## 🔐 Безопасность

### Telegram WebApp:
- Проверка подлинности через `initData`
- Валидация данных пользователя
- Защита от подделки запросов

### Рекомендации:
- Всегда проверяйте `initData` на сервере
- Используйте HTTPS
- Валидируйте пользовательские данные

## 📊 Метрики и аналитика

### Доступные данные в Telegram:
```javascript
// Информация о пользователе
telegramWebApp.initDataUnsafe.user

// Платформа
telegramWebApp.platform

// Версия приложения
telegramWebApp.version
```

## 🐛 Устранение неполадок

### Проблема: Mini App не инициализируется
**Решение:**
- Проверьте HTTPS
- Убедитесь, что скрипт загружается
- Проверьте консоль на ошибки

### Проблема: UI не адаптируется
**Решение:**
- Проверьте флаг `isTelegramMiniApp`
- Убедитесь, что `adaptUIForTelegram()` вызывается
- Проверьте CSS селекторы

### Проблема: WebSocket не подключается
**Решение:**
- Проверьте CORS настройки
- Убедитесь в правильности URL сервера
- Проверьте логи сервера

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи консоли браузера
2. Убедитесь в корректности настройки бота
3. Проверьте сетевые настройки сервера

---

**Приятного использования Dreams в Telegram! 🎉**
