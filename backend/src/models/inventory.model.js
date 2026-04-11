const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    itemName: {
        type: String,
        required: true
    },
    category: {
        type: String, // 'furniture', 'electronics', 'stationery', etc.
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    unit: {
        type: String, // 'pcs', 'kg', 'boxes', etc.
        default: 'pcs'
    },
    location: String,
    status: {
        type: String,
        enum: ['available', 'out-of-stock', 'maintenance'],
        default: 'available'
    },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
