import axios from 'axios';
import router from './router';

const api = axios.create({
    baseURL: 'http://192.168.20.20:5000/api/admin'
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