const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const generatePassword = require('../utils/generatePassword');
const { emitToTenant } = require('../config/socket');
const { normalizeRole } = require('../utils/security');

const teacherSelect = {
    id: true, tenantId: true, firstName: true, lastName: true,
    email: true, role: true, status: true, phone: true,
    designation: true, qualification: true, salary: true, avatarUrl: true,
    createdAt: true, updatedAt: true
};

const formatTeacher = (teacher) => {
    if (!teacher) return null;

    return {
        ...teacher,
        _id: teacher.id,
        role: normalizeRole(teacher.role),
        profile: {
            phone: teacher.phone,
            designation: teacher.designation,
            qualification: teacher.qualification,
            salary: teacher.salary,
            avatarUrl: teacher.avatarUrl
        }
    };
};

exports.createTeacher = async (req, res) => {
    try {
        const { firstName, lastName, email, password, profile } = req.body;
        const tenantId = req.user.tenantId;

        const exists = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
        if (exists) return res.status(400).json({ message: 'User with this email already exists' });

        const generatedPassword = password || generatePassword();
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(generatedPassword, salt);

        const teacher = await prisma.user.create({
            data: {
                firstName, lastName,
                email: email.toLowerCase(),
                password: hashed,
                role: 'teacher', tenantId,
                phone: profile?.phone || null,
                designation: profile?.designation || null,
                qualification: profile?.qualification || null,
                salary: profile?.salary || null,
                avatarUrl: profile?.avatarUrl || null
            },
            select: teacherSelect
        });

        const formattedTeacher = formatTeacher(teacher);

        await logAction({ action: 'CREATE', module: 'USER', details: `Created teacher: ${firstName} ${lastName}`, userId: req.user._id, tenantId });
        emitToTenant(tenantId, 'teacher:created', formattedTeacher);

        res.status(201).json({ success: true, data: formattedTeacher, tempPassword: generatedPassword });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTeachers = async (req, res) => {
    try {
        const teachers = await prisma.user.findMany({
            where: { tenantId: req.user.tenantId, role: 'teacher' },
            select: teacherSelect,
            orderBy: { firstName: 'asc' }
        });
        res.status(200).json({ success: true, count: teachers.length, data: teachers.map(formatTeacher) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getTeacherById = async (req, res) => {
    try {
        const teacher = await prisma.user.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId, role: 'teacher' },
            select: teacherSelect
        });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        res.status(200).json({ success: true, data: formatTeacher(teacher) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateTeacher = async (req, res) => {
    try {
        const exists = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'teacher' } });
        if (!exists) return res.status(404).json({ message: 'Teacher not found' });

        const { firstName, lastName, email, status, profile } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email: email.toLowerCase() }),
                ...(status && { status }),
                ...(profile?.phone !== undefined && { phone: profile.phone }),
                ...(profile?.designation !== undefined && { designation: profile.designation }),
                ...(profile?.qualification !== undefined && { qualification: profile.qualification }),
                ...(profile?.salary !== undefined && { salary: profile.salary }),
                ...(profile?.avatarUrl !== undefined && { avatarUrl: profile.avatarUrl })
            },
            select: teacherSelect
        });

        await logAction({ action: 'UPDATE', module: 'USER', details: `Updated teacher: ${updated.firstName} ${updated.lastName}`, userId: req.user._id, tenantId: req.user.tenantId });
        res.status(200).json({ success: true, data: formatTeacher(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'teacher' } });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        await prisma.user.delete({ where: { id: req.params.id } });

        await logAction({ action: 'DELETE', module: 'USER', details: `Deleted teacher: ${teacher.firstName} ${teacher.lastName}`, userId: req.user._id, tenantId: req.user.tenantId });
        res.status(200).json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resetTeacherPassword = async (req, res) => {
    try {
        const teacher = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'teacher' } });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        const newPassword = generatePassword();
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: req.params.id },
            data: { password: hashed, tokenVersion: { increment: 1 } }
        });

        res.status(200).json({ success: true, message: 'Password reset successfully', password: newPassword });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkRegisterTeachers = async (req, res) => {
    try {
        const { teachers } = req.body;
        const tenantId = req.user.tenantId;

        if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
            return res.status(400).json({ message: 'Please provide an array of teachers' });
        }

        const addedTeachers = [];
        const errors = [];

        for (const teacherData of teachers) {
            try {
                const existing = await prisma.user.findFirst({ where: { email: teacherData.email.toLowerCase() } });
                if (existing) {
                    errors.push({ email: teacherData.email, error: 'Email already exists' });
                    continue;
                }

                const generatedPassword = generatePassword();
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(generatedPassword, salt);

                const teacher = await prisma.user.create({
                    data: {
                        firstName: teacherData.firstName,
                        lastName: teacherData.lastName,
                        email: teacherData.email.toLowerCase(),
                        password: hashed,
                        role: 'teacher',
                        tenantId,
                        phone: teacherData.phone || null,
                        designation: teacherData.designation || null,
                        qualification: teacherData.qualification || null,
                        salary: teacherData.salary || null
                    },
                    select: teacherSelect
                });

                addedTeachers.push({ ...formatTeacher(teacher), tempPassword: generatedPassword });
            } catch (err) {
                errors.push({ email: teacherData.email, error: err.message });
            }
        }

        if (addedTeachers.length > 0) {
            await logAction({ action: 'CREATE', module: 'USER', details: `Bulk created ${addedTeachers.length} teachers`, userId: req.user._id, tenantId });
        }

        res.status(201).json({
            success: true,
            added: addedTeachers.length,
            data: addedTeachers,
            errors,
            summary: {
                total: teachers.length,
                success: addedTeachers.length,
                failed: errors.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
