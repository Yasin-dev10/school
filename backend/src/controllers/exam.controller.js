const prisma = require('../config/prismaClient');
const { buildCombinedRankings } = require('../utils/combinedRankings');
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

const examScheduleInclude = {
    exam: { select: { id: true, name: true, term: true, startDate: true, endDate: true } },
    class: { select: { id: true, name: true, section: true } },
    subject: { select: { id: true, name: true, code: true } },
    invigilators: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }
};

const formatExamSchedule = (slot) => ({
    ...slot,
    _id: slot.id,
    exam: slot.exam && { ...slot.exam, _id: slot.exam.id },
    class: slot.class && { ...slot.class, _id: slot.class.id },
    subject: slot.subject && { ...slot.subject, _id: slot.subject.id },
    invigilators: (slot.invigilators || []).map(item => ({ ...item.teacher, _id: item.teacher.id }))
});

const scheduleDate = (value) => {
    if (value instanceof Date) {
        // Exam dates are entered as local calendar dates; preserve that date when Prisma returns a Date object.
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
    return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
};

// @desc Create an exam schedule slot
exports.createExamSchedule = async (req, res) => {
    try {
        const { examId, classId, subjectId, date, startTime, endTime, room, invigilators = [] } = req.body;
        const tenantId = req.user.tenantId;
        if (!examId || !classId || !subjectId || !date || !startTime || !endTime || startTime >= endTime) {
            return res.status(400).json({ success: false, message: 'Exam, class, subject, date and a valid time range are required' });
        }

        const uniqueTeachers = [...new Set(invigilators)];
        const [exam, schoolClass, classSubject, teacherCount] = await Promise.all([
            prisma.exam.findFirst({ where: { id: examId, tenantId }, include: { classes: true } }),
            prisma.class.findFirst({ where: { id: classId, tenantId } }),
            prisma.classSubject.findFirst({ where: { classId, subjectId } }),
            uniqueTeachers.length ? prisma.user.count({ where: { id: { in: uniqueTeachers }, tenantId, role: 'teacher', status: 'active' } }) : 0
        ]);
        if (!exam || !schoolClass) return res.status(404).json({ success: false, message: 'Exam or class not found' });
        if (!exam.classes.some(item => item.classId === classId)) return res.status(400).json({ success: false, message: 'This class is not assigned to the selected exam' });
        if (!classSubject) return res.status(400).json({ success: false, message: 'This subject is not assigned to the selected class' });
        if (teacherCount !== uniqueTeachers.length) return res.status(400).json({ success: false, message: 'One or more invigilators are invalid' });

        const slotDate = scheduleDate(date);
        const startBoundary = scheduleDate(exam.startDate);
        const endBoundary = scheduleDate(exam.endDate);
        if (slotDate < startBoundary || slotDate > endBoundary) {
            return res.status(400).json({ success: false, message: 'Schedule date must fall within the exam date range' });
        }

        const overlapping = { date: slotDate, startTime: { lt: endTime }, endTime: { gt: startTime } };
        const conflicts = await prisma.examSchedule.findMany({
            where: {
                tenantId,
                ...overlapping,
                OR: [
                    { classId },
                    ...(room ? [{ room: { equals: room, mode: 'insensitive' } }] : []),
                    ...(uniqueTeachers.length ? [{ invigilators: { some: { teacherId: { in: uniqueTeachers } } } }] : [])
                ]
            },
            include: examScheduleInclude
        });
        if (conflicts.length) return res.status(409).json({ success: false, message: 'Class, room, or invigilator has another exam at this time', conflicts: conflicts.map(formatExamSchedule) });

        const slot = await prisma.examSchedule.create({
            data: {
                examId, classId, subjectId, date: slotDate, startTime, endTime,
                room: room?.trim() || null, tenantId,
                ...(uniqueTeachers.length && { invigilators: { create: uniqueTeachers.map(teacherId => ({ teacherId })) } })
            },
            include: examScheduleInclude
        });
        emitToTenant(tenantId, 'exam-schedule:created', slot);
        res.status(201).json({ success: true, data: formatExamSchedule(slot) });
    } catch (error) {
        const message = error.code === 'P2002' ? 'This subject is already scheduled for this class and exam' : error.message;
        res.status(error.code === 'P2002' ? 409 : 500).json({ success: false, message });
    }
};

// @desc Generate two exam subjects per day for every class assigned to an exam
exports.generateExamSchedule = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            examId,
            startDate,
            firstStart = '08:00', firstEnd = '10:00',
            secondStart = '10:30', secondEnd = '12:30',
            replaceExisting = false
        } = req.body;
        if (!examId || firstStart >= firstEnd || secondStart >= secondEnd || firstEnd > secondStart) {
            return res.status(400).json({ success: false, message: 'Exam and valid, non-overlapping session times are required' });
        }

        const exam = await prisma.exam.findFirst({
            where: { id: examId, tenantId },
            include: {
                classes: {
                    include: {
                        class: {
                            include: { subjects: { select: { subjectId: true } } }
                        }
                    }
                }
            }
        });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        if (!exam.classes.length) return res.status(400).json({ success: false, message: 'No classes are assigned to this exam' });

        const availableDates = [];
        const selectedStartDate = startDate ? scheduleDate(startDate) : scheduleDate(exam.startDate);
        const cursor = new Date(selectedStartDate);
        const lastDate = scheduleDate(exam.endDate);
        while (cursor <= lastDate) {
            // Friday is the weekly holiday; Saturday through Thursday are exam days.
            if (cursor.getUTCDay() !== 5) availableDates.push(new Date(cursor));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        const largestSubjectCount = Math.max(...exam.classes.map(item => item.class.subjects.length));
        const requiredDays = Math.ceil(largestSubjectCount / 2);
        // Extend the schedule when the configured exam range is too short, rather than dropping subjects.
        while (availableDates.length < requiredDays) {
            if (cursor.getUTCDay() !== 5) availableDates.push(new Date(cursor));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        const generatedEndDate = availableDates[requiredDays - 1];

        const rows = exam.classes.flatMap(item => item.class.subjects.map((classSubject, index) => ({
            examId,
            classId: item.classId,
            subjectId: classSubject.subjectId,
            date: availableDates[Math.floor(index / 2)],
            startTime: index % 2 === 0 ? firstStart : secondStart,
            endTime: index % 2 === 0 ? firstEnd : secondEnd,
            room: item.class.subjects.length ? `${item.class.name}-${item.class.section}` : null,
            tenantId
        })));

        await prisma.$transaction(async tx => {
            if (replaceExisting) await tx.examSchedule.deleteMany({ where: { examId, tenantId } });
            await tx.examSchedule.createMany({ data: rows, skipDuplicates: true });
            await tx.exam.update({
                where: { id: examId },
                data: {
                    ...(startDate && { startDate: selectedStartDate }),
                    ...(generatedEndDate > scheduleDate(exam.endDate) && { endDate: generatedEndDate })
                }
            });
        });

        const schedules = await prisma.examSchedule.findMany({ where: { examId, tenantId }, include: examScheduleInclude, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
        emitToTenant(tenantId, 'exam-schedule:generated', { examId, count: schedules.length });
        res.status(201).json({ success: true, count: schedules.length, data: schedules.map(formatExamSchedule) });
    } catch (error) {
        console.error('Exam schedule generation failed:', error);
        res.status(500).json({ success: false, message: 'Jadwalka lama samayn karin. Fadlan mar kale isku day.' });
    }
};

// @desc Get exam schedule visible to the signed-in user
exports.getExamSchedules = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const where = { tenantId };
        if (req.query.examId) where.examId = req.query.examId;
        if (req.query.classId) where.classId = req.query.classId;

        if (req.user.role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, tenantId);
            where.OR = [{ invigilators: { some: { teacherId: req.user.id } } }, { classId: { in: scope.classIds } }];
        } else if (req.user.role === 'student') {
            const profileClass = req.user.profile?.class || req.user.profileClass;
            const profileSection = req.user.profile?.section || req.user.profileSection;
            const cls = profileClass && await prisma.class.findFirst({ where: { tenantId, name: profileClass, ...(profileSection && { section: profileSection }) } });
            where.classId = cls?.id || '__none__';
        } else if (req.user.role === 'parent') {
            const children = await prisma.user.findMany({ where: { tenantId, role: 'student', parentLinks: { some: { parentId: req.user.id } } }, select: { profileClass: true, profileSection: true } });
            const classFilters = children.filter(c => c.profileClass).map(c => ({ name: c.profileClass, ...(c.profileSection && { section: c.profileSection }) }));
            const childClasses = classFilters.length ? await prisma.class.findMany({ where: { tenantId, OR: classFilters }, select: { id: true } }) : [];
            where.classId = { in: childClasses.map(c => c.id) };
        }

        const slots = await prisma.examSchedule.findMany({ where, include: examScheduleInclude, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
        res.json({ success: true, count: slots.length, data: slots.map(formatExamSchedule) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Delete an exam schedule slot
exports.deleteExamSchedule = async (req, res) => {
    try {
        const slot = await prisma.examSchedule.findFirst({ where: { id: req.params.scheduleId, tenantId: req.user.tenantId } });
        if (!slot) return res.status(404).json({ success: false, message: 'Exam schedule not found' });
        if (req.query.applyToAllClasses === 'true') {
            await prisma.examSchedule.deleteMany({ where: { tenantId: req.user.tenantId, examId: slot.examId, subjectId: slot.subjectId } });
        } else {
            await prisma.examSchedule.delete({ where: { id: slot.id } });
        }
        emitToTenant(req.user.tenantId, 'exam-schedule:deleted', { scheduleId: slot.id, allClasses: req.query.applyToAllClasses === 'true' });
        res.json({ success: true, message: 'Exam schedule deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Delete every schedule slot for one exam
exports.deleteFullExamSchedule = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const exam = await prisma.exam.findFirst({ where: { id: req.params.examId, tenantId }, select: { id: true, name: true } });
        if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
        const result = await prisma.examSchedule.deleteMany({ where: { examId: exam.id, tenantId } });
        emitToTenant(tenantId, 'exam-schedule:deleted-all', { examId: exam.id, count: result.count });
        res.json({ success: true, count: result.count, message: `Jadwalka ${exam.name} waa la tirtiray` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update an exam schedule slot
exports.updateExamSchedule = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const current = await prisma.examSchedule.findFirst({ where: { id: req.params.scheduleId, tenantId } });
        if (!current) return res.status(404).json({ success: false, message: 'Exam schedule not found' });

        const applyToAllClasses = req.body.applyToAllClasses === true;
        const matchingSlots = applyToAllClasses
            ? await prisma.examSchedule.findMany({ where: { tenantId, examId: current.examId, subjectId: current.subjectId } })
            : [current];
        const targetIds = matchingSlots.map(slot => slot.id);
        const targetClassIds = matchingSlots.map(slot => slot.classId);
        const classId = req.body.classId || current.classId;
        const subjectId = req.body.subjectId || current.subjectId;
        const date = req.body.date ? scheduleDate(req.body.date) : current.date;
        const startTime = req.body.startTime || current.startTime;
        const endTime = req.body.endTime || current.endTime;
        const room = req.body.room !== undefined ? req.body.room.trim() || null : current.room;
        if (startTime >= endTime) return res.status(400).json({ success: false, message: 'Waqtiga bilowga waa inuu ka horreeyaa waqtiga dhammaadka' });

        const examClass = await prisma.examClass.findFirst({ where: { examId: current.examId, classId } });
        if (!examClass) return res.status(400).json({ success: false, message: 'Fasalkan kuma jiro imtixaanka la doortay' });

        // Selecting another subject that is already on this exam means "swap subjects".
        // Keep both subject identities unique and exchange their date/time positions across every class.
        if (applyToAllClasses && subjectId !== current.subjectId) {
            const replacementSlots = await prisma.examSchedule.findMany({
                where: { tenantId, examId: current.examId, subjectId }
            });
            if (replacementSlots.length) {
                const swapped = await prisma.$transaction(async tx => {
                    for (const target of matchingSlots) {
                        const replacement = replacementSlots.find(slot => slot.classId === target.classId);
                        if (!replacement) continue;
                        // Vacate the source position first so the database uniqueness constraint
                        // remains valid throughout the swap transaction.
                        await tx.examSchedule.update({
                            where: { id: target.id },
                            data: { startTime: `swap-${target.id}` }
                        });
                        await tx.examSchedule.update({
                            where: { id: replacement.id },
                            data: { date: target.date, startTime: target.startTime, endTime: target.endTime }
                        });
                        await tx.examSchedule.update({
                            where: { id: target.id },
                            data: { date: replacement.date, startTime: replacement.startTime, endTime: replacement.endTime }
                        });
                    }
                    return tx.examSchedule.findUnique({ where: { id: current.id }, include: examScheduleInclude });
                });
                emitToTenant(tenantId, 'exam-schedule:updated', swapped);
                return res.json({ success: true, swapped: true, data: formatExamSchedule(swapped) });
            }
        }

        const conflicts = await prisma.examSchedule.findMany({
            where: {
                tenantId, id: { notIn: targetIds }, date,
                startTime: { lt: endTime }, endTime: { gt: startTime },
                OR: [{ classId: { in: applyToAllClasses ? targetClassIds : [classId] } }, ...(!applyToAllClasses && room ? [{ room: { equals: room, mode: 'insensitive' } }] : [])]
            }
        });
        const otherExamConflict = conflicts.some(slot => slot.examId !== current.examId);
        if (conflicts.length && (!applyToAllClasses || otherExamConflict)) return res.status(409).json({ success: false, message: 'Fasalka ama qolka ayaa imtixaan kale leh waqtigan' });

        const updated = await prisma.$transaction(async tx => {
            if (applyToAllClasses) {
                // If the destination is occupied, swap that subject into the edited subject's old slot.
                for (const target of matchingSlots) {
                    const occupied = conflicts.find(slot => slot.classId === target.classId);
                    if (!occupied) continue;
                    await tx.examSchedule.update({
                        where: { id: target.id },
                        data: { startTime: `swap-${target.id}` }
                    });
                    await tx.examSchedule.update({
                        where: { id: occupied.id },
                        data: { date: target.date, startTime: target.startTime, endTime: target.endTime }
                    });
                }
                for (const target of matchingSlots) {
                    await tx.examSchedule.update({ where: { id: target.id }, data: { subjectId, date, startTime, endTime } });
                }
            } else {
                await tx.examSchedule.update({ where: { id: current.id }, data: { classId, subjectId, date, startTime, endTime, room } });
            }
            const exam = await tx.exam.findUnique({ where: { id: current.examId }, select: { endDate: true } });
            if (exam && date > scheduleDate(exam.endDate)) await tx.exam.update({ where: { id: current.examId }, data: { endDate: date } });
            return tx.examSchedule.findUnique({ where: { id: current.id }, include: examScheduleInclude });
        });
        emitToTenant(tenantId, 'exam-schedule:updated', updated);
        res.json({ success: true, data: formatExamSchedule(updated) });
    } catch (error) {
        const message = error.code === 'P2002' ? 'Maaddadan hore ayaa loogu jadwaleeyey fasalkan' : error.message;
        res.status(error.code === 'P2002' ? 409 : 500).json({ success: false, message });
    }
};

// @desc    Combined rankings across every accessible class
exports.getCombinedRankings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const examIds = String(req.query.examIds || '')
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);

        if (!examIds.length) {
            return res.status(400).json({ success: false, message: 'Select at least one exam' });
        }

        let classWhere = { tenantId };
        let teacherScope = null;
        if (req.user.role === 'teacher') {
            teacherScope = await getTeacherScope(req.user.id, tenantId);
            classWhere.id = { in: teacherScope.classIds };
        }

        const classes = await prisma.class.findMany({
            where: classWhere,
            select: {
                id: true,
                name: true,
                grade: true,
                section: true,
                subjects: { select: { subjectId: true } }
            },
            orderBy: [{ name: 'asc' }, { section: 'asc' }]
        });
        const classIds = classes.map(c => c.id);
        if (!classIds.length) {
            return res.status(200).json({ success: true, data: { classLeaders: [], overall: [] } });
        }

        const marks = await prisma.mark.findMany({
            where: {
                tenantId,
                examId: { in: examIds },
                classId: { in: classIds }
            },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, rollNo: true, studentId: true } }
            }
        });

        const rankings = buildCombinedRankings({
            classes,
            marks,
            accessibleSubjectIds: teacherScope?.subjectIds || null
        });
        res.status(200).json({ success: true, data: rankings });
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
