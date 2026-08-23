const prisma = require('../config/prismaClient');
const { createAutomatedNotification } = require('../services/notification.service');
const { logAction } = require('../utils/logger');
const { emitToTenant } = require('../config/socket');
const { generateExcelMatrix, generateReportCardPDF } = require('../utils/reportGenerator');
const { getTeacherScope, canTeacherAccessClassSubject, canTeacherAccessStudent } = require('../utils/teacherScope');

const calculateGrade = (percentage, gradeConfigs) => {
    if (!gradeConfigs?.length) {
        if (percentage >= 90) return { grade: 'A+', gpa: 4.0 };
        if (percentage >= 80) return { grade: 'A', gpa: 3.7 };
        if (percentage >= 70) return { grade: 'B', gpa: 3.0 };
        if (percentage >= 60) return { grade: 'C', gpa: 2.0 };
        if (percentage >= 50) return { grade: 'D', gpa: 1.0 };
        return { grade: 'F', gpa: 0.0 };
    }
    const config = gradeConfigs.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage);
    return config ? { grade: config.grade, gpa: config.gpa } : { grade: 'F', gpa: 0.0 };
};

// @desc    Create exam
exports.createExam = async (req, res) => {
    try {
        const { name, term, startDate, endDate, classes, status } = req.body;
        const tenantId = req.user.tenantId;

        const exam = await prisma.exam.create({
            data: {
                name, term, tenantId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: status || 'scheduled',
                ...(classes?.length > 0 && {
                    classes: { create: classes.map(cId => ({ class: { connect: { id: cId } } })) }
                })
            },
            include: { classes: { include: { class: { select: { id: true, name: true, section: true } } } } }
        });

        await logAction({ action: 'CREATE', module: 'TENANT', details: `Created exam: ${name}`, userId: req.user._id, tenantId });
        emitToTenant(tenantId, 'exam:created', exam);
        res.status(201).json({ success: true, data: formatExam(exam) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all exams
exports.getExams = async (req, res) => {
    try {
        let where = { tenantId: req.user.tenantId };
        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, req.user.tenantId);
            if (scope.classIds.length === 0) return res.status(200).json({ success: true, count: 0, data: [] });
            where.classes = { some: { classId: { in: scope.classIds } } };
        }

        const exams = await prisma.exam.findMany({
            where,
            include: { classes: { include: { class: { select: { id: true, name: true, section: true } } } } },
            orderBy: { startDate: 'desc' }
        });
        res.status(200).json({ success: true, count: exams.length, data: exams.map(formatExam) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete exam
exports.deleteExam = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const exam = await prisma.exam.findFirst({ where: { id: req.params.id, tenantId } });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

        if (exam.isApproved) {
            return res.status(400).json({ success: false, message: 'Cannot delete an approved/published exam. Unlock it first.' });
        }

        // Delete related marks and class assignments first
        await prisma.$transaction([
            prisma.mark.deleteMany({ where: { examId: req.params.id, tenantId } }),
            prisma.examClass.deleteMany({ where: { examId: req.params.id } }),
            prisma.exam.delete({ where: { id: req.params.id } }),
        ]);

        await logAction({ action: 'DELETE', module: 'TENANT', details: `Deleted exam: ${exam.name}`, userId: req.user._id, tenantId });
        emitToTenant(tenantId, 'exam:deleted', { examId: req.params.id });
        res.status(200).json({ success: true, message: 'Exam deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update exam
exports.updateExam = async (req, res) => {
    try {
        const exists = await prisma.exam.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Exam not found' });

        const { name, term, startDate, endDate, status, classes } = req.body;

        if (classes !== undefined) {
            await prisma.examClass.deleteMany({ where: { examId: req.params.id } });
        }

        const exam = await prisma.exam.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(term && { term }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
                ...(status && { status }),
                ...(classes?.length > 0 && {
                    classes: { create: classes.map(cId => ({ class: { connect: { id: cId } } })) }
                })
            },
            include: { classes: { include: { class: { select: { id: true, name: true, section: true } } } } }
        });

        emitToTenant(req.user.tenantId, 'exam:updated', exam);
        res.status(200).json({ success: true, data: formatExam(exam) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk mark entry
exports.bulkMarkEntry = async (req, res) => {
    try {
        const { examId, subjectId, classId, marks, maxMarks: globalMaxMarks } = req.body;
        const tenantId = req.user.tenantId;

        if (!examId || !subjectId || !classId || !marks)
            return res.status(400).json({ success: false, message: 'Missing required fields' });

        const exam = await prisma.exam.findFirst({ where: { id: examId, tenantId } });
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (req.user.role === 'teacher') {
            const isAssigned = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!isAssigned)
                return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const filteredMarksByStudent = new Map();
        marks
            .filter(m => m.studentId && m.score !== undefined && m.score !== null && m.score !== '')
            .forEach(m => filteredMarksByStudent.set(m.studentId, m));

        const filteredMarks = [...filteredMarksByStudent.values()];
        if (!filteredMarks.length)
            return res.status(200).json({ success: true, message: 'No valid marks provided.' });

        const { validateMarkEntry } = require('../utils/validation');
        for (const m of filteredMarks) {
            const mMax = Number(m.maxMarks) || Number(globalMaxMarks) || 100;
            const validation = validateMarkEntry(String(m.score), mMax);
            if (!validation.isValid)
                return res.status(400).json({ success: false, message: `Invalid marks for student ${m.studentId}: ${validation.message}` });
        }

        const gradeSystem = await prisma.gradeSystem.findFirst({
            where: { tenantId, isActive: true },
            include: { grades: true }
        });
        const gradeConfigs = gradeSystem?.grades || [];

        const markRows = filteredMarks.map((m) => {
            const marksObtained = Number(m.score);
            const mMax = Number(m.maxMarks) || Number(globalMaxMarks) || 100;
            const percentage = (marksObtained / mMax) * 100;
            const { grade, gpa } = calculateGrade(percentage, gradeConfigs);
            const gradeConfig = gradeConfigs.find(g => percentage >= g.minPercentage && percentage <= g.maxPercentage);

            return {
                studentId: m.studentId,
                examId,
                subjectId,
                classId,
                tenantId,
                marksObtained,
                maxMarks: mMax,
                remarks: m.remarks || '',
                grade,
                gpa,
                gradeRemarks: gradeConfig?.remarks || null,
                gradedById: req.user.id
            };
        });

        for (const markRow of markRows) {
            await prisma.mark.upsert({
                where: {
                    studentId_examId_subjectId_tenantId: {
                        studentId: markRow.studentId,
                        examId,
                        subjectId,
                        tenantId
                    }
                },
                update: {
                    marksObtained: markRow.marksObtained,
                    maxMarks: markRow.maxMarks,
                    remarks: markRow.remarks,
                    grade: markRow.grade,
                    gpa: markRow.gpa,
                    gradeRemarks: markRow.gradeRemarks,
                    classId,
                    gradedById: req.user.id
                },
                create: markRow
            });
        }

        await logAction({ action: 'UPDATE', module: 'TENANT', details: `Entered marks for Exam ${examId}, Subject ${subjectId}`, userId: req.user._id, tenantId });
        emitToTenant(tenantId, 'marks:updated', { examId, subjectId, classId });
        res.status(200).json({ success: true, message: 'Marks updated successfully', count: markRows.length });
    } catch (error) {
        console.error('Bulk Mark Entry Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error while saving marks' });
    }
};

// @desc    Delete mark
exports.deleteMark = async (req, res) => {
    try {
        const { markId } = req.params;
        const tenantId = req.user.tenantId;

        const mark = await prisma.mark.findFirst({ where: { id: markId, tenantId } });
        if (!mark) return res.status(404).json({ success: false, message: 'Mark not found' });
        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessClassSubject(req.user.id, mark.classId, mark.subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        await prisma.mark.delete({ where: { id: markId } });
        emitToTenant(tenantId, 'mark:deleted', { markId });
        res.status(200).json({ success: true, message: 'Mark deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk delete marks
exports.bulkDeleteMarks = async (req, res) => {
    try {
        const { examId, subjectId, classId, studentIds } = req.body;
        const tenantId = req.user.tenantId;

        if (!examId || !subjectId || !classId)
            return res.status(400).json({ success: false, message: 'Missing required fields' });

        let where = { examId, subjectId, classId, tenantId };
        if (studentIds?.length > 0) where.studentId = { in: studentIds };

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessClassSubject(req.user.id, classId, subjectId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this class subject' });
        }

        const result = await prisma.mark.deleteMany({ where });
        emitToTenant(tenantId, 'marks:bulk-deleted', { examId, subjectId, classId, deletedCount: result.count });
        res.status(200).json({ success: true, message: `Deleted ${result.count} mark(s)`, deletedCount: result.count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get marks
exports.getMarks = async (req, res) => {
    try {
        const { examId, subjectId, classId, studentId } = req.query;
        let where = { tenantId: req.user.tenantId };

        if (examId) where.examId = examId;
        if (subjectId) where.subjectId = subjectId;
        if (classId) where.classId = classId;
        if (req.user.role === 'student') where.studentId = req.user.id;
        else if (studentId) where.studentId = studentId;

        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, req.user.tenantId);
            if (scope.classIds.length === 0 || scope.subjectIds.length === 0)
                return res.status(200).json({ success: true, data: [] });
            where.classId = classId || { in: scope.classIds };
            where.subjectId = subjectId || { in: scope.subjectIds };
        }

        const marks = await prisma.mark.findMany({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } },
                subject: { select: { id: true, name: true, code: true } },
                exam: { select: { id: true, name: true, term: true, isApproved: true, startDate: true, endDate: true } }
            }
        });

        res.status(200).json({ success: true, data: marks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve results
exports.approveResults = async (req, res) => {
    try {
        const exam = await prisma.exam.update({
            where: { id: req.params.id },
            data: { isApproved: true, approvedById: req.user.id, approvalDate: new Date(), status: 'completed' }
        });
        const classes = await prisma.examClass.findMany({ where: { examId: exam.id }, select: { classId: true } });
        await Promise.all(classes.map(item => createAutomatedNotification({
            tenantId: req.user.tenantId, senderId: req.user.id, targetRole: 'student', targetClass: item.classId,
            title: 'Exam results published', message: `${exam.name} results are now available.`,
            eventType: 'exam_result', deepLink: `/dashboard/exam-results?exam=${exam.id}`
        })));
        res.status(200).json({ success: true, data: exam });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Unapprove results
exports.unapproveResults = async (req, res) => {
    try {
        const exam = await prisma.exam.update({
            where: { id: req.params.id },
            data: { isApproved: false, approvedById: null, approvalDate: null, status: 'ongoing' }
        });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        res.status(200).json({ success: true, data: exam, message: 'Exam unlocked for editing.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student report
exports.getStudentReport = async (req, res) => {
    try {
        const { examId, studentId } = req.params;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, studentId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }
        if (req.user.role === 'student' && studentId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (req.user.role === 'parent') {
            const link = await prisma.studentParent.findFirst({
                where: { parentId: req.user.id, studentId }
            });
            if (!link) return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [exam, marks, gradeSystem] = await Promise.all([
            prisma.exam.findFirst({ where: { id: examId, tenantId } }),
            prisma.mark.findMany({
                where: { studentId, examId, tenantId },
                include: {
                    subject: { select: { id: true, name: true, code: true } },
                    student: { select: { id: true, firstName: true, lastName: true, rollNo: true } },
                    class: { select: { id: true, name: true, section: true } }
                }
            }),
            prisma.gradeSystem.findFirst({ where: { tenantId, isActive: true }, include: { grades: true } })
        ]);

        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        if (!marks.length) return res.status(404).json({ message: 'No marks found' });

        const gradeConfigs = gradeSystem?.grades || [];
        const marksWithGrades = marks.map(m => {
            const perc = (m.marksObtained / m.maxMarks) * 100;
            const { grade, gpa } = calculateGrade(perc, gradeConfigs);
            return { ...m, grade, gpa };
        });

        const totalObtained = marksWithGrades.reduce((s, m) => s + m.marksObtained, 0);
        const totalMax = marksWithGrades.reduce((s, m) => s + m.maxMarks, 0);
        const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
        const { grade, gpa } = calculateGrade(percentage, gradeConfigs);

        const classId = marks[0].classId;
        const allClassMarks = await prisma.mark.findMany({ where: { classId, examId, tenantId } });
        const studentTotals = {};
        allClassMarks.forEach(m => {
            studentTotals[m.studentId] = (studentTotals[m.studentId] || 0) + m.marksObtained;
        });
        const sortedTotals = Object.values(studentTotals).sort((a, b) => b - a);
        const rank = sortedTotals.indexOf(totalObtained) + 1;

        const data = {
            student: marksWithGrades[0].student,
            class: marksWithGrades[0].class,
            exam: { name: exam.name, term: exam.term },
            marks: marksWithGrades,
            summary: { totalObtained, totalMax, percentage, grade, gpa, rank, totalStudents: sortedTotals.length }
        };

        if (req.query.format === 'pdf') {
            const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
            const doc = generateReportCardPDF(data, tenant);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${studentId}.pdf`);
            doc.pipe(res); doc.end();
        } else {
            res.status(200).json({ success: true, data });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export excel matrix
exports.exportExcelMatrix = async (req, res) => {
    try {
        const { examId, classId } = req.query;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, tenantId);
            if (classId && !scope.classIds.includes(classId))
                return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
        }

        const scope = req.user.role === 'teacher' ? await getTeacherScope(req.user.id, tenantId) : null;
        const subjects = await prisma.subject.findMany({
            where: {
                tenantId,
                ...(scope && { id: { in: scope.subjectIds } })
            }
        });
        const marks = await prisma.mark.findMany({
            where: {
                examId,
                classId,
                tenantId,
                ...(scope && { subjectId: { in: scope.subjectIds } })
            },
            include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
        });

        const studentMap = {};
        marks.forEach(m => {
            if (!studentMap[m.studentId]) {
                studentMap[m.studentId] = { student: m.student, marks: {}, total: 0, count: 0 };
            }
            studentMap[m.studentId].marks[m.subjectId] = m.marksObtained;
            studentMap[m.studentId].total += m.marksObtained;
            studentMap[m.studentId].count++;
        });

        const rows = Object.values(studentMap).map(s => {
            const avg = s.total / (subjects.length || 1);
            const { grade } = calculateGrade((s.total / (subjects.length * 100)) * 100);
            return { ...s, average: avg, grade };
        });

        const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
        const workbook = await generateExcelMatrix({ subjects, rows }, tenant);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=grades-matrix.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get grade system
exports.getGradeSystem = async (req, res) => {
    try {
        let system = await prisma.gradeSystem.findFirst({ where: { tenantId: req.user.tenantId }, include: { grades: true } });
        if (!system) {
            system = await prisma.gradeSystem.create({
                data: {
                    tenantId: req.user.tenantId,
                    grades: {
                        create: [
                            { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0 },
                            { grade: 'A', minPercentage: 80, maxPercentage: 89, gpa: 3.7 },
                            { grade: 'B', minPercentage: 70, maxPercentage: 79, gpa: 3.0 },
                            { grade: 'C', minPercentage: 60, maxPercentage: 69, gpa: 2.0 },
                            { grade: 'D', minPercentage: 50, maxPercentage: 59, gpa: 1.0 },
                            { grade: 'F', minPercentage: 0, maxPercentage: 49, gpa: 0.0 }
                        ]
                    }
                },
                include: { grades: true }
            });
        }
        res.status(200).json({ success: true, data: system });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update grade system
exports.updateGradeSystem = async (req, res) => {
    try {
        const { grades, isActive } = req.body;
        let system = await prisma.gradeSystem.findFirst({ where: { tenantId: req.user.tenantId } });

        if (!system) {
            system = await prisma.gradeSystem.create({ data: { tenantId: req.user.tenantId } });
        }

        if (grades) {
            await prisma.gradeConfig.deleteMany({ where: { gradeSystemId: system.id } });
            await prisma.gradeConfig.createMany({
                data: grades.map(g => ({ ...g, gradeSystemId: system.id }))
            });
        }

        const updated = await prisma.gradeSystem.update({
            where: { id: system.id },
            data: { ...(isActive !== undefined && { isActive }) },
            include: { grades: true }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit complaint
exports.submitComplaint = async (req, res) => {
    try {
        const complaint = await prisma.examComplaint.create({
            data: {
                ...req.body,
                studentId: req.user.id,
                tenantId: req.user.tenantId
            }
        });
        res.status(201).json({ success: true, data: complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get complaints
exports.getComplaints = async (req, res) => {
    try {
        let where = { tenantId: req.user.tenantId };
        if (req.user.role === 'student') where.studentId = req.user.id;
        if (req.user.role === 'teacher') {
            const slots = await prisma.timetable.findMany({ where: { tenantId: req.user.tenantId, teachers: { some: { teacherId: req.user.id } } } });
            where.subjectId = { in: [...new Set(slots.map(s => s.subjectId))] };
        }

        const complaints = await prisma.examComplaint.findMany({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true } },
                exam: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } }
            }
        });

        res.status(200).json({ success: true, data: complaints });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Exam analytics
exports.getExamAnalytics = async (req, res) => {
    try {
        const { examId } = req.params;
        const { classId } = req.query;
        const tenantId = req.user.tenantId;

        let where = { examId, tenantId };
        if (classId) where.classId = classId;

        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, tenantId);
            if (classId && !scope.classIds.includes(classId))
                return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
            where.classId = classId || { in: scope.classIds };
            where.subjectId = { in: scope.subjectIds };
        }

        const marks = await prisma.mark.findMany({ where, include: { subject: { select: { name: true } } } });

        if (!marks.length) return res.status(200).json({ success: true, data: { message: 'No data available' } });

        const subjectStats = {};
        marks.forEach(m => {
            const n = m.subject.name;
            if (!subjectStats[n]) subjectStats[n] = { name: n, scores: [], total: 0, passed: 0, failed: 0, maxPossible: m.maxMarks };
            subjectStats[n].scores.push(m.marksObtained);
            subjectStats[n].total += m.marksObtained;
            const pct = (m.marksObtained / m.maxMarks) * 100;
            pct >= 50 ? subjectStats[n].passed++ : subjectStats[n].failed++;
        });

        const analytics = Object.values(subjectStats).map(s => ({
            subject: s.name, average: (s.total / s.scores.length).toFixed(2),
            highest: Math.max(...s.scores), lowest: Math.min(...s.scores),
            passRate: ((s.passed / s.scores.length) * 100).toFixed(1), count: s.scores.length
        }));

        const totalStudents = new Set(marks.map(m => m.studentId)).size;

        res.status(200).json({
            success: true,
            data: {
                totalStudents, subjectAnalytics: analytics,
                performanceDistribution: {
                    excellent: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.9).length,
                    good: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.7 && (m.marksObtained / m.maxMarks) < 0.9).length,
                    average: marks.filter(m => (m.marksObtained / m.maxMarks) >= 0.5 && (m.marksObtained / m.maxMarks) < 0.7).length,
                    belowAverage: marks.filter(m => (m.marksObtained / m.maxMarks) < 0.5).length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get top performers
exports.getTopPerformers = async (req, res) => {
    try {
        const { examId, classId } = req.params;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, tenantId);
            if (!scope.classIds.includes(classId))
                return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
        }

        const marks = await prisma.mark.findMany({
            where: { examId, classId, tenantId },
            include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
        });

        if (!marks.length) return res.status(200).json({ success: true, data: [] });

        const studentTotals = {};
        marks.forEach(m => {
            if (!studentTotals[m.studentId]) {
                studentTotals[m.studentId] = { student: m.student, totalObtained: 0, totalMax: 0, count: 0 };
            }
            studentTotals[m.studentId].totalObtained += m.marksObtained;
            studentTotals[m.studentId].totalMax += m.maxMarks;
            studentTotals[m.studentId].count++;
        });

        const results = Object.values(studentTotals)
            .map(s => ({ ...s, percentage: (s.totalObtained / s.totalMax) * 100 }))
            .sort((a, b) => b.totalObtained - a.totalObtained)
            .slice(0, 3)
            .map((r, i) => ({ ...r, rank: i + 1 }));

        res.status(200).json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student grades/GPA
exports.getStudentGrades = async (req, res) => {
    try {
        const studentId = req.params.studentId || req.user.id;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, studentId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }
        if (req.user.role === 'student' && studentId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (req.user.role === 'parent') {
            const link = await prisma.studentParent.findFirst({
                where: { parentId: req.user.id, studentId }
            });
            if (!link) return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [marks, gradeSystem] = await Promise.all([
            prisma.mark.findMany({
                where: { studentId, tenantId },
                include: {
                    subject: { select: { id: true, name: true, code: true, credits: true } },
                    exam: { select: { id: true, name: true, term: true, isApproved: true, startDate: true } }
                },
                orderBy: { exam: { startDate: 'desc' } }
            }),
            prisma.gradeSystem.findFirst({ where: { tenantId, isActive: true }, include: { grades: true } })
        ]);

        if (!marks.length)
            return res.status(200).json({ success: true, data: { terms: [], cumulativeGpa: 0, totalCredits: 0 } });

        const gradeConfigs = gradeSystem?.grades || [];
        const termsMap = {};

        marks.forEach(m => {
            if (!m.exam?.isApproved) return;
            const examId = m.exam.id;
            if (!termsMap[examId]) {
                termsMap[examId] = { id: examId, name: m.exam.name, term: m.exam.term, startDate: m.exam.startDate, courses: [], totalCredits: 0, weightedGpaSum: 0 };
            }
            const perc = (m.marksObtained / m.maxMarks) * 100;
            const { grade, gpa } = calculateGrade(perc, gradeConfigs);
            const credits = m.subject.credits || 3;
            termsMap[examId].courses.push({ subjectName: m.subject.name, subjectCode: m.subject.code, credits, marksObtained: m.marksObtained, maxMarks: m.maxMarks, percentage: perc.toFixed(1), grade, gpa });
            termsMap[examId].totalCredits += credits;
            termsMap[examId].weightedGpaSum += (gpa * credits);
        });

        const terms = Object.values(termsMap).map(t => ({
            ...t,
            termGpa: t.totalCredits > 0 ? (t.weightedGpaSum / t.totalCredits).toFixed(2) : '0.00'
        }));

        const totalCredits = terms.reduce((s, t) => s + t.totalCredits, 0);
        const weightedSum = terms.reduce((s, t) => s + t.weightedGpaSum, 0);
        const cumulativeGpa = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : '0.00';

        res.status(200).json({ success: true, data: { terms, cumulativeGpa, totalCredits } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const formatExam = (e) => ({
    ...e,
    _id: e.id,
    classes: e.classes?.map(ec => ec.class) || []
});
