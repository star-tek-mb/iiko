const _ = require('lodash');
const { Telegraf } = require('telegraf');
const Markup = require('telegraf/markup');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const session = require('telegraf-session-local');
const db = require('./db').getNomenclature();

// registration
const registerScene = new Scene('register');
registerScene.enter((ctx) => {
    if (ctx.session.name) {
        ctx.scene.enter('groups');
    } else {
        ctx.scene.enter('name');
    }
});

const nameScene = new Scene('name');
nameScene.enter((ctx) => {
    ctx.replyWithMarkdown('Ваше имя', Markup.keyboard([ctx.chat.first_name
        + ' ' + (ctx.chat.last_name || '')]).resize().extra());
});
nameScene.on('text', (ctx) => {
    ctx.session.name = ctx.message.text;
    ctx.scene.enter('phone');
});

const phoneScene = new Scene('phone');
phoneScene.enter((ctx) => {
    ctx.replyWithMarkdown('Ваш номер телефона',
        Markup.keyboard([Markup.contactRequestButton('Отправить контакт')]).resize().extra());
});
phoneScene.on('contact', (ctx) => {
    ctx.session.phone = ctx.message.contact.phone_number;
    ctx.scene.enter('groups');
});
phoneScene.on('text', (ctx) => {
    ctx.session.phone = ctx.message.text;
    ctx.session.group = null;
    ctx.scene.enter('groups');
});

// groups
const groupsScene = new Scene('groups');
groupsScene.enter((ctx) => {
    let group = ctx.session.group || null;
    // filter by parent group, get names, divide into 2 rows
    let groups = db.get('groups').filter({ parentGroup: group, isGroupModifier: false }).map((e) => e.name).chunk(2).value();
    if (groups.length == 0) {
        // if group is empty - go to products
        ctx.scene.enter('products');
        return;
    }
    // if not parent group - add back button, else add main menu
    if (group != null) {
        groups.push(['Назад', 'Корзина']);
    } else {
        groups.push(['О нас'], ['Настройки']);
    }
    ctx.reply('Выберите группу', Markup.keyboard(groups).resize().extra());
});
groupsScene.hears('Настройки', (ctx) => ctx.scene.enter('name'));
groupsScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'groups';
    ctx.scene.enter('cart');
});
groupsScene.hears('Назад', (ctx) => {
    let groupId = ctx.session.group;
    let group = db.get('groups').find((e) => e.id == groupId).value();
    ctx.session.group = group ? group.parentGroup : null;
    ctx.scene.enter('groups');
});
groupsScene.on('text', (ctx) => {
    let group = db.get('groups').find((e) => e.name == ctx.message.text).value();
    // if found - set new group and enter to it, else retry
    if (group) {
        ctx.session.group = group.id;
    }
    ctx.scene.enter('groups');
});

// products
const productsScene = new Scene('products');
productsScene.enter((ctx) => {
    let group = ctx.session.group;
    // filter products by group, get name, divide into 3 rows
    let products = db.get('products').filter((e => e.parentGroup == group)).map((e) => e.name).chunk(3).value();
    products.push(['Назад', 'Корзина']);
    ctx.reply('Выберите продукцию', Markup.keyboard(products).resize().extra());
});
productsScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'products';
    ctx.scene.enter('cart');
});
productsScene.hears('Назад', (ctx) => {
    // find parent of products group
    ctx.session.group = db.get('groups').find((e) => e.id == ctx.session.group).value().parentGroup;
    ctx.scene.enter('groups');
});
productsScene.on('text', (ctx) => {
    let product = db.get('products').find((e) => e.name == ctx.message.text).value();
    // if product found enter to it, else retry
    if (product) {
        ctx.session.product = product.id;
        ctx.scene.enter('product');
    } else {
        ctx.scene.enter('products');
    }
});

// product view, photo, description, choose count
const productScene = new Scene('product');
productScene.enter((ctx) => {
    let product_id = ctx.session.product;
    let product = db.get('products').find((e => e.id == product_id)).value();
    let keyboard = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['Корзина', 'Назад']];
    ctx.reply(product.name, Markup.keyboard(keyboard).resize().extra());
});
productScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'product';
    ctx.scene.enter('cart');
});
productScene.hears('Назад', (ctx) => ctx.scene.enter('products'));
productScene.on('text', (ctx) => {
    let count = parseInt(ctx.message.text);
    if (!isNaN(count) && count >= 0) {
        ctx.session.cart[ctx.session.product] = count;
        ctx.reply('Товар добавлен в корзину');
        ctx.scene.enter('products');
    } else {
        ctx.scene.enter('product');
    }
});

