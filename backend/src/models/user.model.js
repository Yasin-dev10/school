const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    tenantId: {
        type: String, // References Tenant.tenantId
        // Super admins might not belong to a specific tenant or have a special one 'platform'
        index: true
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        // Unique globally prevents same email used in multiple schools. 
        // Ideally for multi-tenant, it's unique per tenant.
        // We will enforce uniqueness logic in controller or sparse index.
    },
    password: { type: String, required: true },
    password_plain: { type: String }, // Store for admin reference
    role: {
        type: String,
        enum: [
            'super-admin',
            'school-admin',
            'teacher',
            'student',
            'parent',
            'accountant',
            'librarian',
            'receptionist'
        ],
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    profile: {
        phone: String,
        address: String,
        avatarUrl: String,
        // Additional role-specific fields
        designation: String, // for staff
        admissionNo: String, // for students
        studentId: String,   // for students (extra unique ID)
        rollNo: String,
        class: String,
        section: String,
        gender: { type: String, enum: ['male', 'female', 'other'], lowercase: true },
        dob: Date,
        parentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        parentRelationship: { type: String, enum: ['Father', 'Mother', 'Guardian', 'Other'], default: 'Guardian' },
        qualification: String,
        salary: String,
        // Stripe integration
        stripeCustomerId: String,
        children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // for parents
    },
    lastLogin: Date
}, {
    timestamps: true
});

// Password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
