/** Shared PostgreSQL limiter in production; memory only in development/test. */
const crypto = require('crypto');
const prisma = require('../config/prismaClient');
const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20, message } = {}) => {
    return async (req, res, next) => {
        const key = crypto.createHash('sha256').update(`${req.ip}:${req.baseUrl}${req.path}`).digest('hex');
        try {
            let count;
            if (process.env.NODE_ENV === 'production') {
                const rows = await prisma.$queryRaw`
                    INSERT INTO "api_rate_limits" ("key", "count", "resetAt")
                    VALUES (${key}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'))
                    ON CONFLICT ("key") DO UPDATE SET
                      "count" = CASE WHEN "api_rate_limits"."resetAt" <= NOW() THEN 1 ELSE "api_rate_limits"."count" + 1 END,
                      "resetAt" = CASE WHEN "api_rate_limits"."resetAt" <= NOW() THEN NOW() + (${windowMs} * INTERVAL '1 millisecond') ELSE "api_rate_limits"."resetAt" END
                    RETURNING "count"`;
                count = Number(rows[0].count);
            } else {
                const now = Date.now();
                let entry = buckets.get(key);
                if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
                entry.count += 1;
                buckets.set(key, entry);
                count = entry.count;
            }
            if (count > max) {
                return res.status(429).json(typeof message === 'object' ? message : { message: message || 'Too many requests' });
            }
            next();
        } catch (error) {
            console.error('Rate limiter unavailable:', error.message);
            if (process.env.NODE_ENV === 'production') return res.status(503).json({ message: 'Security service temporarily unavailable' });
            next();
        }
    };
};

module.exports = rateLimit;
