const express = require('express');
const router = express.Router();
const {
    createExam,
    getExams,
    updateExam,
    deleteExam,
    bulkMarkEntry,
    deleteMark,
    bulkDeleteMarks,
    getMarks,
    getCombinedRankings,
    saveCombinedResult,
    getStudentCombinedResults,
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
    getStudentGrades,
    createExamSchedule,
    generateExamSchedule,
    getExamSchedules,
    updateExamSchedule,
    deleteExamSchedule,
    deleteFullExamSchedule
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

router.route('/schedule')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getExamSchedules)
    .post(authorize('school-admin'), createExamSchedule);
router.post('/schedule/generate', authorize('school-admin'), generateExamSchedule);
router.delete('/schedule/exam/:examId', authorize('school-admin'), validateObjectId('examId'), deleteFullExamSchedule);
router.put('/schedule/:scheduleId', authorize('school-admin'), validateObjectId('scheduleId'), updateExamSchedule);
router.delete('/schedule/:scheduleId', authorize('school-admin'), validateObjectId('scheduleId'), deleteExamSchedule);

router.route('/:id')
    .put(authorize('school-admin'), validateObjectId('id'), updateExam)
    .delete(authorize('school-admin'), validateObjectId('id'), deleteExam);

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
router.get('/combined-rankings', authorize('school-admin', 'teacher'), getCombinedRankings);
router.post('/combined-results', authorize('school-admin', 'teacher'), saveCombinedResult);
router.get('/combined-results/student/:studentId?', authorize('student', 'parent'), getStudentCombinedResults);
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
