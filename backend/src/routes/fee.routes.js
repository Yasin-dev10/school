const express = require('express');
const router = express.Router();
const {
    createFeeType,
    getFeeTypes,
    generateClassInvoices,
    getInvoices,
    recordPayment,
    getInvoiceById,
    createExpense,
    getExpenses
} = require('../controllers/fee.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// Fee Types
router.route('/types')
    .get(getFeeTypes)
    .post(authorize('school-admin'), createFeeType);

// Invoices
router.route('/invoices')
    .get(getInvoices);

router.get('/invoices/:id', authorize('school-admin', 'receptionist', 'student', 'parent'), getInvoiceById);

router.post('/generate-invoices', authorize('school-admin'), generateClassInvoices);

// Payments
router.post('/pay', authorize('school-admin', 'receptionist'), recordPayment);

// Expenses
router.route('/expenses')
    .get(authorize('school-admin', 'accountant'), getExpenses)
    .post(authorize('school-admin', 'accountant'), createExpense);

module.exports = router;
