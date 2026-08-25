const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

module.exports = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    // Native clients authenticate with an Authorization header and are not
    // susceptible to browser cookie CSRF.
    if (req.headers.authorization?.startsWith('Bearer ')) return next();
    if (!req.cookies?.token && !req.cookies?.refreshToken) return next();
    const cookieToken = req.cookies.csrfToken;
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
    }
    next();
};
