const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const { emitToTenant } = require('../config/socket');

// @desc    Create assignment
exports.createAssignment = async (req, res) => {
    try {
        const { title, description, classId, subjectId, dueDate, status } = req.body;
        const tenantId = req.user.tenantId;

        const assignment = await prisma.assignment.create({
            data: {
                title, description,
                classId, subjectId: subjectId || null,
                teacherId: req.user.id,
                dueDate: new Date(dueDate),
                status: status || 'published',
                tenantId
            },
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        emitToTenant(tenantId, 'assignment:created', assignment);
        res.status(201).json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assignments
exports.getAssignments = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        let where = { tenantId };

        if (role === 'teacher') {
            where.teacherId = req.user.id;
        } else if (role === 'student') {
            if (req.user.profile?.class) {
                const cls = await prisma.class.findFirst({ where: { name: req.user.profile.class, tenantId } });
                if (cls) where.classId = cls.id;
            }
            where.status = 'published';
        }

        const { classId, subjectId } = req.query;
        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;

        const assignments = await prisma.assignment.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } },
                submissions: role === 'student'
                    ? { where: { studentId: req.user.id }, select: { id: true, status: true, grade: true, submittedAt: true } }
                    : { select: { id: true, status: true } }
            },
            orderBy: { dueDate: 'asc' }
        });

        res.status(200).json({ success: true, count: assignments.length, data: assignments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get assignment by ID
exports.getAssignmentById = async (req, res) => {
    try {
        const assignment = await prisma.assignment.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } },
                submissions: {
                    include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
                }
            }
        });
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        res.status(200).json({ success: true, data: assignment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update assignment
exports.updateAssignment = async (req, res) => {
    try {
        const exists = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Assignment not found' });

        const { title, description, classId, subjectId, dueDate, status } = req.body;
        const updated = await prisma.assignment.update({
            where: { id: req.params.id },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(classId && { classId }),
                ...(subjectId !== undefined && { subjectId }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
                ...(status && { status })
            }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete assignment
exports.deleteAssignment = async (req, res) => {
    try {
        const exists = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Assignment not found' });

        await prisma.assignment.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit assignment
exports.submitAssignment = async (req, res) => {
    try {
        const { assignmentId, content, filePath } = req.body;
        const tenantId = req.user.tenantId;

        const submission = await prisma.submission.upsert({
            where: {
                // No unique index on submission directly, use findFirst + create
                id: 'none' // Trick: will always fail unique, fall through to create
            },
            update: {},
            create: {
                assignmentId,
                studentId: req.user.id,
                tenantId,
                content: content || null,
                filePath: filePath || null,
                status: 'submitted'
            }
        }).catch(async () => {
            // Upsert trick didn't work, just create
            return prisma.submission.create({
                data: {
                    assignmentId,
                    studentId: req.user.id,
                    tenantId,
                    content: content || null,
                    filePath: filePath || null,
                    status: 'submitted'
                }
            });
        });

        res.status(201).json({ success: true, data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Grade submission
exports.gradeSubmission = async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        const updated = await prisma.submission.update({
            where: { id: req.params.id },
            data: { grade, feedback, status: 'graded' }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: { assignmentId: req.params.id, tenantId: req.user.tenantId },
            include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
        });
        res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

