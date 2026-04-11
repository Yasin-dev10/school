const prisma = require('../config/prismaClient');

// @desc    Create grade system
exports.createGradeSystem = async (req, res) => {
    try {
        const { grades } = req.body;
        const tenantId = req.user.tenantId;

        // Validate no overlap
        const sorted = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].minPercentage <= sorted[i + 1].maxPercentage)
                return res.status(400).json({ success: false, message: 'Grade ranges cannot overlap' });
        }

        const existing = await prisma.gradeSystem.findFirst({ where: { tenantId, isActive: true } });
        if (existing)
            return res.status(400).json({ success: false, message: 'An active grade system already exists. Deactivate it first.' });

        const gradeSystem = await prisma.gradeSystem.create({
            data: {
                tenantId, isActive: true,
                grades: { create: sorted.map(g => ({ grade: g.grade, minPercentage: g.minPercentage, maxPercentage: g.maxPercentage, gpa: g.gpa, remarks: g.remarks || null })) }
            },
            include: { grades: true }
        });

        res.status(201).json({ success: true, message: 'Grade system created', data: gradeSystem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get active grade system
exports.getActiveGradeSystem = async (req, res) => {
    try {
        const gradeSystem = await prisma.gradeSystem.findFirst({
            where: { tenantId: req.user.tenantId, isActive: true },
            include: { grades: true }
        });
        if (!gradeSystem) return res.status(404).json({ success: false, message: 'No active grade system found' });
        res.status(200).json({ success: true, data: gradeSystem });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all grade systems
exports.getAllGradeSystems = async (req, res) => {
    try {
        const systems = await prisma.gradeSystem.findMany({
            where: { tenantId: req.user.tenantId },
            include: { grades: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ success: true, count: systems.length, data: systems });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get grade system by ID
exports.getGradeSystemById = async (req, res) => {
    try {
        const system = await prisma.gradeSystem.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { grades: true }
        });
        if (!system) return res.status(404).json({ success: false, message: 'Grade system not found' });
        res.status(200).json({ success: true, data: system });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update grade system
exports.updateGradeSystem = async (req, res) => {
    try {
        const { grades, isActive } = req.body;
        const system = await prisma.gradeSystem.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!system) return res.status(404).json({ success: false, message: 'Grade system not found' });

        let sortedGrades = grades;
        if (grades) {
            sortedGrades = [...grades].sort((a, b) => b.minPercentage - a.minPercentage);
            for (let i = 0; i < sortedGrades.length - 1; i++) {
                if (sortedGrades[i].minPercentage <= sortedGrades[i + 1].maxPercentage)
                    return res.status(400).json({ success: false, message: 'Grade ranges cannot overlap' });
            }
            await prisma.gradeConfig.deleteMany({ where: { gradeSystemId: req.params.id } });
        }

        const updated = await prisma.gradeSystem.update({
            where: { id: req.params.id },
            data: {
                ...(isActive !== undefined && { isActive }),
                ...(sortedGrades?.length > 0 && {
                    grades: { create: sortedGrades.map(g => ({ grade: g.grade, minPercentage: g.minPercentage, maxPercentage: g.maxPercentage, gpa: g.gpa, remarks: g.remarks || null })) }
                })
            },
            include: { grades: true }
        });

        res.status(200).json({ success: true, message: 'Grade system updated', data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete grade system
exports.deleteGradeSystem = async (req, res) => {
    try {
        const system = await prisma.gradeSystem.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!system) return res.status(404).json({ success: false, message: 'Grade system not found' });

        await prisma.gradeSystem.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Grade system deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle grade system active status
exports.toggleGradeSystemStatus = async (req, res) => {
    try {
        const system = await prisma.gradeSystem.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!system) return res.status(404).json({ success: false, message: 'Grade system not found' });

        if (!system.isActive) {
            // Deactivate all others first
            await prisma.gradeSystem.updateMany({ where: { tenantId: req.user.tenantId, isActive: true }, data: { isActive: false } });
        }

        const updated = await prisma.gradeSystem.update({ where: { id: req.params.id }, data: { isActive: !system.isActive }, include: { grades: true } });
        res.status(200).json({ success: true, message: `Grade system ${updated.isActive ? 'activated' : 'deactivated'}`, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Calculate grade from percentage
exports.calculateGrade = async (req, res) => {
    try {
        const { percentage } = req.body;
        if (percentage === undefined) return res.status(400).json({ success: false, message: 'Percentage is required' });

        const system = await prisma.gradeSystem.findFirst({
            where: { tenantId: req.user.tenantId, isActive: true },
            include: { grades: true }
        });
        if (!system) return res.status(404).json({ success: false, message: 'No active grade system found' });

        const gradeInfo = system.grades.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage);
        if (!gradeInfo) return res.status(404).json({ success: false, message: 'No grade found for this percentage' });

        res.status(200).json({ success: true, data: { percentage, grade: gradeInfo.grade, gpa: gradeInfo.gpa, remarks: gradeInfo.remarks } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper for other controllers
exports.getGradeFromPercentage = async (percentage, tenantId) => {
    try {
        const system = await prisma.gradeSystem.findFirst({ where: { tenantId, isActive: true }, include: { grades: true } });
        if (!system) return null;
        return system.grades.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage) || null;
    } catch (error) {
        return null;
    }
};
