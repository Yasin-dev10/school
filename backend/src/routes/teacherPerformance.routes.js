const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const controller = require('../controllers/teacherPerformance.controller');
const router = express.Router();
router.use(protect);
router.get('/', authorize('school-admin', 'teacher'), controller.getPerformance);
router.get('/evaluations', authorize('school-admin', 'teacher'), controller.getEvaluations);
router.post('/evaluations', authorize('school-admin'), controller.saveEvaluation);
module.exports = router;
