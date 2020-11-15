const { v4: uuidv4 } = require('uuid');

let rad = function (x) {
    return x * Math.PI / 180;
};

module.exports = {
    getDistance: function (p1, p2) {
        let R = 6378137;
        console.log(p1);
        console.log(p2);
        let dLat = rad(p2.latitude - p1.latitude);
        let dLong = rad(p2.longitude - p1.longitude);
        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(p1.latitude)) * Math.cos(rad(p2.latitude)) *
            Math.sin(dLong / 2) * Math.sin(dLong / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let d = R * c;
        return d / 1000;
    },
    getSettings: async function () {
        let DB = require('../database').get();
        let result = {};
        let settings = await DB.collection('settings').find({}).toArray();
        settings.map((o) => {
            // skip _id field
            result[Object.entries(o)[1][0]] = Object.entries(o)[1][1];
            return result;
        });
        return result;
    },
    getDeliveryPrice: async function (p) {
        let price;
        let settings = await this.getSettings();
        console.log(settings.location);
        let dist = this.getDistance(p, settings.location);
        if (dist <= settings.first_km) {
            price = settings.price_first_km;
        } else if (dist > settings.limit_km) {
            price = -1; // not available
        } else {
            price = Math.floor(dist - settings.first_km) * settings.price_per_km;
        }
        return price;
    },
    registerUser: async function (name, phone) {
        let DB = require('../database').get();
        let user = await DB.collection('users').findOneAndUpdate({
            phone: phone
        }, {
            $set: {
                name: name,
                phone: phone
            },
            $setOnInsert: {
                id: uuidv4()
            }
        }, {
            returnOriginal: true,
            upsert: true
        });
        return user.id;
    }
};