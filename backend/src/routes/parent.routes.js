const express = require('express');
const router = express.Router();
const {
    getMyChildren,
    getChildAttendance,
    getChildMarks,
    getChildTimetable,
    getParentNotifications
} = require('../controllers/parent.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);
router.use(authorize('parent'));

router.get('/children', getMyChildren);
router.get('/child/:studentId/attendance', getChildAttendance);
router.get('/child/:studentId/marks', getChildMarks);
router.get('/child/:studentId/timetable', getChildTimetable);
router.get('/notifications', getParentNotifications);

module.exports = router;
