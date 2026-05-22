import axios from 'axios';

const defaultUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '';
const configuredUrl = process.env.NEXT_PUBLIC_API_URL || defaultUrl;
const baseURL = configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`;

const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token
api.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
