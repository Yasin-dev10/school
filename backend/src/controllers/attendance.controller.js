const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const { canTeacherAccessClassSubject, canTeacherAccessStudent } = require('../utils/teacherScope');
const { notifyStudentAndParents } = require('../services/notification.service');

const startOfDay = (value) => {
    const date = value ? new Date(value) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value) => {
    const date = startOfDay(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const formatAttendance = (record) => ({
    ...record,
    _id: record.id,
    student: record.student ? { ...record.student, _id: record.student.id } : record.student,
    class: record.class ? { ...record.class, _id: record.class.id } : record.class,
    subject: record.subject ? { ...record.subject, _id: record.subject.id } : record.subject,
    markedBy: record.markedBy ? { ...record.markedBy, _id: record.markedBy.id } : record.markedBy
});

const buildStats = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;

    return {
        total,
        present,
        absent,
        late,
        excused,
        percentage: total > 0 ? ((present / total) * 100).toFixed(1) : '0.0'
    };
};

const includeAttendanceRelations = {
    student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true } },
    class: { select: { id: true, name: true, section: true } },
    subject: { select: { id: true, name: true } },
    markedBy: { select: { id: true, firstName: true, lastName: true } }
};

// @desc Classes and subjects the current user may use when taking attendance
exports.getAttendanceOptions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        let assignments;

        if (req.user.role === 'teacher') {
            const [classSubjectLinks, timetableLinks] = await Promise.all([
                prisma.classSubject.findMany({
                    where: {
                        class: { tenantId },
                        teachers: { some: { teacherId: req.user.id } }
                    },
                    include: {
                        class: { select: { id: true, name: true, section: true } },
                        subject: { select: { id: true, name: true, code: true } }
                    }
                }),
                prisma.timetable.findMany({
                    where: { tenantId, teachers: { some: { teacherId: req.user.id } } },
                    include: {
                        class: { select: { id: true, name: true, section: true } },
                        subject: { select: { id: true, name: true, code: true } }
                    }
                })
            ]);
            assignments = [...classSubjectLinks, ...timetableLinks];
        } else {
            assignments = await prisma.classSubject.findMany({
                where: { class: { tenantId } },
                include: {
                    class: { select: { id: true, name: true, section: true } },
                    subject: { select: { id: true, name: true, code: true } }
                }
            });
        }

        const uniquePairs = new Map();
        for (const assignment of assignments) {
            const key = `${assignment.class.id}:${assignment.subject.id}`;
            uniquePairs.set(key, {
                class: { ...assignment.class, _id: assignment.class.id },
                subject: { ...assignment.subject, _id: assignment.subject.id }
            });
        }

        const pairs = [...uniquePairs.values()].sort((a, b) =>
            `${a.class.name} ${a.class.section} ${a.subject.name}`.localeCompare(`${b.class.name} ${b.class.section} ${b.subject.name}`)
        );
        res.status(200).json({ success: true, data: pairs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark attendance
exports.markAttendance = async (req, res) => {
    try {
        const { classId, date, subjectId, records } = req.body; // records: [{studentId, status, remarks}]
        const tenantId = req.user.tenantId;

        if (!classId) return res.status(400).json({ success: false, message: 'Class is required' });
        if (!Array.isArray(records) || records.length === 0)
            return res.status(400).json({ success: false, message: 'Attendance records are required' });

        if (req.user.role === 'teacher') {
            if (!subjectId) {
                return res.status(400).json({ success: false, message: 'Subject is required for teacher attendance' });
            }

            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const attendanceDate = startOfDay(date);
        const results = [];
        for (const rec of records) {
            try {
                const student = await prisma.user.findFirst({
                    where: { id: rec.studentId, tenantId, role: 'student' },
                    select: { id: true }
                });

                if (!student) throw new Error('Student not found in this school');

                // Find existing record for this student/class/subject/date
                const existing = await prisma.attendance.findFirst({
                    where: {
                        studentId: rec.studentId,
                        classId,
                        subjectId: subjectId || null,
                        date: attendanceDate,
                        tenantId
                    }
                });

                let att;
                if (existing) {
                    // Update existing record
                    att = await prisma.attendance.update({
                        where: { id: existing.id },
                        data: {
                            status: rec.status || 'present',
                            markedById: req.user.id,
                            remarks: rec.remarks || null
                        }
                    });
                } else {
                    // Create new record
                    att = await prisma.attendance.create({
                        data: {
                            studentId: rec.studentId,
                            classId,
                            subjectId: subjectId || null,
                            date: attendanceDate,
                            status: rec.status || 'present',
                            markedById: req.user.id,
                            tenantId,
                            remarks: rec.remarks || null
                        }
                    });
                }

                results.push({ studentId: rec.studentId, status: 'success', action: existing ? 'updated' : 'created', data: att });
            } catch (err) {
                results.push({ studentId: rec.studentId, status: 'failed', reason: err.message });
            }
        }

        await logAction({ action: 'CREATE', module: 'USER', details: `Marked attendance for class ${classId}`, userId: req.user._id, tenantId });
        const alerts = results.filter(result => result.status === 'success' && ['absent', 'late'].includes(result.data.status));
        await Promise.all(alerts.map(result => notifyStudentAndParents({
            tenantId, senderId: req.user.id, studentId: result.studentId,
            title: result.data.status === 'absent' ? 'Attendance alert: Absent' : 'Attendance alert: Late',
            message: `Attendance was marked ${result.data.status} for ${attendanceDate.toLocaleDateString()}.`,
            type: 'attendance_alert', eventType: 'attendance', deepLink: '/dashboard/attendance'
        })));
        res.status(200).json({ success: true, results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance records
exports.getAttendance = async (req, res) => {
    try {
        const { date, subjectId, studentId } = req.query;
        const classId = req.params.classId || req.query.classId;
        const tenantId = req.user.tenantId;
        let where = { tenantId };

        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;
        if (date) where.date = { gte: startOfDay(date), lte: endOfDay(date) };
        if (req.user.role === 'student') where.studentId = req.user.id;
        else if (studentId) where.studentId = studentId;

        if (req.user.role === 'teacher' && classId) {
            if (!subjectId) return res.status(400).json({ success: false, message: 'Subject is required for teacher attendance' });
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const records = await prisma.attendance.findMany({
            where,
            include: includeAttendanceRelations,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });

        res.status(200).json({ success: true, count: records.length, data: records.map(formatAttendance) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attendance summary
exports.getAttendanceSummary = async (req, res) => {
    try {
        const { studentId, startDate, endDate } = req.query;
        const classId = req.params.classId || req.query.classId;
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

        if (req.user.role === 'teacher' && classId) {
            if (!req.query.subjectId) return res.status(400).json({ success: false, message: 'Subject is required for teacher attendance' });
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, req.query.subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const records = await prisma.attendance.findMany({
            where,
            include: includeAttendanceRelations,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });

        res.status(200).json({ success: true, data: records.map(formatAttendance), stats: buildStats(records) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyAttendance = async (req, res) => {
    try {
        const records = await prisma.attendance.findMany({
            where: { tenantId: req.user.tenantId, studentId: req.user.id },
            include: includeAttendanceRelations,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });

        res.status(200).json({
            success: true,
            data: {
                records: records.map(formatAttendance),
                stats: buildStats(records)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStudentAttendance = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate, subjectId } = req.query;
        const tenantId = req.user.tenantId;

        if (!studentId) return res.status(400).json({ success: false, message: 'Student is required' });

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, studentId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }

        const where = { tenantId, studentId };
        if (subjectId) where.subjectId = subjectId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const records = await prisma.attendance.findMany({
            where,
            include: includeAttendanceRelations,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
        });

        res.status(200).json({
            success: true,
            data: {
                records: records.map(formatAttendance),
                stats: buildStats(records)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update a single attendance record
exports.updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const tenantId = req.user.tenantId;

        // Find by id only first, then verify tenant ownership
        const existing = await prisma.attendance.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found' });
        if (existing.tenantId !== tenantId) return res.status(403).json({ success: false, message: 'Access denied' });

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessClassSubject(req.user.id, existing.classId, existing.subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const updated = await prisma.attendance.update({
            where: { id },
            data: { status, remarks: remarks || null, markedById: req.user.id },
            include: includeAttendanceRelations
        });

        await logAction({ action: 'UPDATE', module: 'USER', details: `Updated attendance record ${id}`, userId: req.user.id, tenantId });
        res.status(200).json({ success: true, data: formatAttendance(updated) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getClassAttendance = exports.getAttendance;
exports.getClassAttendanceHistory = exports.getAttendanceSummary;
exports.getAttendanceReport = async (req, res) => {
    try {
        const classId = req.query.classId;
        const month = Number(req.query.month);
        const tenantId = req.user.tenantId;

        if (!classId) return res.status(400).json({ success: false, message: 'Class is required' });

        if (req.user.role === 'teacher') {
            if (!req.query.subjectId) return res.status(400).json({ success: false, message: 'Subject is required for teacher attendance report' });
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, req.query.subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const year = Number(req.query.year) || new Date().getFullYear();
        const where = { tenantId, classId };
        if (req.query.subjectId) where.subjectId = req.query.subjectId;
        if (month >= 1 && month <= 12) {
            where.date = {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1)
            };
        }

        const records = await prisma.attendance.findMany({
            where,
            include: includeAttendanceRelations,
            orderBy: { date: 'asc' }
        });

        const rows = [
            ['Date', 'Student', 'Class', 'Status', 'Remarks'],
            ...records.sort((a, b) => {
                const dateDiff = a.date.getTime() - b.date.getTime();
                if (dateDiff !== 0) return dateDiff;
                return `${a.student.firstName} ${a.student.lastName}`.localeCompare(`${b.student.firstName} ${b.student.lastName}`);
            }).map(r => [
                r.date.toISOString().slice(0, 10),
                `${r.student.firstName} ${r.student.lastName}`,
                `${r.class.name} - ${r.class.section}`,
                r.status,
                r.remarks || ''
            ])
        ];

        const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-${classId}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

