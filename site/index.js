const express = require('express');
const cookieSession = require('cookie-session');
const admin = require('./admin')
const adminApi = require('./admin_api');

module.exports = function (app) {
    app.set('view engine', 'pug');

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(cookieSession({
        name: 'session',
        secret: process.env.APP_SECRET,
        maxAge: 3600 * 1000,
        secure: process.env.NODE_ENV == 'production'
    }));

    app.get('/', (req, res) => {
        res.render('index');
    });
    app.use('/admin', admin);
    app.use('/api/admin', adminApi);
}