const express = require('express');
const router = express.Router();
const {
    createExam,
    getExams,
    updateExam,
    bulkMarkEntry,
    deleteMark,
    bulkDeleteMarks,
    getMarks,
    getStudentReport,
    approveResults,
    unapproveResults,
    exportExcelMatrix,
    getGradeSystem,
    updateGradeSystem,
    submitComplaint,
    getComplaints,
    getExamAnalytics,
    getTopPerformers,
    getStudentGrades
} = require('../controllers/exam.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validate, validateObjectId, validateMarks } = require('../middlewares/validation.middleware');
const { examSchema, bulkMarkEntrySchema } = require('../utils/validationSchemas');

router.use(protect);

// Grade System
router.route('/grade-system')
    .get(getGradeSystem)
    .put(authorize('school-admin'), updateGradeSystem);

// Exam CRUD
router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getExams)
    .post(authorize('school-admin'), validate(examSchema), createExam);

router.route('/:id')
    .put(authorize('school-admin'), validateObjectId('id'), updateExam);

router.put('/:id/approve', authorize('school-admin'), validateObjectId('id'), approveResults);
router.put('/:id/unapprove', authorize('school-admin'), validateObjectId('id'), unapproveResults);

// Mark Entry & Reports
// Note: Frontend exposes mark entry to general staff (including receptionists),
// so we include 'receptionist' here to keep permissions consistent.
router.post(
    '/marks/bulk',
    authorize('school-admin', 'teacher', 'receptionist'),
    validate(bulkMarkEntrySchema),
    validateMarks,
    bulkMarkEntry
);

router.delete(
    '/marks/bulk',
    authorize('school-admin', 'teacher', 'receptionist'),
    bulkDeleteMarks
);

router.delete(
    '/marks/:markId',
    authorize('school-admin', 'teacher', 'receptionist'),
    validateObjectId('markId'),
    deleteMark
);

router.get(
    '/marks',
    authorize('school-admin', 'teacher', 'student', 'parent', 'receptionist'),
    getMarks
);
router.get('/report/:examId/:studentId', authorize('school-admin', 'teacher', 'student', 'parent'), validateObjectId('examId'), validateObjectId('studentId'), getStudentReport);
router.get('/student-grades/:studentId?', authorize('school-admin', 'teacher', 'student', 'parent'), getStudentGrades);
router.get('/export-matrix', authorize('school-admin', 'teacher'), exportExcelMatrix);

// Complaints
router.route('/complaints')
    .get(getComplaints)
    .post(authorize('student'), submitComplaint);

router.get('/analytics/:examId', authorize('school-admin', 'teacher'), validateObjectId('examId'), getExamAnalytics);
router.get('/top-performers/:examId/:classId', authorize('school-admin', 'teacher'), validateObjectId('examId'), validateObjectId('classId'), getTopPerformers);

module.exports = router;
