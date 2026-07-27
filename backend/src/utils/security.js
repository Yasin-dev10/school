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
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '1d' });
};

const verifyAccessToken = (token) => {
    return jwt.verify(token, getJwtSecret());
};

const cookieOptions = () => {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
    };
};

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
    const raw = process.env.FRONTEND_URL || process.env.CORS_ORIGINS || '';
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 0 && process.env.NODE_ENV !== 'production') {
        return ['http://localhost:3000', 'http://127.0.0.1:3000'];
    }
    return list;
};

module.exports = {
    getJwtSecret,
    normalizeRole,
    normalizeRoleKey,
    signAccessToken,
    verifyAccessToken,
    cookieOptions,
    redactSensitive,
    parseAllowedOrigins,
    cryptoRandomToken: (bytes = 32) => crypto.randomBytes(bytes).toString('hex'),
};
