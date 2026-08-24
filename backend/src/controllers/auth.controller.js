const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendEmail } = require('../services/notification.service');
const {
    signAccessToken,
    normalizeRole,
    cookieOptions,
} = require('../utils/security');
const { revokeToken } = require('../utils/tokenStore');

const buildAuthUser = (user) => ({
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    role: normalizeRole(user.role),
    tenantId: user.tenantId,
    profile: {
        phone: user.phone,
        address: user.profileAddress,
        avatarUrl: user.avatarUrl,
        class: user.profileClass,
        section: user.profileSection
    }
});

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { identifier, email, username, password, tenantId } = req.body;
    const loginId = String(identifier || username || email || '').trim();

    if (!loginId || !password) {
        return res.status(400).json({ message: 'Please provide username/email and password' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: { equals: loginId, mode: 'insensitive' } },
                    { email: loginId.toLowerCase() },
                    { studentId: { equals: loginId, mode: 'insensitive' } },
                    { admissionNo: { equals: loginId, mode: 'insensitive' } }
                ]
            },
            select: {
                id: true,
                tenantId: true,
                firstName: true,
                lastName: true,
                email: true,
                username: true,
                password: true,
                role: true,
                status: true,
                tokenVersion: true,
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

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is not active' });
        }

        if (tenantId && user.role !== 'super_admin' && user.tenantId !== tenantId) {
            return res.status(403).json({ message: 'You are not registered in this school.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

        const mappedRole = normalizeRole(user.role);
        const payload = {
            id: user.id,
            role: mappedRole,
            tenantId: user.tenantId,
            tokenVersion: user.tokenVersion
        };
        const token = signAccessToken(payload);

        res.cookie('token', token, cookieOptions());

        res.json({
            success: true,
            token,
            user: buildAuthUser({ ...user, role: mappedRole })
        });
    } catch (error) {
        console.error('Login error:', error);
        const message = error.message?.includes('JWT_SECRET')
            ? 'Server misconfiguration'
            : 'Server Error during login';
        res.status(500).json({ message });
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
                id: true, firstName: true, lastName: true, email: true, username: true,
                role: true, tenantId: true, status: true, lastLogin: true,
                phone: true, profileAddress: true, avatarUrl: true,
                designation: true, admissionNo: true, studentId: true,
                rollNo: true, profileClass: true, profileSection: true,
                gender: true, dob: true, qualification: true
            }
        });
        if (user) user.role = normalizeRole(user.role);
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
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
            },
            select: {
                id: true, firstName: true, lastName: true, email: true, username: true,
                role: true, tenantId: true, phone: true, profileAddress: true,
                avatarUrl: true, profileClass: true, profileSection: true
            }
        });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { ...updated, role: normalizeRole(updated.role), _id: updated.id }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashed, tokenVersion: { increment: 1 } }
        });

        if (req.token) {
            revokeToken(req.token, Date.now() + 24 * 60 * 60 * 1000);
        }
        res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });

        res.status(200).json({ success: true, message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
    try {
        if (req.user?.id) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { tokenVersion: { increment: 1 } }
            });
        }
        if (req.token) {
            revokeToken(req.token, Date.now() + 24 * 60 * 60 * 1000);
        }
        res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        const user = await prisma.user.findFirst({ where: { email, status: 'active' } });
        const genericMessage = 'If an active account exists, password reset instructions have been sent.';
        if (!user) return res.json({ success: true, message: genericMessage });

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000)
            }
        });
        const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const resetUrl = `${frontendUrl}/forgot-password?token=${encodeURIComponent(token)}`;
        const delivered = await sendEmail(
            user.email,
            'Reset your School Registry password',
            `Reset your password within 30 minutes: ${resetUrl}`,
            `<p>Hello ${user.firstName},</p><p>Use this link within 30 minutes to reset your password:</p><p><a href="${resetUrl}">Reset password</a></p>`
        );
        if (!delivered) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetPasswordTokenHash: null, resetPasswordExpires: null }
            });
            return res.status(503).json({ success: false, message: 'Password email service is not configured. Contact your administrator.' });
        }
        res.json({ success: true, message: genericMessage });
    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({ success: false, message: 'Could not process password reset request' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password || String(password).length < 8) {
            return res.status(400).json({ success: false, message: 'A valid token and password of at least 8 characters are required' });
        }
        const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordTokenHash: tokenHash,
                resetPasswordExpires: { gt: new Date() },
                status: 'active'
            }
        });
        if (!user) return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired' });

        const passwordHash = await bcrypt.hash(String(password), 12);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: passwordHash,
                tokenVersion: { increment: 1 },
                resetPasswordTokenHash: null,
                resetPasswordExpires: null
            }
        });
        res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not reset password' });
    }
};
