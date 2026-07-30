const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

// @desc    Create salary record
exports.createSalary = async (req, res) => {
    try {
        const { userId, month, year, basicSalary, allowances = [], deductions = [] } = req.body;
        const tenantId = req.user.tenantId;
        const numericBasicSalary = Number(basicSalary);
        if (!userId || !month || !Number.isInteger(Number(year)) || !Number.isFinite(numericBasicSalary) || numericBasicSalary < 0) {
            return res.status(400).json({ success: false, message: 'User, month, year and a valid basic salary are required' });
        }
        const employee = await prisma.user.findFirst({ where: { id: userId, tenantId } });
        if (!employee) return res.status(404).json({ success: false, message: 'Staff member not found' });
        const duplicate = await prisma.salary.findFirst({ where: { userId, month, year: Number(year), tenantId } });
        if (duplicate) return res.status(409).json({ success: false, message: 'Payroll already exists for this employee and period' });
        const allowanceTotal = allowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const deductionTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const netSalary = Math.max(0, numericBasicSalary + allowanceTotal - deductionTotal);

        const salary = await prisma.salary.create({
            data: {
                userId, month, year: Number(year), basicSalary: numericBasicSalary, netSalary, tenantId,
                ...(allowances?.length > 0 && {
                    allowances: { create: allowances.map(a => ({ name: a.name, amount: Number(a.amount) })) }
                }),
                ...(deductions?.length > 0 && {
                    deductions: { create: deductions.map(d => ({ name: d.name, amount: Number(d.amount) })) }
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
exports.runPayroll = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { month, year, userIds, allowances = [], deductions = [] } = req.body;
        const numericYear = Number(year);
        if (!month || !Number.isInteger(numericYear)) {
            return res.status(400).json({ success: false, message: 'A valid month and year are required' });
        }

        const users = await prisma.user.findMany({
            where: {
                tenantId,
                status: 'active',
                role: { in: ['teacher', 'accountant', 'librarian', 'receptionist'] },
                ...(Array.isArray(userIds) && userIds.length ? { id: { in: userIds } } : {})
            },
            select: { id: true, firstName: true, lastName: true, salary: true }
        });
        if (!users.length) {
            return res.status(400).json({ success: false, message: 'No eligible staff found for payroll' });
        }

        const existing = await prisma.salary.findMany({
            where: { tenantId, month, year: numericYear, userId: { in: users.map(user => user.id) } },
            select: { userId: true }
        });
        const existingIds = new Set(existing.map(record => record.userId));
        const created = [];
        const skipped = [];

        for (const user of users) {
            if (existingIds.has(user.id)) {
                skipped.push({ userId: user.id, reason: 'Payroll already exists' });
                continue;
            }
            const basicSalary = Number(user.salary);
            if (!Number.isFinite(basicSalary) || basicSalary < 0) {
                skipped.push({ userId: user.id, reason: 'Missing or invalid salary on staff profile' });
                continue;
            }
            const allowanceTotal = allowances.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const deductionTotal = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const salary = await prisma.salary.create({
                data: {
                    userId: user.id,
                    month,
                    year: numericYear,
                    basicSalary,
                    netSalary: Math.max(0, basicSalary + allowanceTotal - deductionTotal),
                    tenantId,
                    ...(allowances.length && { allowances: { create: allowances.map(item => ({ name: item.name, amount: Number(item.amount) })) } }),
                    ...(deductions.length && { deductions: { create: deductions.map(item => ({ name: item.name, amount: Number(item.amount) })) } })
                },
                include: { allowances: true, deductions: true, user: { select: { id: true, firstName: true, lastName: true } } }
            });
            created.push(salary);
        }

        await logAction({
            action: 'CREATE',
            module: 'USER',
            details: `Ran payroll for ${month} ${numericYear}: ${created.length} created, ${skipped.length} skipped`,
            userId: req.user.id,
            tenantId
        });
        res.status(201).json({ success: true, count: created.length, skipped, data: created });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.markSalaryPaid = async (req, res) => {
    try {
        const exists = await prisma.salary.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!exists) return res.status(404).json({ message: 'Salary record not found' });

        const updated = await prisma.salary.update({
            where: { id: req.params.id },
            data: { status: 'paid', paymentDate: new Date() }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

