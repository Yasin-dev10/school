const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { getMySalaries, createSalary, getAllSalaries, runPayroll, markSalaryPaid } = require('../controllers/salary.controller');

router.use(protect);

router.get('/me', getMySalaries);
router.post('/run', authorize('school-admin', 'accountant'), runPayroll);
router.put('/:id/pay', authorize('school-admin', 'accountant'), markSalaryPaid);
router.get('/', authorize('school-admin', 'accountant'), getAllSalaries);
router.post('/', authorize('school-admin', 'accountant'), createSalary);

module.exports = router;
