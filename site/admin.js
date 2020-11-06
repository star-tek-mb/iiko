const _ = require('lodash');
const DB = require('../database').get();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const express = require('express');
const csurf = require('csurf');

let admin = express.Router();

// redirect from login pages
const ifLoggedin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.redirect(req.baseUrl + '/dashboard');
    }
    next();
};

admin.use(csurf()); // global csrf protection
admin.use((req, res, next) => {
    // set global params for views
    res.locals.req = req;
    // redirect if not login pages and not logged in
    if (req.path != '/' && req.path != '/login' && !req.session.isLoggedIn) {
        return res.redirect(401, req.baseUrl + '/login');
    }
    next();
});
admin.get('/', ifLoggedin, (req, res) => {
    return res.redirect(req.baseUrl + '/login');
});
admin.get('/login', ifLoggedin, (req, res) => {
    return res.render('login');
});
admin.post('/logout', (req, res) => {
    req.session.isLoggedIn = false;
    return res.redirect(req.baseUrl + '/login');
});
admin.post('/login', [
    body('user_name', 'Поле имя пользователя не должно быть пустым').trim().not().isEmpty(),
    body('user_pass', 'Поле пароль не должно быть пустым').trim().not().isEmpty(),
], async (req, res) => {
    const validatedData = validationResult(req);
    const { user_name, user_pass } = req.body;
    if (validatedData.isEmpty()) {
        let user = await DB.collection('admins').findOne({ name: user_name });
        let check = user ? (await bcrypt.compare(user_pass, user.password)) : false;
        if (check) {
            req.session.isLoggedIn = true;
            return res.redirect(req.baseUrl + '/dashboard');
        } else {
            return res.render('login', {
                errors: { 'user_pass': 'Неверное имя пользователя или пароль' }
            });
        }
    } else {
        let allErrors = validatedData.errors.reduce(function (map, error) {
            map[error.param] = error.msg;
            return map;
        }, {});
        return res.render('login', {
            errors: allErrors
        });
    }
});
admin.get('/dashboard', async (req, res) => {
    let groupsCount = await DB.collection('groups').countDocuments({ isGroupModifier: false });
    let productsCount = await DB.collection('products').countDocuments({ type: 'Dish' }); // ??? orderItemType: 'Product'
    let usersCount = await DB.collection('telegram').countDocuments();
    return res.render('dashboard', { groups: groupsCount, products: productsCount, users: usersCount });
});
admin.get('/telegram', async (req, res) => {
    let users = await DB.collection('telegram').find({}).toArray();
    return res.render('telegram', { users: users });
});
admin.get('/products', async (req, res) => {
    let dbGroups = await DB.collection('groups').find({}).toArray();
    let groups = {};
    function collect(group) {
        let arr = _(dbGroups).filter({ parentGroup: group, isGroupModifier: false }).value();
        for (a of arr) {
            groups[a.id] = a;
            collect(a.id);
        }
    }
    collect(null);
    return res.render('groups', { groups: groups });
});
admin.get('/products/:group', async (req, res) => {
    let group = req.params.group;
    let dbGroup = await DB.collection('groups').findOne({ id: group });
    let dbProducts = await DB.collection('products').find({ parentGroup: group }).toArray();
    return res.render('products', { products: dbProducts, parent: dbGroup.name });
});
admin.get('/product/:product', async (req, res) => {
    let product = req.params.product;
    let dbProduct = await DB.collection('products').findOne({ id: product });
    let dbGroup = await DB.collection('groups').findOne({ id: dbProduct.parentGroup });
    return res.render('product', { product: dbProduct, parent: dbGroup.name });
});
admin.get('/settings', async (req, res) => {
    let settings = await DB.collection('settings').find({}).toArray();
    settings = settings.map((o) => {
        let m = {};
        // skip _id field
        m[Object.entries(o)[1][0]] = Object.entries(o)[1][1];
        return m;
    });
    return res.render('settings', { settings: settings });
});
admin.post('/settings', async (req, res) => {
    let settings = [];
    for ([index, val] of Object.entries(req.body)) {
        let map = {};
        map[index] = val;
        settings.push(map);
    }
    await DB.collection('settings').drop();
    await DB.collection('settings').insertMany(settings);
    return res.redirect('back');
});

// 404 errors
admin.get('*', (req, res) => {
    res.status(404);
    return res.render('not-found');
});

module.exports = admin;
