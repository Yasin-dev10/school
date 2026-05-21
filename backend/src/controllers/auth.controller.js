const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password, tenantId } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase().trim() },
            select: {
                id: true,
                tenantId: true,
                firstName: true,
                lastName: true,
                email: true,
                password: true,
                role: true,
                phone: true,
                profileAddress: true,
                avatarUrl: true,
                profileClass: true,
                profileSection: true
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (tenantId && user.role !== 'super_admin' && user.tenantId !== tenantId) {
            return res.status(403).json({ message: 'You are not registered in this school.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update lastLogin
        await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

        const mappedRole = user.role.replace('_', '-');
        const payload = { id: user.id, role: mappedRole, tenantId: user.tenantId };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({
            success: true,
            token,
            user: {
                _id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: mappedRole,
                tenantId: user.tenantId,
                profile: {
                    phone: user.phone,
                    address: user.profileAddress,
                    avatarUrl: user.avatarUrl,
                    class: user.profileClass,
                    section: user.profileSection
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server Error during login', error: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, firstName: true, lastName: true, email: true,
                role: true, tenantId: true, status: true, lastLogin: true,
                phone: true, profileAddress: true, avatarUrl: true,
                designation: true, admissionNo: true, studentId: true,
                rollNo: true, profileClass: true, profileSection: true,
                gender: true, dob: true, qualification: true
            }
        });
        if (user) user.role = user.role.replace('_', '-');
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, address } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(phone && { phone }),
                ...(address && { profileAddress: address })
            }
        });

        res.status(200).json({ success: true, message: 'Profile updated successfully', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashed, passwordPlain: newPassword }
        });

        res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};
