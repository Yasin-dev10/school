const express = require('express');
const router = express.Router();
const { createNotification, getNotifications, markAsRead, getUnreadCount } = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(getNotifications)
    .post(authorize('school-admin', 'teacher'), createNotification);

router.get('/unread/count', getUnreadCount);
router.put('/:id/read', markAsRead);

module.exports = router;
