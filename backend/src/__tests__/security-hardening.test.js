const jwt = require('jsonwebtoken');
const csrfProtection = require('../middlewares/csrf.middleware');
const { signAccessToken } = require('../utils/security');

describe('security hardening', () => {
    beforeAll(() => { process.env.JWT_SECRET = 'test-only-strong-secret-with-more-than-32-characters'; });

    test('access tokens are short lived', () => {
        const token = signAccessToken({ id: 'user-1' });
        const decoded = jwt.decode(token);
        expect(decoded.exp - decoded.iat).toBeLessThanOrEqual(15 * 60);
    });

    test('rejects cookie-authenticated writes without matching CSRF header', () => {
        const req = { method: 'POST', headers: {}, cookies: { token: 'access', csrfToken: 'expected' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();
        csrfProtection(req, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('allows cookie-authenticated writes with matching CSRF header', () => {
        const req = { method: 'POST', headers: { 'x-csrf-token': 'expected' }, cookies: { token: 'access', csrfToken: 'expected' } };
        const res = {};
        const next = jest.fn();
        csrfProtection(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('native bearer requests do not require CSRF tokens', () => {
        const req = { method: 'POST', headers: { authorization: 'Bearer native-token' }, cookies: {} };
        const next = jest.fn();
        csrfProtection(req, {}, next);
        expect(next).toHaveBeenCalled();
    });
});
