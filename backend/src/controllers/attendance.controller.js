const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

// @desc    Mark attendance
exports.markAttendance = async (req, res) => {
    try {
        const { classId, date, subjectId, records } = req.body; // records: [{studentId, status, remarks}]
        const tenantId = req.user.tenantId;

        const results = [];
        for (const rec of records) {
            try {
                const att = await prisma.attendance.upsert({
                    where: {
                        studentId_classId_subjectId_date_tenantId: {
                            studentId: rec.studentId,
                            classId,
                            subjectId: subjectId || null,
                            date: new Date(date),
                            tenantId
                        }
                    },
                    update: { status: rec.status, remarks: rec.remarks || null },
                    create: {
                        studentId: rec.studentId,
                        classId,
                        subjectId: subjectId || null,
                        date: new Date(date),
                        status: rec.status || 'present',
                        markedById: req.user.id,
                        tenantId,
                        remarks: rec.remarks || null
                    }
                });
                results.push({ studentId: rec.studentId, status: 'success', data: att });
            } catch (err) {
                results.push({ studentId: rec.studentId, status: 'failed', reason: err.message });
            }
        }

        await logAction({ action: 'CREATE', module: 'USER', details: `Marked attendance for class ${classId}`, userId: req.user._id, tenantId });
        res.status(200).json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance records
exports.getAttendance = async (req, res) => {
    try {
        const { classId, date, subjectId, studentId } = req.query;
        const tenantId = req.user.tenantId;
        let where = { tenantId };

        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;
        if (date) where.date = new Date(date);
        if (req.user.role === 'student') where.studentId = req.user.id;
        else if (studentId) where.studentId = studentId;

        const records = await prisma.attendance.findMany({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true } },
                class: { select: { id: true, name: true, section: true } },
                subject: { select: { id: true, name: true } },
                markedBy: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { date: 'desc' }
        });

        res.status(200).json({ success: true, count: records.length, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance summary
exports.getAttendanceSummary = async (req, res) => {
    try {
        const { classId, studentId, startDate, endDate } = req.query;
        const tenantId = req.user.tenantId;
        let where = { tenantId };

        if (classId) where.classId = classId;
        if (studentId) where.studentId = studentId;
        if (req.user.role === 'student') where.studentId = req.user.id;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const records = await prisma.attendance.findMany({ where });

        const total = records.length;
        const present = records.filter(r => r.status === 'present').length;
        const absent = records.filter(r => r.status === 'absent').length;
        const late = records.filter(r => r.status === 'late').length;
        const excused = records.filter(r => r.status === 'excused').length;

        res.status(200).json({
            success: true,
            data: {
                total, present, absent, late, excused,
                percentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getClassAttendance = exports.getAttendance;
exports.getClassAttendanceHistory = exports.getAttendanceSummary;
exports.getMyAttendance = exports.getAttendance;

