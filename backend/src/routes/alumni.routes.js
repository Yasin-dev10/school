const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const controller = require('../controllers/alumni.controller');

const router = express.Router();
router.use(protect, authorize('school-admin', 'receptionist'));
router.get('/', controller.getOverview);
router.post('/', controller.createAlumni);
router.put('/:id', controller.updateAlumni);
router.delete('/:id', authorize('school-admin'), controller.deleteAlumni);
router.post('/events', controller.createEvent);
router.delete('/events/:id', authorize('school-admin'), controller.deleteEvent);
router.post('/donations', controller.createDonation);
router.delete('/donations/:id', authorize('school-admin'), controller.deleteDonation);

module.exports = router;
