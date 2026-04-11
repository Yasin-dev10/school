const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: String, // e.g., "January"
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    basicSalary: {
        type: Number,
        required: true
    },
    allowances: [{
        name: String,
        amount: Number
    }],
    deductions: [{
        name: String,
        amount: Number
    }],
    netSalary: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    paymentDate: Date,
    payslipUrl: String,
    tenantId: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Salary', salarySchema);
