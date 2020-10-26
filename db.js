const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const nomenclature = low(new FileSync('db/nomenclature.db'));
module.exports = {
    init: function () {
        nomenclature.read();
    },
    getNomenclature: function () {
        return nomenclature;
    }
};