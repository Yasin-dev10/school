const prisma = require('../config/prismaClient');
const { getTeacherScope, canTeacherAccessStudent } = require('../utils/teacherScope');

// Issue certificate
exports.issueCertificate = async (req, res) => {
    try {
        const { studentId, certificateType, title, description, metadata } = req.body;

        const student = await prisma.user.findFirst({
            where: { id: studentId, tenantId: req.user.tenantId, role: 'student' }
        });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, studentId, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }

        // Generate unique codes
        const crypto = require('crypto');
        const certNumber = 'CERT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const verificationCode = crypto.randomBytes(6).toString('hex').toUpperCase();

        const certificate = await prisma.certificate.create({
            data: {
                studentId,
                tenantId: req.user.tenantId,
                certificateType,
                title,
                description: description || null,
                issuerId: req.user.id,
                certificateNumber: certNumber,
                verificationCode,
                grade: metadata?.grade || null,
                academicYear: metadata?.academicYear || null,
                rank: metadata?.rank || null,
                score: metadata?.score || null,
                examType: metadata?.examType || null
            },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
                issuer: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        res.status(201).json({ status: 'success', data: { certificate } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all certificates for tenant
exports.getAllCertificates = async (req, res) => {
    try {
        let where = { tenantId: req.user.tenantId };
        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, req.user.tenantId);
            if (scope.classFilters.length === 0)
                return res.status(200).json({ status: 'success', results: 0, data: { certificates: [] } });
            where.student = { OR: scope.classFilters };
        }

        const certificates = await prisma.certificate.findMany({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
                issuer: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ status: 'success', results: certificates.length, data: { certificates } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get my certificates (student)
exports.getMyCertificates = async (req, res) => {
    try {
        const certificates = await prisma.certificate.findMany({
            where: { studentId: req.user.id, status: 'active' },
            include: {
                student: { select: { id: true, firstName: true, lastName: true } },
                issuer: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { issueDate: 'desc' }
        });
        res.status(200).json({ status: 'success', results: certificates.length, data: { certificates } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get student certificates by ID
exports.getStudentCertificates = async (req, res) => {
    try {
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, req.params.studentId, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }

        const certificates = await prisma.certificate.findMany({
            where: { studentId: req.params.studentId, tenantId: req.user.tenantId },
            include: {
                student: { select: { id: true, firstName: true, lastName: true } },
                issuer: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { issueDate: 'desc' }
        });
        res.status(200).json({ status: 'success', results: certificates.length, data: { certificates } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify certificate (public)
exports.verifyCertificate = async (req, res) => {
    try {
        const certificate = await prisma.certificate.findFirst({
            where: { verificationCode: req.params.code.toUpperCase() },
            include: { student: { select: { id: true, firstName: true, lastName: true } } }
        });

        if (!certificate) return res.status(404).json({ message: 'Invalid certificate verification code' });

        const tenant = await prisma.tenant.findUnique({ where: { tenantId: certificate.tenantId } });

        res.status(200).json({
            status: 'success',
            data: {
                isValid: true,
                certificate: {
                    title: certificate.title,
                    studentName: `${certificate.student.firstName} ${certificate.student.lastName}`,
                    schoolName: tenant ? tenant.name : 'Unknown Institution',
                    issueDate: certificate.issueDate,
                    type: certificate.certificateType,
                    status: certificate.status
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Revoke certificate
exports.revokeCertificate = async (req, res) => {
    try {
        const cert = await prisma.certificate.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });
        if (req.user.role === 'teacher' && cert.issuerId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only update certificates you issued' });

        const updated = await prisma.certificate.update({ where: { id: req.params.id }, data: { status: 'revoked' } });
        res.status(200).json({ status: 'success', data: { certificate: updated } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update certificate
exports.updateCertificate = async (req, res) => {
    try {
        const cert = await prisma.certificate.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        const { title, description, status } = req.body;
        const updated = await prisma.certificate.update({
            where: { id: req.params.id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(status && { status })
            }
        });
        res.status(200).json({ status: 'success', data: { certificate: updated } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete certificate
exports.deleteCertificate = async (req, res) => {
    try {
        const cert = await prisma.certificate.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!cert) return res.status(404).json({ message: 'Certificate not found' });

        await prisma.certificate.delete({ where: { id: req.params.id } });
        res.status(204).json({ status: 'success', data: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
