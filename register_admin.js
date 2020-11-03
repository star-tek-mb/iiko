require('dotenv').config();
const database = require('./database');
const bcrypt = require('bcryptjs');
const prompt = require('prompt');

var schema = {
    properties: {
        name: {
            description: 'Enter name',
            type: 'string',
            pattern: /^[a-zA-Z\s\-]+$/,
            message: 'Name must be only letters, spaces, or dashes',
            required: true
        },
        password: {
            description: 'Enter password',
            type: 'string',
            hidden: true
        }
    }
};

prompt.start();

(async function () {
    let input = await prompt.get(schema);
    let passwordHash = await bcrypt.hash(input.password, 8);
    await database.connect();
    let DB = database.get();
    await DB.collection('admins').insertOne({ name: input.name, password: passwordHash });
    console.log('admin registered');
    database.close();
})();