const { v4: uuidv4 } = require('uuid');
const Scene = require('telegraf/scenes/base');
const Markup = require('telegraf/markup');

const DB = require('../database').get();
const helpers = require('../utils/helpers');
const iiko = require('../iiko');

// order
const orderDeliveryScene = new Scene('orderDelivery');
orderDeliveryScene.enter((ctx) => {
    let text = 'Выберите метод доставки'
    ctx.replyWithMarkdown(text, Markup.keyboard([
        ['Самовывоз', 'Курьер'], ['Назад']]).resize().extra());
});
orderDeliveryScene.hears('Назад', (ctx) => {
    ctx.scene.enter('cart');
});
orderDeliveryScene.on('text', async (ctx) => {
    if (['Самовывоз', 'Курьер'].includes(ctx.message.text)) {
        ctx.session.delivery = ctx.message.text;
        if (ctx.message.text == 'Курьер') {
            await ctx.scene.enter('orderLocation');
        } else {
            let dbLocation = await DB.collection('settings').findOne({ location: { $exists: true } });
            let location = dbLocation.location;
            await ctx.reply('Наша локация');
            await ctx.replyWithLocation(location.latitude, location.longitude);
            await ctx.scene.enter('orderPayment');
        }
    } else {
        await ctx.scene.enter('orderDelivery');
    }
});

const orderLocationScene = new Scene('orderLocation');
orderLocationScene.enter((ctx) => {
    let text = 'Отправьте свою локацию';
    ctx.replyWithMarkdown(text, Markup.keyboard([
        [Markup.locationRequestButton('Отправить локацию')], ['Назад']]).resize().extra());
    delete ctx.session.location;
});
orderLocationScene.hears('Назад', (ctx) => {
    ctx.scene.enter('orderDelivery');
});
orderLocationScene.on('location', async (ctx) => {
    ctx.session.location = ctx.message.location;
    ctx.session.deliveryPrice = await helpers.getDeliveryPrice(ctx.message.location);
    if (ctx.session.deliveryPrice == -1) { // too far
        await ctx.reply('К сожалению курьер не может доставить посылку по вашему адресу.');
        await ctx.scene.enter('cart');
    } else {
        await ctx.scene.enter('orderPayment');
    }
});

const orderPaymentScene = new Scene('orderPayment');
orderPaymentScene.enter((ctx) => {
    ctx.reply('Выберите способ оплаты', Markup.keyboard([['Наличные', 'Payme'], ['Click', 'Назад']])
        .resize().extra());
});
orderPaymentScene.hears('Назад', (ctx) => {
    ctx.scene.enter('orderDelivery');
});
// async await needed here
orderPaymentScene.on('text', async (ctx) => {
    if (['Наличные', 'Payme', 'Click'].includes(ctx.message.text)) {
        ctx.session.payment = ctx.message.text;
        await ctx.scene.enter('orderConfirmation');
    } else {
        await ctx.scene.enter('orderPayment');
    }
});

