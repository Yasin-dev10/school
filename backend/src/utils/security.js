const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'secret' || secret === 'change-this-to-a-long-random-secret' || secret === 'change-this-docker-jwt-secret') {
        throw new Error('JWT_SECRET must be set to a strong random value');
    }
    return secret;
};

const normalizeRole = (role) => {
    if (!role) return role;
    return String(role).replace(/_/g, '-');
};

const normalizeRoleKey = (role) => {
    if (!role) return role;
    return String(role).replace(/-/g, '_');
};

const signAccessToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, getJwtSecret());
};

const cookieOptions = (httpOnly = true) => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly,
        secure: isProd,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        path: '/',
    };
};

const accessCookieOptions = () => ({ ...cookieOptions(true), maxAge: 15 * 60 * 1000 });
const refreshCookieOptions = () => ({ ...cookieOptions(true), maxAge: 7 * 24 * 60 * 60 * 1000 });
const csrfCookieOptions = () => ({ ...cookieOptions(false), maxAge: 7 * 24 * 60 * 60 * 1000 });

const redactSensitive = (body) => {
    if (!body || typeof body !== 'object') return body;
    const clone = { ...body };
    for (const key of Object.keys(clone)) {
        if (/password|token|secret|authorization/i.test(key)) {
            clone[key] = '[REDACTED]';
        }
    }
    return clone;
};

const parseAllowedOrigins = () => {
    const raw = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
        .filter(Boolean)
        .join(',');
    const list = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
    if (list.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
            return ['http://localhost:3000', 'http://127.0.0.1:3000'];
        }
        // Production fallback: include deployed frontend domain so preflight won't fail
        // If you prefer explicit config, set FRONTEND_URL or CORS_ORIGINS in env instead.
        const fallback = process.env.FRONTEND_URL || 'https://www.dugsi.online';
        return [fallback];
    }
    return list;
};

const isAllowedLocalhostOrigin = (origin) => {
    // Flutter Web uses a random localhost port during development. Keep local
    // development enabled by default; production can explicitly disable it.
    if (process.env.CORS_ALLOW_LOCALHOST === 'false') return false;
    try {
        const url = new URL(origin);
        return ['http:', 'https:'].includes(url.protocol)
            && ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch (_) {
        return false;
    }
};

module.exports = {
    getJwtSecret,
    normalizeRole,
    normalizeRoleKey,
    signAccessToken,
    verifyAccessToken,
    cookieOptions,
    accessCookieOptions,
    refreshCookieOptions,
    csrfCookieOptions,
    redactSensitive,
    parseAllowedOrigins,
    isAllowedLocalhostOrigin,
    cryptoRandomToken: (bytes = 32) => crypto.randomBytes(bytes).toString('hex'),
};
