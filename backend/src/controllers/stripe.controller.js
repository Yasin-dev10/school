const stripeService = require('../services/stripe.service');
const prisma = require('../config/prismaClient');
const { logAction } = require('../utils/logger');
const stripe = require('../config/stripe');

// @desc    Create payment intent for invoice
exports.createPaymentIntent = async (req, res) => {
    try {
        const { invoiceId } = req.body;

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                student: { select: { id: true, firstName: true, lastName: true, email: true } },
                class: { select: { id: true, name: true } }
            }
        });

        if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
        if (invoice.tenantId !== req.user.tenantId) return res.status(403).json({ success: false, message: 'Access denied' });

        if (req.user.role === 'student' && invoice.studentId !== req.user.id)
            return res.status(403).json({ success: false, message: 'You can only pay your own invoices' });

        if (req.user.role === 'parent') {
            const link = await prisma.studentParent.findFirst({ where: { studentId: invoice.studentId, parentId: req.user.id } });
            if (!link) return res.status(403).json({ success: false, message: 'You can only pay invoices for your children' });
        }

        if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Invoice is already paid' });

        const paymentIntent = await stripeService.createPaymentIntent(invoice, req.user);

        await logAction({
            action: 'CREATE', module: 'TENANT',
            details: `Created payment intent for invoice ${invoice.invoiceNumber}`,
            userId: req.user._id, tenantId: req.user.tenantId
        });

        res.status(200).json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                invoice: {
                    id: invoice.id, invoiceNumber: invoice.invoiceNumber,
                    totalAmount: invoice.totalAmount, paidAmount: invoice.paidAmount,
                    outstandingAmount: invoice.totalAmount - invoice.paidAmount
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Handle Stripe webhooks
exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await stripeService.handlePaymentSuccess(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                console.log('Payment failed:', event.data.object.id);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
    } catch (error) {
        res.status(500).json({ error: 'Webhook handling failed' });
    }
};

// @desc    Get payment status
exports.getPaymentStatus = async (req, res) => {
    try {
        const { paymentIntentId } = req.params;
        const paymentIntent = await stripeService.getPaymentIntentStatus(paymentIntentId);

        const invoice = await prisma.invoice.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });

        res.status(200).json({
            success: true,
            data: {
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                invoice: invoice ? {
                    id: invoice.id, invoiceNumber: invoice.invoiceNumber,
                    status: invoice.status, paidAmount: invoice.paidAmount
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create refund
exports.createRefund = async (req, res) => {
    try {
        const { paymentIntentId, amount } = req.body;

        if (!['school_admin', 'accountant'].includes(req.user.role))
            return res.status(403).json({ success: false, message: 'Access denied' });

        const refund = await stripeService.createRefund(paymentIntentId, amount);

        await logAction({
            action: 'CREATE', module: 'TENANT',
            details: `Created refund for payment intent ${paymentIntentId}`,
            userId: req.user._id, tenantId: req.user.tenantId
        });

        res.status(200).json({ success: true, data: refund });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};