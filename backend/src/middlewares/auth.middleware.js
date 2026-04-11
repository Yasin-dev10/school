const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient');

// Protect routes - Verify JWT
exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            if (!token) {
                return res.status(401).json({ message: 'Not authorized, no token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true, tenantId: true, firstName: true, lastName: true,
                    email: true, role: true, status: true, lastLogin: true,
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

            // Build a profile-compatible shape for controllers
            req.user = {
                ...user,
                _id: user.id,
                role: user.role ? user.role.replace('_', '-') : user.role,
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

            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`
            });
        }
        next();
    };
};
