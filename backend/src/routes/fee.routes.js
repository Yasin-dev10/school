const express = require('express');
const router = express.Router();
const {
    createFeeType,
    getFeeTypes,
    deleteFeeType,
    generateClassInvoices,
    getInvoices,
    deleteInvoice,
    recordPayment,
    getInvoiceById,
    sendPaymentDueReminder,
    createExpense,
    getExpenses,
    deleteExpense,
    bulkDeleteFinanceRecords,
    getAllPayments
} = require('../controllers/fee.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);
router.delete('/bulk', authorize('school-admin', 'accountant'), bulkDeleteFinanceRecords);

// Fee Types
router.route('/types')
    .get(authorize('school-admin', 'accountant', 'receptionist'), getFeeTypes)
    .post(authorize('school-admin'), createFeeType);
router.delete('/types/:id', authorize('school-admin'), deleteFeeType);

// Invoices
router.route('/invoices')
    .get(authorize('school-admin', 'accountant', 'receptionist', 'student', 'parent'), getInvoices);
router.delete('/invoices/:id', authorize('school-admin', 'accountant'), deleteInvoice);

router.get('/invoices/:id', authorize('school-admin', 'accountant', 'receptionist', 'student', 'parent'), getInvoiceById);

router.post('/generate-invoices', authorize('school-admin'), generateClassInvoices);
router.post('/reminders/due', authorize('school-admin', 'accountant'), sendPaymentDueReminder);

// Payments
router.post('/pay', authorize('school-admin', 'receptionist'), recordPayment);
router.get('/payments/all', authorize('super-admin'), getAllPayments);

// Expenses
router.route('/expenses')
    .get(authorize('school-admin', 'accountant'), getExpenses)
    .post(authorize('school-admin', 'accountant'), createExpense);
router.delete('/expenses/:id', authorize('school-admin', 'accountant'), deleteExpense);

module.exports = router;
