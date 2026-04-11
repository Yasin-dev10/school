const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/log.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.get('/', authorize('super-admin', 'school-admin'), getAuditLogs);

module.exports = router;
