import axios from 'axios';

// Production browser traffic stays on the frontend origin. Next.js proxies
// /api to the backend, avoiding CORS and cross-site cookie failures on Vercel.
const configuredUrl = process.env.NODE_ENV === 'development'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
    : '';
const normalizedUrl = configuredUrl.replace(/\/+$/, '');
const baseURL = normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;

export const getApiUrl = (path = '') => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseURL}${normalizedPath}`;
};

const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        if (typeof document !== 'undefined' && !['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
            const csrf = document.cookie.split('; ').find((entry) => entry.startsWith('csrfToken='))?.split('=').slice(1).join('=');
            if (csrf) config.headers['X-CSRF-Token'] = decodeURIComponent(csrf);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let refreshing = null;
api.interceptors.response.use(undefined, async (error) => {
    const original = error.config;
    const publicAuthRequest = ['/auth/login', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password']
        .some((path) => original?.url?.includes(path));
    if (error.response?.status !== 401 || original?._retried || publicAuthRequest) {
        return Promise.reject(error);
    }
    original._retried = true;
    try {
        refreshing ||= api.post('/auth/refresh').finally(() => { refreshing = null; });
        await refreshing;
        return api(original);
    } catch (_) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
        }
        return Promise.reject(error);
    }
});

export default api;
