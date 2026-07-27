/** Simple in-memory rate limiter for login and sensitive POSTs. */
const buckets = new Map();

const rateLimit = ({ windowMs = 15 * 60 * 1000, max = 20, message } = {}) => {
    return (req, res, next) => {
        const key = `${req.ip}:${req.path}`;
        const now = Date.now();
        let entry = buckets.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            buckets.set(key, entry);
        }
        entry.count += 1;
        if (entry.count > max) {
            return res.status(429).json(
                typeof message === 'object' ? message : { message: message || 'Too many requests' }
            );
        }
        next();
    };
};

module.exports = rateLimit;
