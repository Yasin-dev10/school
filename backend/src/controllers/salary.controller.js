const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

// @desc    Create salary record
exports.createSalary = async (req, res) => {
    try {
        const { userId, month, year, basicSalary, allowances, deductions, netSalary } = req.body;
        const tenantId = req.user.tenantId;

        const salary = await prisma.salary.create({
            data: {
                userId, month, year, basicSalary, netSalary, tenantId,
                ...(allowances?.length > 0 && {
                    allowances: { create: allowances.map(a => ({ name: a.name, amount: a.amount })) }
                }),
                ...(deductions?.length > 0 && {
                    deductions: { create: deductions.map(d => ({ name: d.name, amount: d.amount })) }
                })
            },
            include: { allowances: true, deductions: true, user: { select: { id: true, firstName: true, lastName: true, role: true } } }
        });

        await logAction({ action: 'CREATE', module: 'USER', details: `Created salary for ${month} ${year}`, userId: req.user._id, tenantId });
        res.status(201).json({ success: true, data: salary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all salaries
exports.getSalaries = async (req, res) => {
    try {
        const { userId, month, year, status } = req.query;
        const tenantId = req.user.tenantId;
        let where = { tenantId };

        if (userId) where.userId = userId;
        if (month) where.month = month;
        if (year) where.year = Number(year);
        if (status) where.status = status;

        const salaries = await prisma.salary.findMany({
            where,
            include: {
                allowances: true, deductions: true,
                user: { select: { id: true, firstName: true, lastName: true, role: true, designation: true } }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        res.status(200).json({ success: true, count: salaries.length, data: salaries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my salary (for staff)
exports.getMySalary = async (req, res) => {
    try {
        const salaries = await prisma.salary.findMany({
            where: { userId: req.user.id, tenantId: req.user.tenantId },
            include: { allowances: true, deductions: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
        res.status(200).json({ success: true, count: salaries.length, data: salaries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update salary
exports.updateSalary = async (req, res) => {
    try {
        const exists = await prisma.salary.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Salary record not found' });

        const { month, year, basicSalary, allowances, deductions, netSalary, status, paymentDate, payslipUrl } = req.body;

        if (allowances !== undefined) await prisma.salaryAllowance.deleteMany({ where: { salaryId: req.params.id } });
        if (deductions !== undefined) await prisma.salaryDeduction.deleteMany({ where: { salaryId: req.params.id } });

        const updated = await prisma.salary.update({
            where: { id: req.params.id },
            data: {
                ...(month && { month }),
                ...(year && { year }),
                ...(basicSalary !== undefined && { basicSalary }),
                ...(netSalary !== undefined && { netSalary }),
                ...(status && { status }),
                ...(paymentDate && { paymentDate: new Date(paymentDate) }),
                ...(payslipUrl && { payslipUrl }),
                ...(allowances?.length > 0 && {
                    allowances: { create: allowances.map(a => ({ name: a.name, amount: a.amount })) }
                }),
                ...(deductions?.length > 0 && {
                    deductions: { create: deductions.map(d => ({ name: d.name, amount: d.amount })) }
                })
            },
            include: { allowances: true, deductions: true }
        });

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete salary
exports.deleteSalary = async (req, res) => {
    try {
        const exists = await prisma.salary.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Salary record not found' });

        await prisma.salary.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Salary record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


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

