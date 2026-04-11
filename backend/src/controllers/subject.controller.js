const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

// @desc    Create subject
exports.createSubject = async (req, res) => {
    try {
        const { name, code, gradeLevels, type, credits, description, teachers } = req.body;
        const tenantId = req.user.tenantId;

        const exists = await prisma.subject.findFirst({ where: { name, code, tenantId } });
        if (exists) return res.status(400).json({ message: 'Subject already exists' });

        const subject = await prisma.subject.create({
            data: {
                name, code, tenantId,
                gradeLevels: gradeLevels || ['elementary', 'middle', 'high'],
                type: type || 'theory',
                credits: credits || 3,
                description: description || null,
                ...(teachers?.length > 0 && {
                    teachers: { create: teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
                })
            },
            include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }, resources: true }
        });

        await logAction({ action: 'CREATE', module: 'USER', details: `Created subject: ${name}`, userId: req.user._id, tenantId });
        res.status(201).json({ success: true, data: formatSubject(subject) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all subjects
exports.getSubjects = async (req, res) => {
    try {
        const subjects = await prisma.subject.findMany({
            where: { tenantId: req.user.tenantId },
            include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }, resources: true },
            orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, count: subjects.length, data: subjects.map(formatSubject) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get subject by ID
exports.getSubjectById = async (req, res) => {
    try {
        const subject = await prisma.subject.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }, resources: true }
        });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        res.status(200).json({ success: true, data: formatSubject(subject) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update subject
exports.updateSubject = async (req, res) => {
    try {
        const exists = await prisma.subject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Subject not found' });

        const { name, code, gradeLevels, type, credits, description, teachers } = req.body;

        if (teachers !== undefined) {
            await prisma.subjectTeacher.deleteMany({ where: { subjectId: req.params.id } });
        }

        const updated = await prisma.subject.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(gradeLevels && { gradeLevels }),
                ...(type && { type }),
                ...(credits !== undefined && { credits }),
                ...(description !== undefined && { description }),
                ...(teachers !== undefined && teachers.length > 0 && {
                    teachers: { create: teachers.map(tId => ({ teacher: { connect: { id: tId } } })) }
                })
            },
            include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }, resources: true }
        });

        res.status(200).json({ success: true, data: formatSubject(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete subject
exports.deleteSubject = async (req, res) => {
    try {
        const subject = await prisma.subject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        await prisma.subject.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const formatSubject = (s) => ({
    ...s,
    _id: s.id,
    teachers: s.teachers?.map(t => t.teacher) || []
});

// @desc    Add resource to subject
exports.addResource = async (req, res) => {
    try {
        const { title, url, type } = req.body;
        const exists = await prisma.subject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Subject not found' });

        const resource = await prisma.subjectResource.create({
            data: {
                title, url, type: type || 'link',
                subject: { connect: { id: req.params.id } }
            }
        });

        res.status(201).json({ success: true, data: resource });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove resource from subject
exports.removeResource = async (req, res) => {
    try {
        const resourceId = req.params.resourceId;
        const subjectExists = await prisma.subject.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!subjectExists) return res.status(404).json({ message: 'Subject not found' });

        const resource = await prisma.subjectResource.findFirst({ where: { id: resourceId, subjectId: req.params.id } });
        if (!resource) return res.status(404).json({ message: 'Resource not found' });

        await prisma.subjectResource.delete({ where: { id: resourceId } });
        res.status(200).json({ success: true, message: 'Resource removed successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
