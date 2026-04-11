const mongoose = require('mongoose');

const feeTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a fee name'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Please add an amount']
    },
    tenantId: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('FeeType', feeTypeSchema);
