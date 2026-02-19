import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Colors';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor: agrega JWT a cada request
api.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('koa_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch { }
    return config;
});

// Interceptor: manejo global de errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const msg = error.response?.data?.error || error.message || 'Error de conexión';
        return Promise.reject(new Error(msg));
    }
);

export default api;
