require('dotenv').config(); // TODO

const axios = require('axios').default;
const fs = require('fs');

(async function () {
    var response = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
        'apiLogin': process.env.IIKO_TOKEN
    });
    var access_token = response.data.token;
    const axios_config = {
        headers: { Authorization: `Bearer ${access_token}` }
    };
    var response = await axios.post('https://api-ru.iiko.services/api/1/organizations', {
        "organizationIds": null,
        "returnAdditionalInfo": false,
        "includeDisabled": false
    }, axios_config);
    var organization_id = response.data.organizations[0].id;
    var response = await axios.post('https://api-ru.iiko.services/api/1/nomenclature', {
        "organizationId": organization_id
    }, {
        ...axios_config,
        responseType: 'stream'
    });
    response.data.pipe(fs.createWriteStream('db/nomenclature.db'));
})();