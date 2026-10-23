const prisma = require('../config/prismaClient');

const monthBounds = (value) => {
    const match = /^(\d{4})-(\d{2})$/.exec(value || '');
    if (!match) return null;
    const year = Number(match[1]); const month = Number(match[2]) - 1;
    if (month < 0 || month > 11) return null;
    return { start: new Date(Date.UTC(year, month, 1)), end: new Date(Date.UTC(year, month + 1, 1)) };
};
const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const percent = (n, d) => d ? Math.round(n / d * 100) : 0;
const ratingFor = (n) => n >= 90 ? 'Excellent' : n >= 80 ? 'Very Good' : n >= 70 ? 'Good' : n >= 60 ? 'Needs Improvement' : 'Poor';

exports.getPerformance = async (req, res, next) => {
    try {
        const tenantId = req.user.tenantId;
        const bounds = monthBounds(req.query.month) || (() => { const now = new Date(); return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) }; })();
        const { start, end } = bounds;
        const teacherId = req.user.role === 'teacher' ? req.user.id : (req.query.teacherId || undefined);
        const classId = req.query.classId || undefined;
        const subjectId = req.query.subjectId || undefined;
        const term = ['First_Term', 'Mid_Term', 'Final_Term', 'Unit_Test', 'Monthly_Test'].includes(req.query.term) ? req.query.term : undefined;
        const teacherFilter = teacherId ? { id: teacherId } : {};
        const scope = { tenantId, ...(teacherId ? { teachers: { some: { teacherId } } } : {}), ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}) };
        const [teachers, slots, holidays, attendance, assignments, quizzes, marks, evaluations] = await Promise.all([
            prisma.user.findMany({ where: { tenantId, role: 'teacher', status: 'active', ...teacherFilter }, select: { id: true, firstName: true, lastName: true } }),
            prisma.timetable.findMany({ where: scope, include: { teachers: { select: { teacherId: true } }, class: { select: { id: true, name: true, section: true, status: true } }, subject: { select: { id: true, name: true } } } }),
            prisma.schoolEvent.findMany({ where: { tenantId, type: 'holiday', cancelled: false, startAt: { lt: end }, endAt: { gte: start } }, select: { classId: true, startAt: true, endAt: true } }),
            prisma.attendance.findMany({ where: { tenantId, markedBy: { role: 'teacher', ...(teacherId ? { id: teacherId } : {}) }, date: { gte: start, lt: end }, ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}) }, select: { markedById: true, classId: true, subjectId: true, date: true, createdAt: true } }),
            prisma.assignment.findMany({ where: { tenantId, ...(teacherId ? { teacherId } : {}), ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), createdAt: { gte: start, lt: end } }, select: { teacherId: true, createdAt: true } }),
            prisma.quiz.findMany({ where: { course: { tenantId, ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(teacherId ? { createdById: teacherId } : {}) }, createdAt: { gte: start, lt: end } }, select: { createdAt: true, course: { select: { createdById: true } } } }),
            prisma.mark.findMany({ where: { tenantId, gradedById: teacherId ? teacherId : { not: null }, updatedAt: { gte: start, lt: end }, ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(term ? { exam: { term } } : {}) }, select: { gradedById: true, examId: true, marksObtained: true, maxMarks: true, updatedAt: true, exam: { select: { startDate: true, term: true } } } }),
            prisma.teacherPerformanceEvaluation.findMany({ where: { tenantId, ...(teacherId ? { teacherId } : {}), periodStart: { lt: end }, periodEnd: { gte: start } }, orderBy: { createdAt: 'desc' }, include: { reviewer: { select: { firstName: true, lastName: true } } } })
        ]);
        const daySlots = new Map();
        const today = new Date();
        for (const slot of slots) {
            if (slot.class.status !== 'active') continue;
            const owners = slot.teachers.map(x => x.teacherId).filter(id => teachers.some(t => t.id === id));
            for (let d = new Date(start); d < end && d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
                if (weekday[d.getUTCDay()] !== slot.day) continue;
                const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
                const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999);
                if (holidays.some(h => h.startAt <= dayEnd && h.endAt >= date && (!h.classId || h.classId === slot.classId))) continue;
                const lessonEnd = new Date(date); const [hh, mm] = slot.endTime.split(':').map(Number); lessonEnd.setUTCHours(hh || 0, mm || 0);
                if (date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10) && lessonEnd > today) continue;
                for (const id of owners) {
                    const key = `${id}|${slot.classId}|${slot.subjectId}|${date.toISOString().slice(0, 10)}`;
                    if (!daySlots.has(key)) daySlots.set(key, { teacherId: id, classId: slot.classId, subjectId: slot.subjectId, date });
                }
            }
        }
        const marked = new Map();
        for (const row of attendance) {
            const key = `${row.markedById}|${row.classId}|${row.subjectId || ''}|${row.date.toISOString().slice(0, 10)}`;
            if (!marked.has(key)) marked.set(key, row);
        }
        const markGroups = new Map();
        for (const mark of marks) {
            const item = markGroups.get(mark.gradedById) || { count: 0, scores: [], pass: 0, total: 0, byExam: new Map(), examIds: new Set(), resultEntries: [] };
            item.count++;
            item.examIds.add(mark.examId);
            item.resultEntries.push(mark.updatedAt);
            if (mark.maxMarks > 0) { const score = mark.marksObtained / mark.maxMarks * 100; item.scores.push(score); item.total++; if (score >= 50) item.pass++; }
            const examKey = `${mark.exam.startDate.toISOString().slice(0, 10)}:${mark.exam.term}`;
            const e = item.byExam.get(examKey) || { date: mark.exam.startDate, scores: [] };
            e.scores.push(mark.maxMarks > 0 ? mark.marksObtained / mark.maxMarks * 100 : 0); item.byExam.set(examKey, e);
            markGroups.set(mark.gradedById, item);
        }
        const rows = teachers.map(teacher => {
            const required = [...daySlots.values()].filter(x => x.teacherId === teacher.id);
            const completedRows = required.filter(x => marked.has(`${teacher.id}|${x.classId}|${x.subjectId}|${x.date.toISOString().slice(0, 10)}`));
            const missing = required.filter(x => !marked.has(`${teacher.id}|${x.classId}|${x.subjectId}|${x.date.toISOString().slice(0, 10)}`));
            const ownMarks = markGroups.get(teacher.id) || { count: 0, scores: [], pass: 0, total: 0, byExam: new Map(), examIds: new Set(), resultEntries: [] };
            const attendanceRate = percent(completedRows.length, required.length);
            const studentAverage = ownMarks.scores.length ? Math.round(ownMarks.scores.reduce((a,b) => a + b, 0) / ownMarks.scores.length) : null;
            const passRate = percent(ownMarks.pass, ownMarks.total);
            const lessonScore = attendanceRate;
            const examScore = ownMarks.total ? passRate : null;
            const components = [{ score: attendanceRate, weight: 40 }, { score: lessonScore, weight: 20 }, { score: examScore, weight: 15 }, { score: null, weight: 10 }, { score: studentAverage, weight: 15 }].filter(x => x.score !== null);
            const overall = components.length ? Math.round(components.reduce((sum, x) => sum + x.score * x.weight, 0) / components.reduce((sum, x) => sum + x.weight, 0)) : 0;
            const logs = attendance.filter(a => a.markedById === teacher.id).sort((a,b) => b.createdAt-a.createdAt).slice(0, 8).map(a => ({ date: a.date, recordedAt: a.createdAt, classId: a.classId, subjectId: a.subjectId }));
            const examAverages = [...ownMarks.byExam.values()].map(e => ({ date: e.date, average: e.scores.length ? e.scores.reduce((a,b)=>a+b,0)/e.scores.length : 0 })).sort((a,b)=>a.date-b.date);
            const [previous, current] = examAverages.slice(-2);
            return { teacherId: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`, attendance: { required: required.length, completed: completedRows.length, missing: missing.length, rate: attendanceRate, missingLessons: missing.slice(0, 40).map(x => ({ date: x.date, classId: x.classId, subjectId: x.subjectId })), activity: logs }, teaching: { completed: completedRows.length, scheduled: required.length, assignments: assignments.filter(a => a.teacherId === teacher.id).length, quizzes: quizzes.filter(q => q.course.createdById === teacher.id).length }, exams: { graded: ownMarks.examIds.size, resultsEntered: ownMarks.count, average: studentAverage, passRate, trend: previous && current ? Math.round((current.average - previous.average) * 10) / 10 : null }, punctuality: { lessonStartTrackingAvailable: false, resultEntries: ownMarks.resultEntries.sort((a,b)=>b-a).slice(0, 8) }, overall, rating: ratingFor(overall), evaluations: evaluations.filter(e => e.teacherId === teacher.id) };
        });
        res.json({ success: true, data: { period: { start, end, month: start.toISOString().slice(0,7) }, rows, totals: { teachers: rows.length, averageScore: rows.length ? Math.round(rows.reduce((a,r)=>a+r.overall,0)/rows.length) : 0, missingAttendance: rows.reduce((a,r)=>a+r.attendance.missing,0) } } });
    } catch (error) { next(error); }
};

exports.getEvaluations = async (req, res, next) => {
    try {
        const teacherId = req.user.role === 'teacher' ? req.user.id : (req.query.teacherId || undefined);
        const rows = await prisma.teacherPerformanceEvaluation.findMany({ where: { tenantId: req.user.tenantId, ...(teacherId ? { teacherId } : {}) }, orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }], include: { teacher: { select: { id: true, firstName: true, lastName: true } }, reviewer: { select: { firstName: true, lastName: true } } } });
        res.json({ success: true, data: rows });
    } catch (error) { next(error); }
};
exports.saveEvaluation = async (req, res, next) => {
    try {
        const { teacherId, periodType, periodStart, periodEnd, rating, notes, improvements } = req.body;
        const start = new Date(periodStart); const end = new Date(periodEnd);
        if (!teacherId || !['monthly','term','annual'].includes(periodType) || !Number.isInteger(rating) || rating < 1 || rating > 5 || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return res.status(400).json({ success: false, message: 'Provide a teacher, valid period, and rating from 1 to 5.' });
        const teacher = await prisma.user.findFirst({ where: { id: teacherId, tenantId: req.user.tenantId, role: 'teacher' }, select: { id: true } });
        if (!teacher) return res.status(404).json({ success: false, message: 'Teacher not found.' });
        const evaluation = await prisma.teacherPerformanceEvaluation.create({ data: { tenantId: req.user.tenantId, teacherId, reviewerId: req.user.id, periodType, periodStart: start, periodEnd: end, rating, notes: notes?.trim() || null, improvements: improvements?.trim() || null } });
        res.status(201).json({ success: true, data: evaluation });
    } catch (error) { next(error); }
};
