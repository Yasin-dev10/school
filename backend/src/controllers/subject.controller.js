const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const { canTeacherAccessSubject } = require('../utils/teacherScope');

const VALID_GRADE_LEVELS = new Set(['elementary', 'middle', 'high']);
const VALID_SUBJECT_TYPES = new Set(['theory', 'practical', 'both']);

const normalizeTeacherIds = (teachers) => {
    if (teachers === undefined) return undefined;
    if (!Array.isArray(teachers)) return null;

    const ids = teachers
        .map(t => {
            if (typeof t === 'string') return t;
            if (t && typeof t === 'object') return t._id || t.id;
            return null;
        })
        .filter(Boolean);

    return [...new Set(ids)];
};

const normalizeGradeLevels = (body) => {
    const gradeLevels = body.gradeLevels ?? body.gradeLevel;
    if (gradeLevels === undefined) return undefined;
    if (!Array.isArray(gradeLevels)) return null;

    const levels = [...new Set(gradeLevels)].filter(level => VALID_GRADE_LEVELS.has(level));
    return levels.length > 0 ? levels : null;
};

const teacherSubjectWhere = (teacherId, tenantId) => ({
    tenantId,
    OR: [
        { teachers: { some: { teacherId } } },
        { classSubjects: { some: { teachers: { some: { teacherId } } } } },
        { timetables: { some: { teachers: { some: { teacherId } } } } }
    ]
});

const getSubjectDeletionImpact = async (client, subjectId, tenantId) => {
    const where = { subjectId, tenantId };
    const [assignments, examComplaints, attendances, marks, materials, timetables, resources, teachers, classSubjects] = await Promise.all([
        client.assignment.count({ where }),
        client.examComplaint.count({ where }),
        client.attendance.count({ where }),
        client.mark.count({ where }),
        client.material.count({ where }),
        client.timetable.count({ where }),
        client.subjectResource.count({ where: { subjectId } }),
        client.subjectTeacher.count({ where: { subjectId } }),
        client.classSubject.count({ where: { subjectId } })
    ]);

    return {
        preserved: { assignments, attendances },
        deleted: { examComplaints, marks, materials, timetables, resources, teachers, classSubjects },
        totalAffected: assignments + examComplaints + attendances + marks + materials + timetables + resources + teachers + classSubjects
    };
};

