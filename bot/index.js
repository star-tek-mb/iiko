const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const { Telegraf } = require('telegraf');
const Markup = require('telegraf/markup');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const session = require('./session');

const DB = require('../database').get();

// registration
const registerScene = new Scene('register');
registerScene.enter((ctx) => {
    if (ctx.session.name) {
        ctx.scene.enter('groups');
    } else {
        ctx.session.userId = uuidv4(); // for iiko
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
    if (ctx.session.phone[0] != '+')
        ctx.session.phone = '+' + ctx.session.phone;
    ctx.session.groupId = null;
    //await helpers.registerUser(name, phone);
    ctx.scene.enter('groups');
});
phoneScene.on('text', (ctx) => {
    ctx.session.phone = ctx.message.text;
    if (ctx.session.phone[0] != '+')
        ctx.session.phone = '+' + ctx.session.phone;
    ctx.session.groupId = null;
    //await helpers.registerUser(name, phone);
    ctx.scene.enter('groups');
});

// new step - sms handler

// groups
const groupsScene = new Scene('groups');
groupsScene.enter(async (ctx) => {
    let groupId = ctx.session.groupId || null;

    let dbGroups = await DB.collection('groups').find({ parentGroup: groupId, isGroupModifier: false }).toArray();
    let groups = _(dbGroups).map((e) => e.name).chunk(2).value();
    if (dbGroups.length == 0) {
        // if group is empty - go to products
        ctx.scene.enter('products');
        return;
    }
    // if not parent group - add back button, else add main menu
    if (groupId) {
        groups.push(['Назад', 'Корзина']);
    } else {
        groups.push(['О нас'], ['Настройки']);
    }
    await ctx.reply('Выберите группу', Markup.keyboard(groups).resize().extra());
});
// main menu
groupsScene.hears('Настройки', (ctx) => ctx.scene.enter('name'));
groupsScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'groups';
    ctx.scene.enter('cart');
});
// rest
groupsScene.hears('Назад', async (ctx) => {
    let group = await DB.collection('groups').findOne({ id: ctx.session.groupId });
    ctx.session.groupId = group ? group.parentGroup : null;
    await ctx.scene.enter('groups');
});
groupsScene.on('text', async (ctx) => {
    let group = await DB.collection('groups').findOne({ name: ctx.message.text });
    // if found - set new group and enter to it, else retry
    if (group) {
        ctx.session.groupId = group.id;
    }
    await ctx.scene.enter('groups');
});

// products
const productsScene = new Scene('products');
productsScene.enter(async (ctx) => {
    let dbProducts = await DB.collection('products').find({ parentGroup: ctx.session.groupId }).toArray();
    let products = _(dbProducts).map((e) => e.name).chunk(3).value();
    products.push(['Назад', 'Корзина']);
    await ctx.reply('Выберите продукцию', Markup.keyboard(products).resize().extra());
});
productsScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'products';
    ctx.scene.enter('cart');
});
productsScene.hears('Назад', async (ctx) => {
    // find parent of products group
    let group = await DB.collection('groups').findOne({ id: ctx.session.groupId });
    ctx.session.groupId = group ? group.parentGroup : null;
    await ctx.scene.enter('groups');
});
productsScene.on('text', async (ctx) => {
    let product = await DB.collection('products').findOne({ name: ctx.message.text });
    // if product found enter to it, else retry
    if (product) {
        ctx.session.productId = product.id;
        await ctx.scene.enter('product');
    } else {
        await ctx.scene.enter('products');
    }
});

// product view, photo, description, choose count
const productScene = new Scene('product');
productScene.enter(async (ctx) => {
    let product = await DB.collection('products').findOne({ id: ctx.session.productId });
    let name = product.name;
    let desc = product.description || '';
    let price = parseInt(product.sizePrices[0].price.currentPrice)
        .toLocaleString('ru', { maximumFractionDigits: 0 });
    let text = `${name} *${price} сум*\n\n${desc}`;
    let image = product.imageLinks.length > 0 ? product.imageLinks[0] : null;

    let keyboard = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['Корзина', 'Назад']];
    if (image) {
        await ctx.replyWithPhoto({ url: image }, Markup.keyboard(keyboard).resize()
            .extra({ caption: text, parse_mode: 'Markdown' }));
    } else {
        await ctx.reply(text, Markup.keyboard(keyboard).resize().extra({ parse_mode: 'Markdown' }));
    }
});
productScene.hears('Корзина', (ctx) => {
    ctx.session.prev = 'product';
    ctx.scene.enter('cart');
});
productScene.hears('Назад', (ctx) => ctx.scene.enter('products'));
productScene.on('text', (ctx) => {
    let count = parseInt(ctx.message.text);
    if (!isNaN(count) && count >= 0) {
        ctx.session.cart[ctx.session.productId] = count;
        ctx.reply('Товар добавлен в корзину');
        ctx.scene.enter('products');
    } else {
        ctx.scene.enter('product');
    }
});

// cart
const cartScene = new Scene('cart');
cartScene.enter(async (ctx) => {
    if (Object.entries(ctx.session.cart).length == 0) {
        ctx.replyWithMarkdown('Ваша корзина пуста');
        await ctx.scene.enter(ctx.session.prev || 'groups');
    } else {
        let text = 'Ваша корзина:\n\n';
        let deleteButtons = [];
        let number = 1;
        for (const [id, qty] of Object.entries(ctx.session.cart)) {
            let product = await DB.collection('products').findOne({ id: id });
            if (!product) {
                ctx.session.cart = {}; // handle error if cart item is not found
                ctx.replyWithMarkdown('Ваша корзина пуста');
                ctx.scene.enter(ctx.session.prev || 'groups');
                return;
            }
            let p = parseInt(product.sizePrices[0].price.currentPrice);
            let price = p.toLocaleString('ru', { maximumFractionDigits: 0 });
            let total = (qty * p).toLocaleString('ru', { maximumFractionDigits: 0 });
            text += `*${number}.* ${product.name} *${qty}${product.measureUnit}.* - ${qty} x ${price} = *${total} сум*\n\n`;
            deleteButtons.push(`\u0000\u274c ${number}`);
            number++;
        }
        deleteButtons = _.chunk(deleteButtons, 2);
        await ctx.replyWithMarkdown(text, Markup.keyboard([['Оформить заказ'],
        ...deleteButtons, ['Очистить корзину', 'Назад']]).resize().extra());
    }
});
cartScene.hears('Оформить заказ', (ctx) => {
    ctx.scene.enter('orderDelivery');
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

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// early catch
bot.catch((err, ctx) => {
    console.log(err);
    ctx.reply('Возникла ошибка, наберите пожалуйста /start');
});

// early session initialization
bot.use(session({
    db: DB,
    collection: 'telegram',
    property: 'session'
}));

// command /start resetting session
bot.use(async (ctx, next) => { // reset if errors
    if (ctx.message && ctx.message.text && ctx.message.text == '/start') {
        delete ctx.session.groupId;
        delete ctx.session.productId;
        delete ctx.session.orderId;
        delete ctx.session.__scenes;
        ctx.session.cart = {};
    }
    await next();
});

// split bot
const orderScenes = require('./order');

// bot scenes
const stage = new Stage([registerScene, nameScene, phoneScene, groupsScene,
    productsScene, productScene, cartScene, ...orderScenes]);
bot.use(stage.middleware());

// entry points
bot.start((ctx) => ctx.scene.enter('register'));

module.exports = bot;
