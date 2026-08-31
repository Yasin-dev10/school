const prisma = require('../config/prismaClient');
const { verifyAccessToken, normalizeRole } = require('../utils/security');
const { isRevoked } = require('../utils/tokenStore');
const { MODULE_BY_BASE_URL, ALWAYS_ALLOWED_BASE_URLS, effectiveAccess } = require('../utils/subscriptionAccess');
const { logAction } = require('../utils/logger');

const extractToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    }
    if (req.cookies?.token) return req.cookies.token;
    return null;
};
exports.extractToken = extractToken;

// Protect routes - Verify JWT
exports.protect = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        if (isRevoked(token)) {
            return res.status(401).json({ message: 'Not authorized, token revoked' });
        }

        const decoded = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true, tenantId: true, firstName: true, lastName: true,
                email: true, username: true, role: true, status: true, lastLogin: true,
                tokenVersion: true,
                phone: true, profileAddress: true, avatarUrl: true,
                designation: true, admissionNo: true, studentId: true,
                rollNo: true, profileClass: true, profileSection: true,
                gender: true, dob: true, parentRelationship: true,
                qualification: true, salary: true, stripeCustomerId: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is not active' });
        }

        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            return res.status(401).json({ message: 'Not authorized, token revoked' });
        }

        req.token = token;
        req.user = {
            ...user,
            _id: user.id,
            role: normalizeRole(user.role),
            profile: {
                phone: user.phone,
                address: user.profileAddress,
                avatarUrl: user.avatarUrl,
                designation: user.designation,
                admissionNo: user.admissionNo,
                studentId: user.studentId,
                rollNo: user.rollNo,
                class: user.profileClass,
                section: user.profileSection,
                gender: user.gender,
                dob: user.dob,
                parentRelationship: user.parentRelationship,
                qualification: user.qualification,
                salary: user.salary,
                stripeCustomerId: user.stripeCustomerId
            }
        };

        if (req.user.role !== 'super-admin' && req.user.tenantId) {
            const tenant = await prisma.tenant.findUnique({ where: { tenantId: req.user.tenantId } });
            if (!tenant) return res.status(403).json({ code: 'SCHOOL_NOT_FOUND', message: 'School not found' });

            const access = effectiveAccess(tenant);
            req.subscription = { tenant, ...access };

            if (access.graceExpired && tenant.autoSuspend !== false && tenant.accessMode !== 'suspended') {
                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: { accessMode: 'suspended', subscriptionActive: false, status: 'suspended' }
                });
                await logAction({
                    action: 'SUSPEND', module: 'SUBSCRIPTION', tenantId: tenant.tenantId,
                    userId: req.user.id,
                    details: `School automatically suspended after subscription deadline and ${tenant.graceDays} grace day(s).`,
                    ip: req.ip, userAgent: req.get('user-agent') || ''
                });
            }

            const moduleName = MODULE_BY_BASE_URL[req.baseUrl];
            const isAlwaysAllowed = ALWAYS_ALLOWED_BASE_URLS.has(req.baseUrl);
            if (!isAlwaysAllowed && access.mode === 'suspended') {
                return res.status(402).json({
                    code: 'SUBSCRIPTION_SUSPENDED',
                    message: 'Mudadii lacag-bixinta school-ka ayaa dhammaatay. Fadlan la xiriir maamulka.',
                    subscription: access
                });
            }
            if (!isAlwaysAllowed && access.mode === 'limited' && (!moduleName || !tenant.allowedModules.includes(moduleName))) {
                return res.status(403).json({
                    code: 'SUBSCRIPTION_MODULE_RESTRICTED',
                    message: 'Qaybtan kuma jirto adeegyada hadda loo fasaxay school-ka.',
                    module: moduleName,
                    subscription: access
                });
            }
        }

        return next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Grant access to specific roles (hyphen or underscore accepted in args)
exports.authorize = (...roles) => {
    const allowed = roles.map((r) => normalizeRole(r));
    return (req, res, next) => {
        if (!req.user || !allowed.includes(normalizeRole(req.user.role))) {
            return res.status(403).json({
                message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`
            });
        }
        next();
    };
};
