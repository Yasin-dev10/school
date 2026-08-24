const prisma = require('../config/prismaClient');

// @desc    Get class performance analytics
exports.getClassAnalytics = async (req, res) => {
    try {
        const { classId } = req.params;
        const tenantId = req.user.tenantId;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const [allMarks, recentAttendance] = await Promise.all([
            prisma.mark.findMany({
                where: { classId, tenantId },
                include: {
                    subject: { select: { id: true, name: true } },
                    student: { select: { id: true, firstName: true, lastName: true } }
                }
            }),
            prisma.attendance.findMany({
                where: { classId, tenantId, date: { gte: sevenDaysAgo } }
            })
        ]);

        // 1. Average marks by subject
        const subjectMap = {};
        allMarks.forEach(m => {
            const key = m.subject.name;
            if (!subjectMap[key]) subjectMap[key] = { name: key, scores: [], total: 0 };
            subjectMap[key].scores.push(m.marksObtained);
            subjectMap[key].total += m.marksObtained;
        });
        const marksBySubject = Object.values(subjectMap).map(s => ({
            subjectName: s.name,
            avgScore: parseFloat((s.total / s.scores.length).toFixed(2)),
            maxScore: Math.max(...s.scores),
            minScore: Math.min(...s.scores)
        }));

        // 2. Attendance trends (last 7 days)
        const attendanceTrendMap = {};
        recentAttendance.forEach(a => {
            const dateStr = a.date.toISOString().split('T')[0];
            if (!attendanceTrendMap[dateStr]) attendanceTrendMap[dateStr] = { date: dateStr, present: 0, total: 0 };
            attendanceTrendMap[dateStr].total++;
            if (a.status === 'present') attendanceTrendMap[dateStr].present++;
        });
        const attendanceTrends = Object.values(attendanceTrendMap).sort((a, b) => a.date.localeCompare(b.date));

        // 3. Grade matrix (student → subject → score)
        const studentMap = {};
        allMarks.forEach(m => {
            const sid = m.studentId;
            if (!studentMap[sid]) {
                studentMap[sid] = { name: `${m.student.firstName} ${m.student.lastName}`, marks: [] };
            }
            studentMap[sid].marks.push({ subject: m.subject.name, score: m.marksObtained });
        });
        const gradeMatrix = Object.values(studentMap);

        // 4. Low attendance alerts (<75%)
        const studentAttendance = {};
        const allClassAttendance = await prisma.attendance.findMany({ where: { classId, tenantId } });
        allClassAttendance.forEach(a => {
            if (!studentAttendance[a.studentId]) studentAttendance[a.studentId] = { present: 0, total: 0 };
            studentAttendance[a.studentId].total++;
            if (a.status === 'present') studentAttendance[a.studentId].present++;
        });

        const lowAttendanceIds = Object.entries(studentAttendance)
            .filter(([, v]) => v.total > 0 && (v.present / v.total) * 100 < 75)
            .map(([id, v]) => ({ studentId: id, rate: ((v.present / v.total) * 100).toFixed(1) }));

        const lowAttendanceUsers = await prisma.user.findMany({
            where: { id: { in: lowAttendanceIds.map(l => l.studentId) } },
            select: { id: true, firstName: true, lastName: true }
        });

        const lowAttendanceAlerts = lowAttendanceIds.map(l => {
            const user = lowAttendanceUsers.find(u => u.id === l.studentId);
            return { studentName: user ? `${user.firstName} ${user.lastName}` : 'Unknown', attendanceRate: parseFloat(l.rate) };
        });

        res.status(200).json({
            success: true,
            data: { marksBySubject, attendanceTrends, gradeMatrix, lowAttendanceAlerts }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student analytics
exports.getStudentAnalytics = async (req, res) => {
    try {
        const { studentId } = req.params;
        const tenantId = req.user.tenantId;

        if (req.user.role === 'student' && studentId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (req.user.role === 'parent') {
            const link = await prisma.studentParent.findFirst({
                where: { parentId: req.user.id, studentId }
            });
            if (!link) return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (req.user.role === 'teacher') {
            const { canTeacherAccessStudent } = require('../utils/teacherScope');
            const allowed = await canTeacherAccessStudent(req.user.id, studentId, tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }

        const [marks, attendanceRecords] = await Promise.all([
            prisma.mark.findMany({
                where: { studentId, tenantId },
                include: {
                    subject: { select: { id: true, name: true } },
                    exam: { select: { id: true, name: true } }
                },
                orderBy: { createdAt: 'asc' }
            }),
            prisma.attendance.findMany({ where: { studentId, tenantId } })
        ]);

        const attendanceMap = {};
        attendanceRecords.forEach(a => {
            const status = a.status;
            attendanceMap[status] = (attendanceMap[status] || 0) + 1;
        });
        const attendanceSummary = Object.entries(attendanceMap).map(([status, count]) => ({ _id: status, count }));

        res.status(200).json({ success: true, data: { marks, attendanceSummary } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Admin dashboard stats
exports.getAdminDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const now = new Date();
        const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
        const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(now.getMonth() - 6);
        const fourteenDaysAgo = new Date(); fourteenDaysAgo.setDate(now.getDate() - 14);

        const [studentCount, teacherCount, parentCount, classCount, invoices, todayAttendance, recentAttendance] = await Promise.all([
            prisma.user.count({ where: { tenantId, role: 'student' } }),
            prisma.user.count({ where: { tenantId, role: 'teacher' } }),
            prisma.user.count({ where: { tenantId, role: 'parent' } }),
            prisma.class.count({ where: { tenantId, status: 'active' } }),
            prisma.invoice.findMany({ where: { tenantId }, select: { totalAmount: true, paidAmount: true, createdAt: true } }),
            prisma.attendance.findMany({ where: { tenantId, date: { gte: startOfDay, lte: endOfDay } } }),
            prisma.attendance.findMany({ where: { tenantId, date: { gte: fourteenDaysAgo } } })
        ]);

        // Finance summary
        const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
        const finance = { totalRevenue, collected, pending: totalRevenue - collected };

        // Today attendance
        const presentToday = todayAttendance.filter(a => a.status === 'present').length;
        const attendanceRate = todayAttendance.length > 0 ? Math.round((presentToday / todayAttendance.length) * 100) : 0;

        // Attendance trend (14 days)
        const trendMap = {};
        recentAttendance.forEach(a => {
            const d = a.date.toISOString().split('T')[0];
            if (!trendMap[d]) trendMap[d] = { present: 0, total: 0 };
            trendMap[d].total++;
            if (a.status === 'present') trendMap[d].present++;
        });
        const attendanceTrend = Object.entries(trendMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({ date, rate: v.total > 0 ? ((v.present / v.total) * 100).toFixed(1) : '0' }));

        // Finance trends (6 months)
        const financeTrendMap = {};
        invoices.filter(i => i.createdAt >= sixMonthsAgo).forEach(i => {
            const month = i.createdAt.getMonth() + 1;
            if (!financeTrendMap[month]) financeTrendMap[month] = { revenue: 0, collected: 0 };
            financeTrendMap[month].revenue += i.totalAmount;
            financeTrendMap[month].collected += i.paidAmount;
        });
        const financeTrends = Object.entries(financeTrendMap).map(([month, v]) => ({ _id: Number(month), ...v }));

        // Students by class
        const students = await prisma.user.findMany({
            where: { tenantId, role: 'student' },
            select: { profileClass: true, gender: true, createdAt: true }
        });

        const classDistMap = {};
        const genderMap = {};
        const enrollMap = {};
        students.forEach(s => {
            if (s.profileClass) classDistMap[s.profileClass] = (classDistMap[s.profileClass] || 0) + 1;
            if (s.gender) genderMap[s.gender] = (genderMap[s.gender] || 0) + 1;
            if (s.createdAt >= sixMonthsAgo) {
                const month = s.createdAt.getMonth() + 1;
                enrollMap[month] = (enrollMap[month] || 0) + 1;
            }
        });

        const classDistribution = Object.entries(classDistMap).map(([cls, count]) => ({ _id: cls, count }));
        const genderDemographics = Object.entries(genderMap).map(([gender, count]) => ({ _id: gender, count }));
        const enrollmentGrowth = Object.entries(enrollMap).map(([month, count]) => ({ _id: Number(month), count }));

        res.status(200).json({
            success: true,
            data: {
                counts: { students: studentCount, teachers: teacherCount, parents: parentCount, classes: classCount },
                finance,
                attendance: { rate: attendanceRate, total: todayAttendance.length, present: presentToday, trends: attendanceTrend },
                trends: { finance: financeTrends, enrollment: enrollmentGrowth },
                distribution: { classes: classDistribution },
                demographics: { gender: genderDemographics }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Finance analytics
exports.getFinanceAnalytics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const [invoiceItems, outstanding] = await Promise.all([
            prisma.invoiceItem.findMany({
                where: { invoice: { tenantId } },
                include: { invoice: { select: { tenantId: true } } }
            }),
            prisma.invoice.findMany({
                where: { tenantId, status: { in: ['unpaid', 'partially_paid'] } },
                include: { student: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { dueDate: 'asc' },
                take: 10
            })
        ]);

        const categoryMap = {};
        invoiceItems.forEach(item => {
            const name = item.name || 'Unknown';
            categoryMap[name] = (categoryMap[name] || 0) + (item.amount || 0);
        });
        const revenueByCategory = Object.entries(categoryMap).map(([name, total]) => ({ _id: name, total }));

        res.status(200).json({ success: true, data: { revenueByCategory, outstanding } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Staff analytics
exports.getStaffAnalytics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        const timetables = await prisma.timetable.findMany({
            where: { tenantId },
            include: {
                teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } }
            }
        });

        const workloadMap = {};
        timetables.forEach(slot => {
            slot.teachers.forEach(tt => {
                const tid = tt.teacher.id;
                if (!workloadMap[tid]) workloadMap[tid] = { teacher: tt.teacher, periods: 0 };
                workloadMap[tid].periods++;
            });
        });

        const workload = Object.values(workloadMap).map(w => ({
            teacherName: `${w.teacher.firstName} ${w.teacher.lastName}`,
            periodsCount: w.periods
        }));

        res.status(200).json({ success: true, data: { workload } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Advanced, school-wide decision support analytics
exports.getAdvancedAnalytics = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const now = new Date();
        const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
        const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 5); sixMonthsAgo.setDate(1);

        const [students, marks, attendance, invoices, timetables, teachers] = await Promise.all([
            prisma.user.findMany({ where: { tenantId, role: 'student', status: 'active' }, select: { id: true, firstName: true, lastName: true, profileClass: true } }),
            prisma.mark.findMany({ where: { tenantId }, select: { studentId: true, marksObtained: true, maxMarks: true, subject: { select: { id: true, name: true } } } }),
            prisma.attendance.findMany({ where: { tenantId, date: { gte: ninetyDaysAgo } }, select: { studentId: true, date: true, status: true } }),
            prisma.invoice.findMany({ where: { tenantId }, select: { studentId: true, totalAmount: true, paidAmount: true, createdAt: true } }),
            prisma.timetable.findMany({ where: { tenantId }, include: { teachers: { select: { teacherId: true } } } }),
            prisma.user.findMany({ where: { tenantId, role: 'teacher', status: 'active' }, select: { id: true, firstName: true, lastName: true } })
        ]);

        const studentStats = new Map(students.map(s => [s.id, { student: s, scoreTotal: 0, scoreCount: 0, present: 0, attendance: 0, outstanding: 0 }]));
        const subjectMap = new Map();
        marks.forEach(m => {
            const percentage = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
            const stat = studentStats.get(m.studentId);
            if (stat) { stat.scoreTotal += percentage; stat.scoreCount++; }
            const subject = subjectMap.get(m.subject.id) || { subjectId: m.subject.id, subjectName: m.subject.name, total: 0, count: 0 };
            subject.total += percentage; subject.count++; subjectMap.set(m.subject.id, subject);
        });
        attendance.forEach(a => {
            const stat = studentStats.get(a.studentId);
            if (stat) { stat.attendance++; if (a.status === 'present') stat.present++; }
        });
        invoices.forEach(i => { const stat = studentStats.get(i.studentId); if (stat) stat.outstanding += Math.max(0, i.totalAmount - i.paidAmount); });

        const studentsAtRisk = [...studentStats.values()].map(s => {
            const averageScore = s.scoreCount ? s.scoreTotal / s.scoreCount : null;
            const attendanceRate = s.attendance ? (s.present / s.attendance) * 100 : null;
            const reasons = [];
            if (averageScore !== null && averageScore < 50) reasons.push('Low academic performance');
            if (attendanceRate !== null && attendanceRate < 75) reasons.push('Low attendance');
            if (s.outstanding > 0) reasons.push('Outstanding fees');
            const riskScore = Math.min(100, (averageScore !== null ? Math.max(0, 50 - averageScore) : 0) + (attendanceRate !== null ? Math.max(0, 75 - attendanceRate) : 0) * 1.5 + (s.outstanding > 0 ? 15 : 0));
            return { studentId: s.student.id, studentName: `${s.student.firstName} ${s.student.lastName}`, className: s.student.profileClass || 'Unassigned', averageScore: averageScore === null ? null : +averageScore.toFixed(1), attendanceRate: attendanceRate === null ? null : +attendanceRate.toFixed(1), outstandingFees: +s.outstanding.toFixed(2), riskScore: +riskScore.toFixed(1), reasons };
        }).filter(s => s.reasons.length && s.riskScore > 0).sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);

        const dailyMap = new Map();
        attendance.forEach(a => {
            const date = a.date.toISOString().slice(0, 10);
            const day = dailyMap.get(date) || { date, present: 0, total: 0 };
            day.total++; if (a.status === 'present') day.present++; dailyMap.set(date, day);
        });
        const attendanceTrend = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).map(d => ({ date: d.date, rate: +(d.present / d.total * 100).toFixed(1), total: d.total }));
        const recent = attendanceTrend.slice(-7); const prior = attendanceTrend.slice(-14, -7);
        const avg = arr => arr.length ? arr.reduce((sum, item) => sum + item.rate, 0) / arr.length : 0;
        const recentAvg = avg(recent), priorAvg = avg(prior), change = recentAvg - priorAvg;
        const attendanceAlerts = [];
        if (recent.length && recentAvg < 80) attendanceAlerts.push({ severity: 'high', title: 'Attendance below target', message: `The 7-day average is ${recentAvg.toFixed(1)}%.` });
        if (prior.length && change <= -5) attendanceAlerts.push({ severity: 'medium', title: 'Attendance is declining', message: `Attendance fell ${Math.abs(change).toFixed(1)} points versus the previous week.` });

        const subjectPerformance = [...subjectMap.values()].map(s => ({ subjectId: s.subjectId, subjectName: s.subjectName, averageScore: +(s.total / s.count).toFixed(1), assessments: s.count })).sort((a, b) => b.averageScore - a.averageScore);
        const periodMap = new Map(); timetables.forEach(slot => slot.teachers.forEach(link => periodMap.set(link.teacherId, (periodMap.get(link.teacherId) || 0) + 1)));
        const teacherWorkload = teachers.map(t => ({ teacherId: t.id, teacherName: `${t.firstName} ${t.lastName}`, periodsPerWeek: periodMap.get(t.id) || 0 })).sort((a, b) => b.periodsPerWeek - a.periodsPerWeek);

        const collectionMap = new Map();
        for (let offset = 0; offset < 6; offset++) { const d = new Date(sixMonthsAgo); d.setMonth(d.getMonth() + offset); collectionMap.set(d.toISOString().slice(0, 7), 0); }
        invoices.filter(i => i.createdAt >= sixMonthsAgo).forEach(i => { const key = i.createdAt.toISOString().slice(0, 7); if (collectionMap.has(key)) collectionMap.set(key, collectionMap.get(key) + i.paidAmount); });
        const history = [...collectionMap.entries()].map(([month, collected]) => ({ month, collected: +collected.toFixed(2) }));
        const values = history.map(h => h.collected); const n = values.length;
        const slope = n > 1 ? (n * values.reduce((s, y, x) => s + x * y, 0) - values.reduce((a, b) => a + b, 0) * values.reduce((s, _, x) => s + x, 0)) / (n * values.reduce((s, _, x) => s + x * x, 0) - Math.pow(values.reduce((s, _, x) => s + x, 0), 2)) : 0;
        const intercept = n ? (values.reduce((a, b) => a + b, 0) - slope * values.reduce((s, _, x) => s + x, 0)) / n : 0;
        const forecast = [1, 2, 3].map(offset => { const d = new Date(now.getFullYear(), now.getMonth() + offset, 1); return { month: d.toISOString().slice(0, 7), projected: +Math.max(0, intercept + slope * (n - 1 + offset)).toFixed(2) }; });

        res.status(200).json({ success: true, data: { generatedAt: now, studentsAtRisk, attendance: { trend: attendanceTrend, alerts: attendanceAlerts, recentAverage: +recentAvg.toFixed(1), change: +change.toFixed(1) }, subjectPerformance, teacherWorkload, feeForecast: { history, forecast } } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
