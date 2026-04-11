const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    items: [{
        feeType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeType'
        },
        name: String,
        amount: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['unpaid', 'partially_paid', 'paid', 'void'],
        default: 'unpaid'
    },
    // Stripe-specific fields
    stripePaymentIntentId: {
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
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);
