const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const { createTicket, getTickets, updateTicket, submitSurvey, getInsights } = require('../controllers/support.controller');

router.use(protect);
router.get('/tickets', getTickets);
router.post('/tickets', createTicket);
router.patch('/tickets/:id', authorize('school-admin'), updateTicket);
router.post('/surveys', submitSurvey);
router.get('/insights', authorize('school-admin'), getInsights);

module.exports = router;