// cart
const cartScene = new Scene('cart');
cartScene.enter((ctx) => {
    if (Object.entries(ctx.session.cart).length == 0) {
        ctx.replyWithMarkdown('Ваша корзина пуста');
        ctx.scene.enter(ctx.session.prev || 'groups')
    } else {
        let text = 'Ваша корзина:\n\n';
        let deleteButtons = [];
        let number = 1;
        for (const [id, qty] of Object.entries(ctx.session.cart)) {
            let product = db.get('products').find((e => e.id == id)).value();
            let p = parseInt(product.sizePrices[0].price.currentPrice);
            let price = p.toLocaleString('ru', { maximumFractionDigits: 0 });
            let total = (qty * p).toLocaleString('ru', { maximumFractionDigits: 0 });
            text += `*${number}.* ${product.name} *${qty}${product.measureUnit}.* - ${qty} x ${price} = *${total} сум*\n\n`;
            deleteButtons.push(`\u0000\u274c ${number}`);
            number++;
        }
        deleteButtons = _.chunk(deleteButtons, 2);
        ctx.replyWithMarkdown(text, Markup.keyboard([['Оформить заказ'],
        ...deleteButtons, ['Очистить корзину', 'Назад']]).resize().extra());
    }
});
cartScene.hears('Оформить заказ', (ctx) => {
    ctx.scene.enter('orderLocation');
});
cartScene.hears('Очистить корзину', (ctx) => {
    ctx.session.cart = {};
    ctx.scene.enter('cart');
});
cartScene.hears('Назад', (ctx) => ctx.scene.enter(ctx.session.prev || 'groups'));
cartScene.on('text', (ctx) => {
    let cart = Object.entries(ctx.session.cart);
    let numToDelete = parseInt(ctx.message.text.substring(2));
    if (numToDelete >= 1 && numToDelete <= cart.length) {
        let id = cart[numToDelete - 1][0]; // [0] - key, [1] - qty
        delete ctx.session.cart[id];
    }
    ctx.scene.enter('cart');
});

// order
const orderLocationScene = new Scene('orderLocation');
orderLocationScene.enter((ctx) => {
    let text = '\n*Для оформления заказа отправьте свою локацию.*'
    ctx.replyWithMarkdown(text, Markup.keyboard([
        [Markup.locationRequestButton('Отправить локацию')], ['Назад']]).resize().extra());
});
orderLocationScene.hears('Назад', (ctx) => {
    ctx.scene.enter('cart');
});
orderLocationScene.on('location', (ctx) => {
    ctx.session.location = ctx.message.location;
    ctx.scene.enter('orderPayment');
});

const orderPaymentScene = new Scene('orderPayment');
orderPaymentScene.enter((ctx) => {
    let types = ['Наличные'];
    types = _.chunk(types, 1);
    ctx.reply('Выберите способ оплаты', Markup.keyboard([...types, ['Назад']]).resize().extra());
});
orderPaymentScene.hears('Назад', (ctx) => {
    ctx.scene.enter('orderLocation');
});
orderPaymentScene.hears('Наличные', (ctx) => {
    ctx.session.payment = ctx.message.text;
    ctx.scene.enter('orderConfirmation');
});

const orderConfirmationScene = new Scene('orderConfirmation');
orderConfirmationScene.enter((ctx) => {
    let text = `*Подтвердите заказ*\n\n` +
        `*Имя:* ${ctx.session.name}\n` +
        `*Телефон:* ${ctx.session.phone}\n` +
        `*Способ оплаты:* ${ctx.session.payment}\n\n`;
    let number = 1, overall = 0;
    for (const [id, qty] of Object.entries(ctx.session.cart)) {
        let product = db.get('products').find((e => e.id == id)).value();
        let p = parseInt(product.sizePrices[0].price.currentPrice);
        let price = p.toLocaleString('ru', { maximumFractionDigits: 0 });
        let total = (qty * p).toLocaleString('ru', { maximumFractionDigits: 0 });
        text += `*${number}.* ${product.name} *${qty}${product.measureUnit}.* - ${qty} x ${price} = *${total} сум*\n`;
        number++;
        overall += qty * p;
    }
    overall = overall.toLocaleString('ru', { maximumFractionDigits: 0 });
    text += `\nИтого: *${overall} сум*`;
    ctx.replyWithMarkdown(text, Markup.keyboard([['Подтверждаю', 'Отмена'], ['Назад']]).resize().extra());
});
orderConfirmationScene.hears('Назад', (ctx) => {
    ctx.scene.enter('orderPayment');
});
orderConfirmationScene.hears('Подтверждаю', (ctx) => {
    ctx.reply('Ваш заказ обработан');
    ctx.session.group = null;
    ctx.scene.enter('groups');
});
orderConfirmationScene.hears('Отмена', (ctx) => {
    ctx.reply('Заказ отменен');
    ctx.session.group = null;
    ctx.scene.enter('groups');
});

const stage = new Stage([registerScene, nameScene, phoneScene, groupsScene,
    productsScene, productScene, cartScene, orderLocationScene, orderPaymentScene, orderConfirmationScene]);

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
bot.catch((err, ctx) => {
    console.log(err);
    ctx.reply('Возникла ошибка, наберите пожалуйста /start');
});
bot.use((new session({ database: 'db/telegram.db' })).middleware()); // session
bot.use((ctx, next) => { // reset if errors
    if (ctx.message && ctx.message.text && ctx.message.text == '/start') {
        delete ctx.session.group;
        delete ctx.session.prev;
        delete ctx.session.product;
        delete ctx.session.location;
        delete ctx.session.payment;
        delete ctx.session.__scenes;
        ctx.session.cart = {};
    }
    next();
});
bot.use(stage.middleware());
bot.start((ctx) => ctx.scene.enter('register'));
bot.on('text', (ctx) => ctx.scene.enter('register'));

module.exports = bot;
