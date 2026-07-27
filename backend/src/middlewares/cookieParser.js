/** Lightweight cookie parser (avoids hard dependency if package missing). */
module.exports = function cookieParser() {
    return (req, res, next) => {
        req.cookies = {};
        const header = req.headers.cookie;
        if (header) {
            for (const part of header.split(';')) {
                const idx = part.indexOf('=');
                if (idx === -1) continue;
                const key = part.slice(0, idx).trim();
                const val = part.slice(idx + 1).trim();
                try {
                    req.cookies[key] = decodeURIComponent(val);
                } catch {
                    req.cookies[key] = val;
                }
            }
        }

        if (typeof res.cookie !== 'function') {
            res.cookie = (name, value, options = {}) => {
                const parts = [`${name}=${encodeURIComponent(value)}`];
                if (options.maxAge != null) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
                if (options.path) parts.push(`Path=${options.path}`);
                if (options.httpOnly) parts.push('HttpOnly');
                if (options.secure) parts.push('Secure');
                if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
                const prev = res.getHeader('Set-Cookie');
                const list = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
                list.push(parts.join('; '));
                res.setHeader('Set-Cookie', list);
                return res;
            };
        }

        if (typeof res.clearCookie !== 'function') {
            res.clearCookie = (name, options = {}) => {
                return res.cookie(name, '', { ...options, maxAge: 0 });
            };
        }

        next();
    };
};
