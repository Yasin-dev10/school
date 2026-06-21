const express = require('express');
const router = express.Router();
const {
    markAttendance,
    updateAttendance,
    getClassAttendance,
    getClassAttendanceHistory,
    getMyAttendance,
    getStudentAttendance,
    getAttendanceReport
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/mark', authorize('school-admin', 'teacher'), markAttendance);
router.put('/:id', authorize('school-admin', 'teacher'), updateAttendance);
router.get('/my', authorize('student'), getMyAttendance);
router.get('/student/:studentId', authorize('school-admin', 'teacher', 'receptionist'), getStudentAttendance);
router.get('/report', authorize('school-admin', 'teacher'), getAttendanceReport);
router.get('/class/:classId', authorize('school-admin', 'teacher'), getClassAttendance);
router.get('/history/:classId', authorize('school-admin', 'teacher'), getClassAttendanceHistory);

module.exports = router;
