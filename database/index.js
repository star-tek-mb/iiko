const MongoClient = require('mongodb').MongoClient;
let client = null;
let database = null;

module.exports = {
    connect: async function () {
        client = await MongoClient.connect(process.env.MONGODB_URI,
            { useNewUrlParser: true, useUnifiedTopology: true });
        database = client.db();
        return client;
    },
    get: function () {
        return database;
    },
    close: function () {
        client.close();
    }
};