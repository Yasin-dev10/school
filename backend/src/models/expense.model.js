const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['salaries', 'rent', 'utilities', 'maintenance', 'supplies', 'marketing', 'other']
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'card']
    },
    description: String,
    receiptUrl: String,
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
