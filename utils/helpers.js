let rad = function (x) {
    return x * Math.PI / 180;
};

module.exports = {
    getDistance: function (p1, p2) {
        let R = 6378137;
        let dLat = rad(p2.latitude - p1.latitude);
        let dLong = rad(p2.longitude - p1.longitude);
        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rad(p1.latitude)) * Math.cos(rad(p2.latitude)) *
            Math.sin(dLong / 2) * Math.sin(dLong / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let d = R * c;
        return d / 1000;
    },
    getDeliveryPrice: async function (p) {
        let DB = require('../database').get();
        let price;
        let dbLocation = await DB.collection('settings').findOne({ location: { $exists: true } });
        let dbFirtsKm = await DB.collection('settings').findOne({ first_km: { $exists: true } });
        let dbFirstKmPrice = await DB.collection('settings').findOne({ price_first_km: { $exists: true } });
        let dbLimitKm = await DB.collection('settings').findOne({ limit_km: { $exists: true } });
        let dbPerKmPrice = await DB.collection('settings').findOne({ price_per_km: { $exists: true } });
        let dist = this.getDistance(p, dbLocation.location);
        if (dist <= dbFirtsKm.first_km) {
            price = dbFirstKmPrice.price_first_km;
        } else if (dist > dbLimitKm.limit_km) {
            price = -1; // not available
        } else {
            price = Math.floor(dist - dbFirtsKm.first_km) * dbPerKmPrice.price_per_km;
        }
        return price;
    }
};