// @desc    Create subject
exports.createSubject = async (req, res) => {
    try {
        const { name, code, type, credits, description } = req.body;
        const tenantId = req.user.tenantId;
        const normalizedGradeLevels = normalizeGradeLevels(req.body);
        const gradeLevels = normalizedGradeLevels === undefined ? ['elementary', 'middle', 'high'] : normalizedGradeLevels;
        const teacherIds = normalizeTeacherIds(req.body.teachers);

        if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });
        if (gradeLevels === null) return res.status(400).json({ success: false, message: 'Grade levels must include elementary, middle, or high' });
        if (type && !VALID_SUBJECT_TYPES.has(type)) return res.status(400).json({ success: false, message: 'Invalid subject type' });
        if (teacherIds === null) return res.status(400).json({ success: false, message: 'Teachers must be an array of teacher IDs' });

        const exists = await prisma.subject.findFirst({ where: { name, code, tenantId } });
        if (exists) return res.status(400).json({ message: 'Subject already exists' });

        if (teacherIds?.length > 0) {
            const foundTeachers = await prisma.user.count({
                where: { id: { in: teacherIds }, tenantId, role: 'teacher' }
            });
            if (foundTeachers !== teacherIds.length) return res.status(400).json({ success: false, message: 'One or more selected teachers were not found' });
        }

        const subject = await prisma.subject.create({
            data: {
                name, code, tenantId,
                gradeLevels,
                type: type || 'theory',
                credits: credits || 3,
                description: description || null,
                ...(teacherIds?.length > 0 && {
                    teachers: { create: teacherIds.map(tId => ({ teacher: { connect: { id: tId } } })) }
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
        const where = req.user.role === 'teacher'
            ? teacherSubjectWhere(req.user.id, req.user.tenantId)
            : { tenantId: req.user.tenantId };

        const subjects = await prisma.subject.findMany({
            where,
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
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessSubject(req.user.id, req.params.id, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this subject' });
        }

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

        const { name, code, type, credits, description } = req.body;
        const gradeLevels = normalizeGradeLevels(req.body);
        const teacherIds = normalizeTeacherIds(req.body.teachers);

        if (gradeLevels === null) return res.status(400).json({ success: false, message: 'Grade levels must include elementary, middle, or high' });
        if (type && !VALID_SUBJECT_TYPES.has(type)) return res.status(400).json({ success: false, message: 'Invalid subject type' });
        if (teacherIds === null) return res.status(400).json({ success: false, message: 'Teachers must be an array of teacher IDs' });

        if (teacherIds?.length > 0) {
            const foundTeachers = await prisma.user.count({
                where: { id: { in: teacherIds }, tenantId: req.user.tenantId, role: 'teacher' }
            });
            if (foundTeachers !== teacherIds.length) return res.status(400).json({ success: false, message: 'One or more selected teachers were not found' });
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (teacherIds !== undefined) {
                await tx.subjectTeacher.deleteMany({ where: { subjectId: req.params.id } });
            }

            return tx.subject.update({
                where: { id: req.params.id },
                data: {
                    ...(name && { name }),
                    ...(code && { code }),
                    ...(gradeLevels && { gradeLevels }),
                    ...(type && { type }),
                    ...(credits !== undefined && { credits }),
                    ...(description !== undefined && { description }),
                    ...(teacherIds !== undefined && teacherIds.length > 0 && {
                        teachers: { create: teacherIds.map(tId => ({ teacher: { connect: { id: tId } } })) }
                    })
                },
                include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }, resources: true }
            });
        });

        res.status(200).json({ success: true, data: formatSubject(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Preview every record affected by deleting a subject
exports.getSubjectDeletionImpact = async (req, res) => {
    try {
        const subjectId = req.params.id;
        const tenantId = req.user.tenantId;
        const subject = await prisma.subject.findFirst({ where: { id: subjectId, tenantId } });
        if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

        const impact = await getSubjectDeletionImpact(prisma, subjectId, tenantId);
        res.status(200).json({
            success: true,
            data: { subject: { id: subject.id, name: subject.name, code: subject.code }, ...impact }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to inspect subject dependencies' });
    }
};

// @desc    Delete subject
exports.deleteSubject = async (req, res) => {
    try {
        const subjectId = req.params.id;
        const tenantId = req.user.tenantId;

        const subject = await prisma.subject.findFirst({ where: { id: subjectId, tenantId } });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const impact = await prisma.$transaction(async (tx) => {
            // Recount inside the transaction so the deletion result reflects the records handled.
            const deletionImpact = await getSubjectDeletionImpact(tx, subjectId, tenantId);

            // Preserve records whose nullable relation supports a subject being retired.
            await tx.assignment.updateMany({ where: { subjectId, tenantId }, data: { subjectId: null } });
            await tx.attendance.updateMany({ where: { subjectId, tenantId }, data: { subjectId: null } });

            // Required subject-owned relations cannot remain valid without their subject.
            await tx.examComplaint.deleteMany({ where: { subjectId, tenantId } });
            await tx.mark.deleteMany({ where: { subjectId, tenantId } });
            await tx.material.deleteMany({ where: { subjectId, tenantId } });
            await tx.timetable.deleteMany({ where: { subjectId, tenantId } });
            await tx.subjectResource.deleteMany({ where: { subjectId } });
            await tx.subjectTeacher.deleteMany({ where: { subjectId } });
            await tx.classSubject.deleteMany({ where: { subjectId } });

            await tx.subject.delete({ where: { id: subjectId } });
            return deletionImpact;
        });

        await logAction({ action: 'DELETE', module: 'TENANT', details: `Deleted subject: ${subject.name} (${subjectId}); impact=${JSON.stringify(impact)}`, userId: req.user._id, tenantId });
        res.status(200).json({ success: true, message: 'Subject deleted successfully', data: { impact } });
    } catch (error) {
        // Verbose logging for troubleshooting delete failures
        console.error('DELETE SUBJECT ERROR:', {
            message: error.message,
            stack: error.stack,
            subjectId: req.params.id,
            userId: req.user && req.user._id,
            tenantId: req.user && req.user.tenantId
        });

        const isDev = process.env.NODE_ENV === 'development';
        res.status(500).json({ success: false, message: isDev ? error.message : 'Failed to delete subject' });
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
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessSubject(req.user.id, req.params.id, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this subject' });
        }

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
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessSubject(req.user.id, req.params.id, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this subject' });
        }

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
