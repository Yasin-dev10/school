const prisma = require('../config/prismaClient');
const { notifyStudentAndParents } = require('../services/notification.service');
const { logAction } = require('../utils/logger');

// @desc    Create fee type
exports.createFeeType = async (req, res) => {
    try {
        const { name, description, amount } = req.body;
        const feeType = await prisma.feeType.create({
            data: { name, description, amount, tenantId: req.user.tenantId }
        });
        res.status(201).json({ success: true, data: { ...feeType, _id: feeType.id } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get fee types
exports.getFeeTypes = async (req, res) => {
    try {
        const feeTypes = await prisma.feeType.findMany({
            where: { tenantId: req.user.tenantId },
            orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, data: feeTypes.map(ft => ({ ...ft, _id: ft.id })) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update fee type
exports.updateFeeType = async (req, res) => {
    try {
        const exists = await prisma.feeType.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!exists) return res.status(404).json({ message: 'Fee type not found' });

        const feeType = await prisma.feeType.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.status(200).json({ success: true, data: feeType });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create invoice
exports.createInvoice = async (req, res) => {
    try {
        const { invoiceNumber, studentId, classId, items, dueDate } = req.body;
        const tenantId = req.user.tenantId;
        const totalAmount = items?.reduce((s, i) => s + (i.amount || 0), 0) || 0;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                studentId,
                classId,
                tenantId,
                totalAmount,
                dueDate: new Date(dueDate),
                items: {
                    create: items?.map(i => ({ feeTypeId: i.feeType || null, name: i.name, amount: i.amount })) || []
                }
            },
            include: { items: { include: { feeType: { select: { id: true, name: true } } } } }
        });

        await logAction({ action: 'CREATE', module: 'TENANT', details: `Created invoice ${invoiceNumber}`, userId: req.user._id, tenantId });
        await notifyStudentAndParents({
            tenantId, senderId: req.user.id, studentId, title: 'Fee payment due',
            message: `Invoice ${invoiceNumber} for $${totalAmount.toLocaleString()} is due ${new Date(dueDate).toLocaleDateString()}.`,
            type: 'fee_reminder', eventType: 'fee_due', deepLink: `/dashboard/student-finance?invoice=${invoice.id}`
        });
        res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get invoices
exports.getInvoices = async (req, res) => {
    try {
        const { studentId, status } = req.query;
        const tenantId = req.user.tenantId;
        let where = { tenantId };

        if (req.user.role === 'student') {
            where.studentId = req.user.id;
        } else if (req.user.role === 'parent') {
            const links = await prisma.studentParent.findMany({
                where: { parentId: req.user.id },
                select: { studentId: true }
            });
            const childIds = links.map((l) => l.studentId);
            where.studentId = { in: childIds.length ? childIds : ['__none__'] };
        } else if (studentId) {
            where.studentId = studentId;
        }
        if (status) where.status = status;

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
                class: { select: { id: true, name: true, section: true } },
                items: { include: { feeType: { select: { id: true, name: true } } } },
                payments: {
                    include: { markedBy: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { paymentDate: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = invoices.map(inv => ({
            ...inv,
            _id: inv.id,
            student: inv.student ? { ...inv.student, _id: inv.student.id } : null,
            class: inv.class ? { ...inv.class, _id: inv.class.id } : null,
            items: inv.items?.map(item => ({ ...item, _id: item.id })) || []
        }));

        res.status(200).json({ success: true, count: formatted.length, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Record payment
exports.recordPayment = async (req, res) => {
    try {
        const { invoiceId, amount, paymentMethod, transactionId } = req.body;
        const tenantId = req.user.tenantId;

        const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return res.status(400).json({ message: 'Invalid payment amount' });
        }
        const outstanding = invoice.totalAmount - invoice.paidAmount;
        if (amountNum > outstanding + 0.01) {
            return res.status(400).json({ message: 'Amount exceeds outstanding balance' });
        }

        const payment = await prisma.payment.create({
            data: {
                invoiceId, amount: amountNum, paymentMethod,
                transactionId: transactionId || null,
                markedById: req.user.id,
                tenantId
            }
        });

        const newPaid = invoice.paidAmount + amountNum;
        const newStatus = newPaid >= invoice.totalAmount ? 'paid' : newPaid > 0 ? 'partially_paid' : 'unpaid';
        await prisma.invoice.update({ where: { id: invoiceId }, data: { paidAmount: newPaid, status: newStatus } });

        res.status(201).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get payments
exports.getPayments = async (req, res) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { tenantId: req.user.tenantId },
            include: {
                invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
                markedBy: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { paymentDate: 'desc' }
        });
        res.status(200).json({ success: true, data: payments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Get all payments across all tenants (Super Admin)
exports.getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = status ? { invoice: { status } } : {};

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, status: true } },
                    markedBy: { select: { id: true, firstName: true, lastName: true } },
                    tenant: { select: { name: true, tenantId: true } }
                },
                orderBy: { paymentDate: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.payment.count({ where })
        ]);

        // Aggregate stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [mtdRevenue, pendingAmount] = await Promise.all([
            prisma.payment.aggregate({
                where: { paymentDate: { gte: startOfMonth } },
                _sum: { amount: true }
            }),
            prisma.invoice.aggregate({
                where: { status: 'unpaid' },
                _sum: { totalAmount: true }
            })
        ]);

        res.status(200).json({
            success: true,
            data: payments,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
            stats: {
                mtdRevenue: mtdRevenue._sum.amount || 0,
                pendingAmount: pendingAmount._sum.totalAmount || 0,
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Generate invoices for all students in a class
exports.generateClassInvoices = async (req, res) => {
    try {
        const { classId, feeTypeIds, dueDate } = req.body;
        const tenantId = req.user.tenantId;

        if (!classId || !feeTypeIds || !feeTypeIds.length || !dueDate) {
            return res.status(400).json({ success: false, message: 'classId, feeTypeIds, and dueDate are required' });
        }

        // Get the class
        const cls = await prisma.class.findFirst({ where: { id: classId, tenantId } });
        if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });

        // Get the selected fee types
        const feeTypes = await prisma.feeType.findMany({
            where: { id: { in: feeTypeIds }, tenantId }
        });
        if (!feeTypes.length) {
            return res.status(404).json({ success: false, message: 'No valid fee types found' });
        }

        const totalAmount = feeTypes.reduce((sum, ft) => sum + ft.amount, 0);

        // Get all students in this class by profileClass/profileSection matching
        const targetStudents = await prisma.user.findMany({
            where: {
                tenantId,
                role: 'student',
                OR: [
                    // Primary: students who match by profileClass and profileSection
                    { profileClass: cls.name, profileSection: cls.section },
                    // Secondary: students who have marks in this class
                    { marksAsStudent: { some: { classId, tenantId } } },
                    // Tertiary: students who have attendance in this class
                    { attendancesAsStudent: { some: { classId, tenantId } } }
                ]
            },
            select: { id: true, firstName: true, lastName: true }
        });

        if (!targetStudents.length) {
            return res.status(404).json({ success: false, message: 'No students found in this class' });
        }

        // Filter out students who already have an invoice for this class with the same due date
        const existingInvoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                classId,
                dueDate: new Date(dueDate),
                studentId: { in: targetStudents.map(s => s.id) }
            },
            select: { studentId: true }
        });
        const alreadyBilled = new Set(existingInvoices.map(i => i.studentId));
        const newStudents = targetStudents.filter(s => !alreadyBilled.has(s.id));

        if (!newStudents.length) {
            return res.status(400).json({ success: false, message: 'All students in this class already have invoices for this period.' });
        }

        // Create invoices in bulk
        const created = [];
        for (const student of newStudents) {
            const invoiceNumber = `INV-${Date.now()}-${student.id.slice(-4).toUpperCase()}`;
            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber,
                    studentId: student.id,
                    classId,
                    tenantId,
                    totalAmount,
                    dueDate: new Date(dueDate),
                    items: {
                        create: feeTypes.map(ft => ({
                            feeTypeId: ft.id,
                            name: ft.name,
                            amount: ft.amount
                        }))
                    }
                }
            });
            created.push(invoice);
            await notifyStudentAndParents({
                tenantId, senderId: req.user.id, studentId: student.id, title: 'Fee payment due',
                message: `Invoice ${invoiceNumber} for $${totalAmount.toLocaleString()} is due ${new Date(dueDate).toLocaleDateString()}.`,
                type: 'fee_reminder', eventType: 'fee_due', deepLink: `/dashboard/student-finance?invoice=${invoice.id}`
            });
        }

        res.status(201).json({
            success: true,
            message: `Generated ${created.length} invoices for class ${cls.name} - ${cls.section}`,
            count: created.length,
            data: created
        });
    } catch (error) {
        console.error('generateClassInvoices error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
                class: { select: { id: true, name: true, section: true } },
                items: { include: { feeType: true } },
                payments: {
                    include: { markedBy: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

        if (req.user.role === 'student' && invoice.studentId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        if (req.user.role === 'parent') {
            const link = await prisma.studentParent.findFirst({
                where: { parentId: req.user.id, studentId: invoice.studentId }
            });
            if (!link) return res.status(403).json({ success: false, message: 'Access denied' });
        }

        res.status(200).json({ success: true, data: invoice });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.createExpense = async (req, res) => {
    try {
        const { title, category, amount, date, description } = req.body;
        const expense = await prisma.expense.create({
            data: {
                title,
                category,
                amount: Number(amount),
                date: date ? new Date(date) : new Date(),
                description: description || null,
                recordedById: req.user.id,
                tenantId: req.user.tenantId
            }
        });
        res.status(201).json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await prisma.expense.findMany({
            where: { tenantId: req.user.tenantId },
            include: {
                recordedBy: { select: { id: true, firstName: true, lastName: true } }
            },
            orderBy: { date: 'desc' }
        });
        res.status(200).json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
