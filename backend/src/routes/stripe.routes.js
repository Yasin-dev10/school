const express = require('express');
const router = express.Router();
const {
    createPaymentIntent,
    handleWebhook,
    getPaymentStatus,
    createRefund
} = require('../controllers/stripe.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Webhook route (no auth required, Stripe handles verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.use(protect);

// Create payment intent (students and parents can create for their invoices)
router.post('/create-payment-intent', 
    authorize('student', 'parent', 'school-admin', 'accountant'), 
    createPaymentIntent
);

// Get payment status
router.get('/payment-status/:paymentIntentId', 
    authorize('student', 'parent', 'school-admin', 'accountant', 'receptionist'), 
    getPaymentStatus
);

// Create refund (admin and accountant only)
router.post('/refund', 
    authorize('school-admin', 'accountant'), 
    createRefund
);

module.exports = router;