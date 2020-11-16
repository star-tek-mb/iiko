Установка:
```
yarn install или npm install
```

Нужно создать .env файл с параметрами
```
TELEGRAM_TOKEN=
IIKO_TOKEN=
YANDEXMAP_TOKEN=
CLICK_TOKEN=
PAYME_TOKEN=
APP_IP=
APP_PORT=
APP_SECRET=
WEBHOOK_URL=
MONGODB_URI=
```

Первичная настройка:
```
yarn run init # получение номенклатуры и инциализация настроек
yarn run register # регистрация администратора
yarn run start # старт программы
# или просто
node index.js
```

При NODE_ENV=production нужно ставить как реверс прокси. И сделать dist папку доступной из веб сервера.

Компилирование фронтенда на webpack.
1) Поменять URL на site/admin/api.js.
2) ```NODE_ENV=production yarn run webpack --mode production``` или npm команда