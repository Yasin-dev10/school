const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');

// @desc    Create fee type
exports.createFeeType = async (req, res) => {
    try {
        const { name, description, amount } = req.body;
        const feeType = await prisma.feeType.create({
            data: { name, description, amount, tenantId: req.user.tenantId }
        });
        res.status(201).json({ success: true, data: feeType });
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
        res.status(200).json({ success: true, data: feeTypes });
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

        if (req.user.role === 'student') where.studentId = req.user.id;
        else if (studentId) where.studentId = studentId;
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

        res.status(200).json({ success: true, count: invoices.length, data: invoices });
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

        const payment = await prisma.payment.create({
            data: {
                invoiceId, amount, paymentMethod,
                transactionId: transactionId || null,
                markedById: req.user.id,
                tenantId
            }
        });

        const newPaid = invoice.paidAmount + amount;
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


exports.generateClassInvoices = async (req, res) => {
    res.status(200).json({ success: true, message: "Not implemented yet" });
};
exports.getInvoiceById = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: {
                items: { include: { feeType: true } },
                payments: {
                    include: { markedBy: { select: { id: true, firstName: true, lastName: true } } },
                    orderBy: { paymentDate: 'desc' }
                }
            }
        });
        res.status(200).json({ success: true, data: invoice });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
exports.createExpense = async (req, res) => { res.status(200).json({ success: true, message: "Not implemented yet" }) };
exports.getExpenses = async (req, res) => { res.status(200).json({ success: true, count: 0, data: [] }) };

