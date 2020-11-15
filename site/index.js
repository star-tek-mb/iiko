const express = require('express');
const history = require('connect-history-api-fallback');
const admin = require('./admin');
const { resolve } = require('path');

module.exports = function (app) {
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use('/api/admin', admin);
    app.use(history({
        disableDotRule: true,
        rewrites: [
            { from: /^\/admin/, to: '/admin.html' },
            { from: /^\//, to: '/front.html' },
        ],
        verbose: true
    }));
    app.use('/front.html', (req, res) => res.sendFile(resolve(__dirname, '../dist/front.html')));
    app.use('/admin.html', (req, res) => res.sendFile(resolve(__dirname, '../dist/admin.html')));
}