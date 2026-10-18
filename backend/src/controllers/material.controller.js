const prisma = require('../config/prismaClient');
const { canTeacherAccessClassSubject } = require('../utils/teacherScope');
const { getParentScope } = require('../utils/parentScope');

// @desc    Create material
exports.createMaterial = async (req, res) => {
    try {
        const { title, description, type, content, fileUrl, classId, subjectId, visibleToStudents } = req.body;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const material = await prisma.material.create({
            data: {
                title, description, type: type || 'note',
                content: content || null,
                fileUrl: fileUrl || null,
                classId, subjectId,
                teacherId: req.user.id,
                visibleToStudents: visibleToStudents !== undefined ? visibleToStudents : true,
                tenantId
            },
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        res.status(201).json({ success: true, data: material });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get materials
exports.getMaterials = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const { classId, subjectId } = req.query;
        let where = { tenantId };
        let scopedClassIds = null;

        if (role === 'teacher') {
            where.teacherId = req.user.id;
        } else if (role === 'student') {
            where.visibleToStudents = true;
            if (req.user.profile?.class) {
                const cls = await prisma.class.findFirst({ where: { OR: [{ id: req.user.profile.class }, { name: req.user.profile.class }], tenantId, ...(req.user.profile.section ? { section: req.user.profile.section } : {}) } });
                scopedClassIds = cls ? [cls.id] : [];
                where.classId = cls?.id || '__none__';
            } else {
                scopedClassIds = [];
                where.classId = '__none__';
            }
        } else if (role === 'parent') {
            const scope = await getParentScope(req.user.id, tenantId);
            if (!scope.classIds.length) return res.status(200).json({ success: true, count: 0, data: [] });
            scopedClassIds = scope.classIds;
            where.visibleToStudents = true;
            where.classId = { in: scope.classIds };
        }

        if (classId) {
            if (scopedClassIds && !scopedClassIds.includes(classId)) return res.status(403).json({ success: false, message: 'Access denied. Class is not linked to your records.' });
            where.classId = classId;
        }
        if (subjectId) where.subjectId = subjectId;

        const materials = await prisma.material.findMany({
            where,
            include: {
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                teacher: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ success: true, count: materials.length, data: materials });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update material
exports.updateMaterial = async (req, res) => {
    try {
        const exists = await prisma.material.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Material not found' });
        if (req.user.role === 'teacher' && exists.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only update your own materials' });

        const { title, description, type, content, fileUrl, classId, subjectId, visibleToStudents } = req.body;
        if (req.user.role === 'teacher' && (classId || subjectId)) {
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId || exists.classId, subjectId || exists.subjectId, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const updated = await prisma.material.update({
            where: { id: req.params.id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(type && { type }),
                ...(content !== undefined && { content }),
                ...(fileUrl !== undefined && { fileUrl }),
                ...(classId && { classId }),
                ...(subjectId && { subjectId }),
                ...(visibleToStudents !== undefined && { visibleToStudents })
            }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete material
exports.deleteMaterial = async (req, res) => {
    try {
        const exists = await prisma.material.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Material not found' });
        if (req.user.role === 'teacher' && exists.teacherId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only delete your own materials' });

        await prisma.material.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Material deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
