const express = require('express');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const admin = require('./admin')

module.exports = function (app) {
    app.set('view engine', 'pug');

    //app.use(helmet());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieSession({
        name: 'session',
        secret: process.env.APP_SECRET,
        maxAge: 3600 * 1000
    }));

    app.get('/', (req, res) => {
        res.render('index');
    });
    app.use('/admin', admin)
}