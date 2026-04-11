const express = require('express');
const router = express.Router();
const {
    addTimetableSlot,
    validateTimetableSlot,
    getClassTimetable,
    getTeacherTimetable,
    getStudentTimetable,
    deleteTimetableSlot,
    getTeacherWorkload,
    bulkUpdateClassTimetable
} = require('../controllers/timetable.controller');

const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/validate', authorize('school-admin'), validateTimetableSlot);

router.post('/bulk', authorize('school-admin'), bulkUpdateClassTimetable);

router.route('/')
    .get(authorize('school-admin'), require('../controllers/timetable.controller').getAllTimetable)
    .post(authorize('school-admin'), addTimetableSlot);

router.get('/teacher/me', authorize('teacher'), getTeacherTimetable);
router.get('/student/me', authorize('student'), getStudentTimetable);
router.get('/teacher/workload', authorize('teacher'), getTeacherWorkload);

router.route('/class/:classId')
    .get(authorize('school-admin', 'teacher', 'student', 'parent'), getClassTimetable);

router.route('/:id')
    .delete(authorize('school-admin'), deleteTimetableSlot);

module.exports = router;
