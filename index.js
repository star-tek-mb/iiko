require('dotenv').config();
const express = require('express');
const app = express();
const db = require('./db');
const bot = require('./bot');

db.init();

if (process.env.NODE_ENV == 'production') {
    bot.webhookReply = false;
    bot.telegram.setWebhook(process.env.WEBHOOK_URL + '/' + process.env.TELEGRAM_TOKEN);
    app.use(bot.webhookCallback('/' + process.env.TELEGRAM_TOKEN));
} else {
    (async function () {
        bot.launch();
    })();
}

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.listen(process.env.APP_PORT, process.env.APP_IP);
bot.stop(); // stop bot if end
