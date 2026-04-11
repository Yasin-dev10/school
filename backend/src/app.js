const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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
const { handleValidationError } = require('./middlewares/validation.middleware');

const app = express();

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: true, // Allow all origins temporarily for debugging
        credentials: true,
    })
);
app.use(express.json());
app.use(morgan('dev'));

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

app.get('/', (req, res) => {
    res.json({ message: 'School Management System API is running' });
});

// Validation Error Handling (must be before general error handler)
app.use(handleValidationError);

// Error Handling
app.use((err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    console.error('GLOBAL ERROR CAUGHT:', {
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        url: req.url,
        method: req.method,
        body: req.body, // Log the body to see what was sent
        name: err.name, // Add error name
        // Add more details if available from the error object
        ...(err.errors && { validationErrors: err.errors }), // For Mongoose validation errors
        ...(err.code && { errorCode: err.code }), // For database errors or custom error codes
    });

    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message || 'Something went wrong!',
        error: err.message, // Include message for easier debugging
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});


module.exports = app;
