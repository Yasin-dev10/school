const express = require('express');
const router = express.Router();
const {
    getClassAnalytics,
    getStudentAnalytics,
    getAdminDashboardStats,
    getFinanceAnalytics,
    getStaffAnalytics
} = require('../controllers/analytics.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/admin/overview', authorize('school-admin'), getAdminDashboardStats);
router.get('/finance', authorize('school-admin'), getFinanceAnalytics);
router.get('/staff', authorize('school-admin'), getStaffAnalytics);
router.get('/class/:classId', authorize('teacher', 'school-admin'), getClassAnalytics);
router.get('/student/:studentId', getStudentAnalytics);

module.exports = router;

