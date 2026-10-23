const prisma = require('../config/prismaClient');
const { notifyStudentAndParents, getSchoolName } = require('../services/notification.service');
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

exports.deleteFeeType = async (req, res) => {
    try {
        const feeType = await prisma.feeType.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { invoiceItems: { select: { id: true }, take: 1 } }
        });
        if (!feeType) return res.status(404).json({ success: false, message: 'Fee type not found' });
        if (feeType.invoiceItems.length) {
            return res.status(409).json({ success: false, message: 'This fee type is already used on an invoice and cannot be deleted.' });
        }
        await prisma.feeType.delete({ where: { id: feeType.id } });
        res.status(200).json({ success: true, message: 'Fee type deleted' });
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
        const [schoolName, student] = await Promise.all([
            getSchoolName(tenantId),
            prisma.user.findFirst({ where: { id: studentId, tenantId, role: 'student' }, select: { firstName: true, lastName: true } })
        ]);
        const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'ardayga';

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
            message: `Biilka ${invoiceNumber} oo dhan $${totalAmount.toLocaleString()} wuxuu ku egyahay ${new Date(dueDate).toLocaleDateString()}.`,
            smsMessage: `${schoolName}\nMudane/Marwo, ardayga ${studentName} waxaa laga rabaa lacag dhan $${totalAmount.toLocaleString()}. Bixi ugu dambayn ${new Date(dueDate).toLocaleDateString('en-GB')}.\nMahadsanid.\n${schoolName}`,
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

exports.deleteInvoice = async (req, res) => {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId },
            include: { payments: { select: { id: true }, take: 1 } }
        });
        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.payments.length || invoice.paidAmount > 0) {
            return res.status(409).json({ success: false, message: 'Invoices with recorded payments cannot be deleted.' });
        }
        await prisma.invoice.delete({ where: { id: invoice.id } });
        res.status(200).json({ success: true, message: 'Invoice deleted' });
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

        const [schoolName, student] = await Promise.all([
            getSchoolName(tenantId),
            prisma.user.findFirst({ where: { id: invoice.studentId, tenantId, role: 'student' }, select: { firstName: true, lastName: true } })
        ]);
        const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'ardayga';
        const paymentStatus = newStatus === 'paid' ? 'si buuxda ayaa loo bixiyey' : 'qayb ayaa laga bixiyey';
        await notifyStudentAndParents({
            tenantId, senderId: req.user.id, studentId: invoice.studentId, title: 'Payment received',
            message: `Lacag dhan $${amountNum.toLocaleString()} ${paymentStatus} kharashka ardayga ${studentName}.`,
            smsMessage: `${schoolName}\nLacag dhan $${amountNum.toLocaleString()} ${paymentStatus} kharashka ardayga ${studentName}. Mahadsanid bixintaada.\n${schoolName}`,
            type: 'fee_reminder', eventType: 'fee_paid', deepLink: `/dashboard/student-finance?invoice=${invoice.id}`
        });

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
        const schoolName = await getSchoolName(tenantId);

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
                message: `Biilka ${invoiceNumber} oo dhan $${totalAmount.toLocaleString()} wuxuu ku egyahay ${new Date(dueDate).toLocaleDateString()}.`,
                smsMessage: `${schoolName}\nMudane/Marwo, ardayga ${student.firstName} ${student.lastName} waxaa laga rabaa lacag dhan $${totalAmount.toLocaleString()}. Bixi ugu dambayn ${new Date(dueDate).toLocaleDateString('en-GB')}.\nMahadsanid.\n${schoolName}`,
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

