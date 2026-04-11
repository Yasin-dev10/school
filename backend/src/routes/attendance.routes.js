const express = require('express');
const router = express.Router();
const {
    markAttendance,
    getClassAttendance,
    getClassAttendanceHistory,
    getMyAttendance
} = require('../controllers/attendance.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/mark', authorize('school-admin', 'teacher'), markAttendance);
router.get('/my', authorize('student'), getMyAttendance);
router.get('/class/:classId', authorize('school-admin', 'teacher'), getClassAttendance);
router.get('/history/:classId', authorize('school-admin', 'teacher'), getClassAttendanceHistory);

module.exports = router;
