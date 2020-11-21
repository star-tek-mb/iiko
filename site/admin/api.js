import axios from 'axios';
import router from './router';

const api = axios.create({
    baseURL: process.env.WEBHOOK_URL + '/api/admin'
});

api.interceptors.request.use(async config => {
    const token = localStorage.getItem('access_token');
    config.headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
    return config;
}, error => {
    Promise.reject(error)
});

api.interceptors.response.use(null, error => {
    localStorage.removeItem('access_token');
    if (!router.currentRoute.path == '/login') {
        router.push('/login');
    }
    return Promise.reject(error);
});

export default api;