// @desc Send a payment-due reminder to one student or all students in a class
exports.sendPaymentDueReminder = async (req, res) => {
    try {
        const { studentId, classId } = req.body;
        const tenantId = req.user.tenantId;
        if ((!studentId && !classId) || (studentId && classId)) {
            return res.status(400).json({ success: false, message: 'Choose one student or one class' });
        }

        if (classId) {
            const targetClass = await prisma.class.findFirst({ where: { id: classId, tenantId }, select: { id: true } });
            if (!targetClass) return res.status(404).json({ success: false, message: 'Class not found' });
        }

        const invoices = await prisma.invoice.findMany({
            where: {
                tenantId,
                status: { in: ['unpaid', 'partially_paid'] },
                ...(studentId ? { studentId } : { classId })
            },
            include: { student: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { dueDate: 'asc' }
        });
        if (!invoices.length) {
            return res.status(404).json({ success: false, message: 'No outstanding invoices found for this selection' });
        }

        const schoolName = await getSchoolName(tenantId);
        const byStudent = new Map();
        for (const invoice of invoices) {
            const item = byStudent.get(invoice.studentId) || { student: invoice.student, balance: 0, dueDate: invoice.dueDate };
            item.balance += Math.max(0, invoice.totalAmount - invoice.paidAmount);
            if (invoice.dueDate < item.dueDate) item.dueDate = invoice.dueDate;
            byStudent.set(invoice.studentId, item);
        }

        await Promise.all([...byStudent.entries()].map(([targetStudentId, item]) => {
            const studentName = `${item.student.firstName} ${item.student.lastName}`.trim();
            const dueDate = item.dueDate.toLocaleDateString('en-GB');
            const amount = item.balance.toLocaleString();
            return notifyStudentAndParents({
                tenantId, senderId: req.user.id, studentId: targetStudentId,
                title: 'Xusuusin lacag-bixin',
                message: `Ardayga ${studentName} waxaa weli laga rabaa $${amount}. Taariikhda ugu dhow ee bixintu waa ${dueDate}.`,
                smsMessage: `${schoolName}\nMudane/Marwo, ardayga ${studentName} waxaa laga rabaa lacag dhan $${amount}. Fadlan bixi ugu dambayn ${dueDate}.\nMahadsanid.\n${schoolName}`,
                type: 'fee_reminder', eventType: 'fee_due', deepLink: '/dashboard/finance'
            });
        }));

        res.status(200).json({ success: true, studentsNotified: byStudent.size });
    } catch (error) {
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

exports.deleteExpense = async (req, res) => {
    try {
        const expense = await prisma.expense.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        await prisma.expense.delete({ where: { id: expense.id } });
        res.status(200).json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.bulkDeleteFinanceRecords = async (req, res) => {
    try {
        const { kind, ids } = req.body;
        const tenantId = req.user.tenantId;
        if (!['expense', 'feeType', 'invoice'].includes(kind) || !Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string')) {
            return res.status(400).json({ success: false, message: 'Choose one or more valid finance records.' });
        }
        if (kind === 'feeType' && req.user.role !== 'school-admin') {
            return res.status(403).json({ success: false, message: 'Only a school admin can delete fee types.' });
        }
        const uniqueIds = [...new Set(ids)];
        if (kind === 'expense') {
            const result = await prisma.expense.deleteMany({ where: { id: { in: uniqueIds }, tenantId } });
            return res.status(200).json({ success: true, deletedCount: result.count });
        }
        if (kind === 'feeType') {
            const feeTypes = await prisma.feeType.findMany({ where: { id: { in: uniqueIds }, tenantId }, include: { invoiceItems: { select: { id: true }, take: 1 } } });
            if (feeTypes.length !== uniqueIds.length) return res.status(404).json({ success: false, message: 'One or more fee types were not found.' });
            if (feeTypes.some(item => item.invoiceItems.length)) return res.status(409).json({ success: false, message: 'Selection contains a fee type already used on an invoice. No records were deleted.' });
            const result = await prisma.feeType.deleteMany({ where: { id: { in: uniqueIds }, tenantId } });
            return res.status(200).json({ success: true, deletedCount: result.count });
        }
        const invoices = await prisma.invoice.findMany({ where: { id: { in: uniqueIds }, tenantId }, include: { payments: { select: { id: true }, take: 1 } } });
        if (invoices.length !== uniqueIds.length) return res.status(404).json({ success: false, message: 'One or more invoices were not found.' });
        if (invoices.some(invoice => invoice.payments.length || invoice.paidAmount > 0)) return res.status(409).json({ success: false, message: 'Selection contains an invoice with a payment. No records were deleted.' });
        const result = await prisma.invoice.deleteMany({ where: { id: { in: uniqueIds }, tenantId } });
        res.status(200).json({ success: true, deletedCount: result.count });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
