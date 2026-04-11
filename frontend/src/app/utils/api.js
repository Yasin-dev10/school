import axios from 'axios';

// Create axios instance
const defaultUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://school-ta8j.onrender.com';

const api = axios.create({
    baseURL: (process.env.NEXT_PUBLIC_API_URL || defaultUrl) + '/api',
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
