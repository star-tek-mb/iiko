require('dotenv').config();
const database = require('./database');
const iiko = require('./iiko');

(async function () {
    await database.connect();
    let DB = database.get();
    await DB.collection('products').drop();
    await DB.collection('groups').drop();
    await DB.collection('settings').drop();
    console.log('deleting products, groups, settings');
    console.log('getting nomenclatures');
    let data = await iiko.getNomenclatures();
    console.log('got nomenclatures');
    await DB.collection('groups').insertMany(data.groups);
    console.log('groups filled');
    await DB.collection('products').insertMany(data.products);
    console.log('products filled');
    await DB.collection('settings').insertMany([
        { location: { latitude: 1.0, longitude: 1.0 } },
        { first_km: 3 },
        { price_first_km: 0 },
        { limit_km: 50 },
        { price_per_km: 1000 },
    ]);
    console.log('settings stored');
    console.log('initialization completed');
    database.close();
})();