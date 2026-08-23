const express = require('express');
const calendar = require('../controllers/calendar.controller');
const { protect } = require('../middlewares/auth.middleware');
const router = express.Router();
router.use(protect);
router.route('/events').get(calendar.getEvents).post(calendar.createEvent);
router.route('/events/:id').put(calendar.updateEvent).delete(calendar.deleteEvent);
router.put('/events/:id/rsvp', calendar.rsvp);
module.exports = router;
