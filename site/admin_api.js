const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');

const _ = require('lodash');
const bcrypt = require('bcryptjs');
const express = require("express");
const ObjectId = require('mongodb').ObjectId;
const DB = require('../database').get();
const iiko = require('../iiko');

let adminApi = express.Router();

passport.use(new JwtStrategy({
    secretOrKey: process.env.APP_SECRET,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()
}, function (jwt_payload, done) {
    DB.collection('admins').findOne({ _id: ObjectId(jwt_payload.id) }).then((user) => {
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    }).catch((err) => {
        return done(err, false);
    });
}));

adminApi.use(passport.initialize());
adminApi.post('/login', async (req, res) => {
    let user = await DB.collection('admins').findOne({ name: req.body.user_name });
    let signed = user ? (await bcrypt.compare(req.body.user_pass, user.password)) : false;
    if (signed) {
        let payload = { id: user._id };
        let token = jwt.sign(payload, process.env.APP_SECRET);
        return res.json({ token: token });
    } else {
        return res.status(401).json({ message: 'user not found or password mismatched' });
    }
});

adminApi.use(passport.authenticate('jwt', { session: false }));
adminApi.get('/users/:group', async (req, res) => {
    let group = req.params.group;
    let users = await DB.collection(group).find({}).toArray();
    return res.json({ users: users });
});
adminApi.get('/groups', async (req, res) => {
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
    return res.json(groups);
});
adminApi.get('/products/refresh', async (req, res) => {
    try {
        await DB.collection('products').drop();
        await DB.collection('groups').drop();
    } catch (e) { }
    let data = await iiko.getNomenclatures();
    await DB.collection('groups').insertMany(data.groups);
    await DB.collection('products').insertMany(data.products);
    return res.json({ message: 'ok' });
});
adminApi.get('/products/:group', async (req, res) => {
    let group = req.params.group;
    let dbGroup = await DB.collection('groups').findOne({ id: group });
    let dbProducts = await DB.collection('products').find({ parentGroup: group }).toArray();
    return res.json({ group: dbGroup, products: dbProducts });
});
adminApi.get('/product/:product', async (req, res) => {
    let product = req.params.product;
    let dbProduct = await DB.collection('products').findOne({ id: product });
    let dbGroup = await DB.collection('groups').findOne({ id: dbProduct.parentGroup });
    return res.json({ group: dbGroup, product: dbProduct });
});
adminApi.get('/settings', async (req, res) => {
    let settings = await DB.collection('settings').find({}).toArray();
    settings = settings.map((o) => {
        let m = {};
        // skip _id field
        m[Object.entries(o)[1][0]] = Object.entries(o)[1][1];
        return m;
    });
    return res.json({ settings: settings });
});
adminApi.post('/settings', async (req, res) => {
    let settings = [];
    for ([index, val] of Object.entries(req.body)) {
        let map = {};
        map[index] = val;
        settings.push(map);
    }
    await DB.collection('settings').drop();
    await DB.collection('settings').insertMany(settings);
    return res.json({ message: 'ok' });
});

module.exports = adminApi;