const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { exportBrandedReport } = require('../controllers/reportExport.controller');

router.post('/', protect, authorize('school-admin', 'teacher', 'receptionist'), exportBrandedReport);

module.exports = router;
