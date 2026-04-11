const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'online', 'stripe'],
        required: true
    },
    transactionId: {
        type: String,
        trim: true
    },
    // Stripe-specific fields
    stripePaymentIntentId: {
        type: String,
        trim: true
    },
    stripeChargeId: {
        type: String,
        trim: true
    },
    stripeCustomerId: {
        type: String,
        trim: true
    },
    stripeReceiptUrl: {
        type: String,
        trim: true
    },
    paymentGateway: {
        type: String,
        enum: ['manual', 'stripe'],
        default: 'manual'
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
