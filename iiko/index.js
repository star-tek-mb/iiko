const axios = require('axios').default;
const _ = require('lodash');

module.exports = {
    login: async function () {
        let response = await axios.post('https://api-ru.iiko.services/api/1/access_token', {
            'apiLogin': process.env.IIKO_TOKEN
        });
        return response.data.token;
    },
    getOrganization: async function (accessToken) {
        const axios_config = {
            headers: { Authorization: `Bearer ${accessToken}` }
        };
        let response = await axios.post('https://api-ru.iiko.services/api/1/organizations', {
            "organizationIds": null,
            "returnAdditionalInfo": false,
            "includeDisabled": false
        }, axios_config);
        return response.data.organizations[0].id;
    },
    getPaymentTypes: async function (accessToken, organizationId) {
        const axiosСonfig = {
            headers: { Authorization: `Bearer ${accessToken}` }
        };
        let response = await axios.post('https://api-ru.iiko.services/api/1/payment_types', {
            "organizationIds": [
                organizationId
            ]
        }, axiosСonfig);
        return response.data.paymentTypes;
    },
    createOrder: async function (options) {
        let { userId, orderId, name, phone, location, orderItems, total,
            deliveryType, paymentType } = options;

        let accessToken = await this.login();
        let organizationId = await this.getOrganization(accessToken);
        let paymentTypes = await this.getPaymentTypes(accessToken, organizationId);
        let data = {
            "organizationId": organizationId,
            "order": {
                "id": orderId,
                "items": orderItems,
                "phone": phone,
                "customer": {
                    "id": userId,
                    "name": name
                },
                "orderServiceType": deliveryType == 'Курьер' ? "DeliveryByCourier" : "DeliveryByClient",
            }
        };
        if (location) {
            data["order"]["deliveryPoint"] = {
                "coordinates": {
                    "latitude": location.latitude,
                    "longitude": location.longitude
                }
            };
        }
        let payment = _.find(paymentTypes, (e) => e.name == paymentType);
        data["order"]["payments"] = [{
            "paymentTypeKind": payment.paymentTypeKind,
            "sum": total,
            "paymentTypeId": payment.id
        }];
        const axiosСonfig = {
            headers: { Authorization: `Bearer ${accessToken}` }
        };
        await axios.post('https://api-ru.iiko.services/api/1/deliveries/create',
            data, axiosСonfig);
    },
    getNomenclatures: async function () {
        let accessToken = await this.login();
        let organizationId = await this.getOrganization(accessToken);
        const axiosСonfig = {
            headers: { Authorization: `Bearer ${accessToken}` }
        };
        let response = await axios.post('https://api-ru.iiko.services/api/1/nomenclature', {
            "organizationId": organizationId
        }, axiosСonfig);
        return response.data;
    }
};