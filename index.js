require('dotenv').config();
const database = require('./database');
const helmet = require('helmet');

database.connect().then(() => {
    const bot = require('./bot');
    const express = require('express');
    const app = express();

    if (process.env.NODE_ENV == 'production') {
        app.set('trust proxy');
        bot.webhookReply = false;
        bot.telegram.setWebhook(process.env.WEBHOOK_URL + '/' + process.env.TELEGRAM_TOKEN);
        app.use(bot.webhookCallback('/' + process.env.TELEGRAM_TOKEN));
        app.use(helmet());
    } else {
        app.use(express.static('static'));
        (async function () {
            bot.launch();
        })();
    }

    // connect routes
    require('./site')(app);

    app.listen(process.env.APP_PORT, process.env.APP_IP);
    bot.stop(); // stop bot if end
    //database.close(); // close connection if end
});