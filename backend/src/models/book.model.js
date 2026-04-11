const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    tenantId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    isbn: String,
    category: String,
    quantity: {
        type: Number,
        default: 1
    },
    available: {
        type: Number,
        default: 1
    },
    shelfLocation: String,
    coverUrl: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Book', bookSchema);
