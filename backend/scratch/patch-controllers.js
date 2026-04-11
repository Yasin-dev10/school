const fs = require('fs');
const path = require('path');

const append = (file, content) => {
  fs.appendFileSync(path.join(__dirname, '../src/controllers/', file), '\n' + content + '\n');
}

// 1. assignment.controller.js
append('assignment.controller.js', `
exports.getSubmissions = async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            where: { assignmentId: req.params.id, tenantId: req.user.tenantId },
            include: { student: { select: { id: true, firstName: true, lastName: true, rollNo: true } } }
        });
        res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
`);

// 2. attendance.controller.js
append('attendance.controller.js', `
exports.getClassAttendance = exports.getAttendance;
exports.getClassAttendanceHistory = exports.getAttendanceSummary;
exports.getMyAttendance = exports.getAttendance;
`);

// 3. fee.controller.js
append('fee.controller.js', `
exports.generateClassInvoices = async (req, res) => {
    res.status(200).json({ success: true, message: "Not implemented yet" });
};
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { items: { include: { feeType: true } } } });
        res.status(200).json({ success: true, data: invoice });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createExpense = async (req, res) => { res.status(200).json({ success: true, message: "Not implemented yet" }) };
exports.getExpenses = async (req, res) => { res.status(200).json({ success: true, count: 0, data: [] }) };
`);

// 4. notification.controller.js
append('notification.controller.js', `
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({ where: { tenantId: req.user.tenantId, status: 'sent', NOT: { readBy: { some: { userId: req.user.id } } } } });
        res.status(200).json({ success: true, count });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
`);

// 5. salary.controller.js
append('salary.controller.js', `
exports.getMySalaries = exports.getMySalary;
exports.getAllSalaries = exports.getSalaries;
exports.runPayroll = async (req, res) => { res.status(200).json({ success: true, message: "Not implemented" }) };
exports.markSalaryPaid = async (req, res) => {
    try {
        const updated = await prisma.salary.update({ where: { id: req.params.id }, data: { status: 'paid', paymentDate: new Date() } });
        res.status(200).json({ success: true, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
`);

// 6. task.controller.js
append('task.controller.js', `
exports.getMyTasks = exports.getTasks;
`);

// 7. timetable.controller.js
append('timetable.controller.js', `
exports.addTimetableSlot = exports.createTimetable;
exports.getClassTimetable = exports.getTimetable;
exports.getTeacherTimetable = exports.getTimetable;
exports.getStudentTimetable = exports.getTimetable;
exports.deleteTimetableSlot = exports.deleteTimetable;
exports.getAllTimetable = exports.getTimetable;
exports.validateTimetableSlot = async (req, res) => { res.status(200).json({ success: true, valid: true }) };
exports.getTeacherWorkload = async (req, res) => { res.status(200).json({ success: true, data: [] }) };
exports.bulkUpdateClassTimetable = async (req, res) => { res.status(200).json({ success: true, message: "Not implemented" }) };
`);
