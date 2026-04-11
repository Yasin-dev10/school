const stripe = require('../config/stripe');
const prisma = require('../config/prismaClient');

class StripeService {
    /**
     * Create or retrieve Stripe customer for a user
     */
    async createOrGetCustomer(user) {
        try {
            if (user.stripeCustomerId) {
                try {
                    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
                    return customer;
                } catch {
                    console.log('Stripe customer not found, creating new one');
                }
            }

            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: {
                    userId: user.id || user._id,
                    tenantId: user.tenantId,
                    role: user.role
                }
            });

            // Save Stripe customer ID
            await prisma.user.update({ where: { id: user.id || user._id }, data: { stripeCustomerId: customer.id } });

            return customer;
        } catch (error) {
            console.error('Error creating/retrieving Stripe customer:', error);
            throw new Error('Failed to create Stripe customer');
        }
    }

    /**
     * Create payment intent for an invoice
     */
    async createPaymentIntent(invoice, user) {
        try {
            const customer = await this.createOrGetCustomer(user);
            const amountInCents = Math.round((invoice.totalAmount - invoice.paidAmount) * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                customer: customer.id,
                metadata: {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    studentId: invoice.studentId,
                    tenantId: invoice.tenantId
                },
                automatic_payment_methods: { enabled: true }
            });

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { stripePaymentIntentId: paymentIntent.id, paymentGateway: 'stripe' }
            });

            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent:', error);
            throw new Error('Failed to create payment intent');
        }
    }

    /**
     * Handle successful payment webhook
     */
    async handlePaymentSuccess(paymentIntent) {
        try {
            const invoiceId = paymentIntent.metadata.invoiceId;
            const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
            if (!invoice) throw new Error('Invoice not found');

            const paymentAmount = paymentIntent.amount / 100;
            const receiptUrl = paymentIntent.charges?.data?.[0]?.receipt_url;

            const payment = await prisma.payment.create({
                data: {
                    invoiceId: invoice.id,
                    amount: paymentAmount,
                    paymentMethod: 'online',
                    paymentGateway: 'stripe',
                    transactionId: paymentIntent.id,
                    stripePaymentIntentId: paymentIntent.id,
                    stripeChargeId: paymentIntent.latest_charge,
                    stripeCustomerId: paymentIntent.customer,
                    stripeReceiptUrl: receiptUrl || null,
                    tenantId: invoice.tenantId,
                    markedById: invoice.studentId
                }
            });

            const newPaidAmount = invoice.paidAmount + paymentAmount;
            const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 'partially_paid';
            await prisma.invoice.update({ where: { id: invoice.id }, data: { paidAmount: newPaidAmount, status: newStatus } });

            return { payment, invoice };
        } catch (error) {
            console.error('Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Get payment intent status
     */
    async getPaymentIntentStatus(paymentIntentId) {
        try {
            return await stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            throw new Error('Failed to retrieve payment status');
        }
    }

    /**
     * Create refund
     */
    async createRefund(paymentIntentId, amount = null) {
        try {
            const refundData = { payment_intent: paymentIntentId };
            if (amount) refundData.amount = Math.round(amount * 100);
            return await stripe.refunds.create(refundData);
        } catch (error) {
            throw new Error('Failed to create refund');
        }
    }
}

module.exports = new StripeService();