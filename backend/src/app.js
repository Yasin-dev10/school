const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('./middlewares/cookieParser');
const rateLimit = require('./middlewares/rateLimit');

// Route Imports
const tenantRoutes = require('./routes/tenant.routes');
const authRoutes = require('./routes/auth.routes');
const logRoutes = require('./routes/log.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');
const classRoutes = require('./routes/class.routes');
const subjectRoutes = require('./routes/subject.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const timetableRoutes = require('./routes/timetable.routes');
const examRoutes = require('./routes/exam.routes');
const feeRoutes = require('./routes/fee.routes');
const notificationRoutes = require('./routes/notification.routes');
const salaryRoutes = require('./routes/salary.routes');
const taskRoutes = require('./routes/task.routes');
const assignmentRoutes = require('./routes/assignment.routes');
const materialRoutes = require('./routes/material.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const certificateRoutes = require('./routes/certificate.routes');
const parentRoutes = require('./routes/parent.routes');
const contactMessageRoutes = require('./routes/contactMessage.routes');
const gradeRoutes = require('./routes/grade.routes');
const stripeRoutes = require('./routes/stripe.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const { handleValidationError } = require('./middlewares/validation.middleware');
const { parseAllowedOrigins, redactSensitive } = require('./utils/security');
const { getJwtSecret } = require('./utils/security');

// Fail closed on missing JWT secret at boot
try {
    getJwtSecret();
} catch (e) {
    console.error(e.message);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

const app = express();

const allowedOrigins = parseAllowedOrigins();

app.use(helmet());
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser clients (mobile) with no Origin header
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
    })
);

// Stripe webhook needs raw body — mount before json parser
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many login attempts, please try again later' },
});

app.use(['/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password'], loginLimiter);

// Routes
app.use('/api/tenants', tenantRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/contact-messages', contactMessageRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'School Management System API is running' });
});

app.use(handleValidationError);

app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    const isDev = process.env.NODE_ENV === 'development';

    console.error('GLOBAL ERROR CAUGHT:', {
        message: err.message,
        statusCode: err.statusCode,
        url: req.url,
        method: req.method,
        body: redactSensitive(req.body),
        name: err.name,
        ...(isDev && err.stack && { stack: err.stack }),
    });

    const clientMessage = isDev
        ? (err.message || 'Something went wrong!')
        : (err.statusCode < 500 ? (err.message || 'Request failed') : 'Something went wrong!');

    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: clientMessage,
        ...(isDev && { error: err.message, stack: err.stack })
    });
});

module.exports = app;