const orderConfirmationScene = new Scene('orderConfirmation');
orderConfirmationScene.enter(async (ctx) => {
    let number = 1, prices = [];
    let overall = parseInt(ctx.session.deliveryPrice) || 0;
    ctx.session.orderId = uuidv4(); // for iiko

    let text = `*Подтвердите заказ*\n\n` +
        `*Имя:* ${ctx.session.name}\n` +
        `*Телефон:* ${ctx.session.phone}\n` +
        `*Способ доставки:* ${ctx.session.delivery}\n` +
        `*Способ оплаты:* ${ctx.session.payment}\n\n`;

    // delivery price handling
    if (ctx.session.delivery == 'Курьер') {
        let deliveryPrice = 'Бесплатно';
        if (ctx.session.deliveryPrice != 0) {
            deliveryPrice = ctx.session.deliveryPrice;
            prices.push({ label: `Стоимость доставки`, amount: deliveryPrice * 100 });
        }
        deliveryPrice = deliveryPrice.toLocaleString('ru', { maximumFractionDigits: 0 }) + ' сум';
        text += `*Стоимость доставки: ${deliveryPrice}*\n\n`;
    }

    for (const [id, qty] of Object.entries(ctx.session.cart)) {
        let product = await DB.collection('products').findOne({ id: id });
        let p = parseInt(product.sizePrices[0].price.currentPrice);
        let price = p.toLocaleString('ru', { maximumFractionDigits: 0 });
        let total = (qty * p).toLocaleString('ru', { maximumFractionDigits: 0 });
        text += `*${number}.* ${product.name} *${qty}${product.measureUnit}.* - ${qty} x ${price} = *${total} сум*\n`;
        prices.push({ label: `${product.name} ${qty}${product.measureUnit}`, amount: qty * p * 100 });
        number++;
        overall += qty * p;
    }
    overall = overall.toLocaleString('ru', { maximumFractionDigits: 0 });
    text += `\n*Итого: ${overall} сум*`;

    // telegram payments
    if (['Click', 'Payme'].includes(ctx.session.payment)) {
        await ctx.replyWithMarkdown(text, Markup.keyboard(['Отмена', 'Назад']).resize().extra());
        ctx.session.invoiceId = (await ctx.replyWithInvoice({
            provider_token: process.env[ctx.session.payment.toUpperCase() + '_TOKEN'],
            title: 'Оплата за заказ',
            description: 'Оплатите за заказ выше',
            prices: prices,
            currency: 'UZS',
            payload: ctx.session.orderId,
            start_parameter: ctx.session.orderId
        })).message_id;
    } else {
        await ctx.replyWithMarkdown(text, Markup.keyboard([['Подтверждаю', 'Отмена'], ['Назад']]).resize().extra());
    }
});
orderConfirmationScene.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

// order confirmation
async function orderConfirm(ctx) {
    let orderItems = [];
    let total = parseInt(ctx.session.deliveryPrice) || 0;
    for (const [id, qty] of Object.entries(ctx.session.cart)) {
        let product = await DB.collection('products').findOne({ id: id });
        orderItems.push({
            "type": "Product",
            "productId": id,
            "amount": qty
        });
        total += parseInt(product.sizePrices[0].price.currentPrice) * qty;
    }
    await iiko.createOrder({
        userId: ctx.session.userId,
        orderId: ctx.session.orderId,
        name: ctx.session.name,
        phone: ctx.session.phone,
        location: ctx.session.location,
        orderItems: orderItems,
        total: total,
        deliveryType: ctx.session.delivery,
        paymentType: ctx.session.payment
    });
    ctx.session.groupId = null;
    ctx.session.cart = {};
    await ctx.scene.enter('groups');
}
orderConfirmationScene.on('successful_payment', async (ctx) => {
    await ctx.reply('Ваш заказ обработан');
    await orderConfirm(ctx);
});
// only cash
orderConfirmationScene.hears('Подтверждаю', async (ctx) => {
    if (!['Click', 'Payme'].includes(ctx.session.payment)) {
        await ctx.reply('Ваш заказ обработан');
        await orderConfirm(ctx);
    }
});

// order cancellation
orderConfirmationScene.hears('Назад', (ctx) => {
    if (ctx.session.invoiceId) { // delete invoice
        ctx.deleteMessage(ctx.session.invoiceId);
        delete ctx.session.invoiceId;
    }
    ctx.scene.enter('orderPayment');
});
orderConfirmationScene.hears('Отмена', (ctx) => {
    if (ctx.session.invoiceId) { // delete invoice
        ctx.deleteMessage(ctx.session.invoiceId);
        delete ctx.session.invoiceId;
    }
    ctx.reply('Заказ отменен');
    ctx.session.groupId = null;
    ctx.session.cart = {};
    ctx.scene.enter('groups');
});

module.exports = [orderDeliveryScene, orderLocationScene, orderPaymentScene, orderConfirmationScene];