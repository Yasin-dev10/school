const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const { emitToTenant } = require('../config/socket');
const { canTeacherAccessClassSubject } = require('../utils/teacherScope');

// @desc    Create assignment
exports.createAssignment = async (req, res) => {
    try {
        const { title, description, classId, subjectId, dueDate, status } = req.body;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            if (!subjectId) return res.status(400).json({ success: false, message: 'Subject is required' });
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

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
        if (req.user.role === 'teacher' && exists.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only update your own assignments' });

        const { title, description, classId, subjectId, dueDate, status } = req.body;
        const targetClassId = classId || exists.classId;
        const targetSubjectId = subjectId !== undefined ? subjectId : exists.subjectId;

        if (req.user.role === 'teacher') {
            if (!targetSubjectId) return res.status(400).json({ success: false, message: 'Subject is required' });
            const allowed = await canTeacherAccessClassSubject(req.user.id, targetClassId, targetSubjectId, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

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
        if (req.user.role === 'teacher' && exists.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only delete your own assignments' });
        if (exists.status !== 'draft')
            return res.status(400).json({ success: false, message: 'Only draft assignments can be deleted' });

        await prisma.assignment.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit assignment
exports.submitAssignment = async (req, res) => {
    try {
        const assignmentId = req.params.id || req.body.assignmentId;
        const { content } = req.body;
        const tenantId = req.user.tenantId;

        if (!assignmentId) {
            return res.status(400).json({ success: false, message: 'Assignment ID is required' });
        }

        const assignment = await prisma.assignment.findFirst({
            where: { id: assignmentId, tenantId }
        });
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }
        if (assignment.status === 'closed' || new Date(assignment.dueDate).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: 'Assignment deadline has passed' });
        }

        // Only accept server-side uploaded file path — never client-supplied paths
        const filePath = req.file ? req.file.path.replace(/\\/g, '/') : null;

        const existing = await prisma.submission.findFirst({
            where: { assignmentId, studentId: req.user.id, tenantId }
        });

        let submission;
        if (existing) {
            submission = await prisma.submission.update({
                where: { id: existing.id },
                data: {
                    content: content || existing.content,
                    ...(filePath && { filePath }),
                    status: 'submitted',
                    submittedAt: new Date()
                }
            });
        } else {
            submission = await prisma.submission.create({
                data: {
                    assignmentId,
                    studentId: req.user.id,
                    tenantId,
                    content: content || null,
                    filePath,
                    status: 'submitted'
                }
            });
        }

        res.status(201).json({ success: true, data: submission });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Grade submission
exports.gradeSubmission = async (req, res) => {
    try {
        const { grade, feedback } = req.body;
        const submission = await prisma.submission.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { assignment: true }
        });
        if (!submission) return res.status(404).json({ message: 'Submission not found' });
        if (req.user.role === 'teacher' && submission.assignment.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only grade submissions for your own assignments' });

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
        const assignment = await prisma.assignment.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
        if (req.user.role === 'teacher' && assignment.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only view submissions for your own assignments' });

        const submissions = await prisma.submission.findMany({
            where: { assignmentId: req.params.id, tenantId: req.user.tenantId },
            include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
        });
        res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

