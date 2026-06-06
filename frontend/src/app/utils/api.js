import axios from 'axios';

const defaultUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '';
const configuredUrl = process.env.NEXT_PUBLIC_API_URL || defaultUrl;
const normalizedUrl = configuredUrl.replace(/\/+$/, '');
const baseURL = normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;

export const getApiUrl = (path = '') => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseURL}${normalizedPath}`;
};

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
