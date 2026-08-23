const express = require('express');
const { generate } = require('../controllers/aiAssistant.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit');

const router = express.Router();
router.use(protect);
router.post('/generate', authorize('school-admin', 'receptionist', 'teacher', 'student', 'parent'), rateLimit({ windowMs: 60 * 1000, max: 20 }), generate);

module.exports = router;
