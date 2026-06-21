const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotifications,
    markAsRead,
    getUnreadCount,
    getPlatformAnnouncements,
    sendPlatformAnnouncement,
    deleteNotification
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// Super-admin platform announcements
router.route('/announcements')
    .get(authorize('super-admin'), getPlatformAnnouncements)
    .post(authorize('super-admin'), sendPlatformAnnouncement);

router.route('/')
    .get(getNotifications)
    .post(authorize('school-admin', 'teacher'), createNotification);

router.get('/unread/count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.delete('/:id', authorize('school-admin', 'super-admin'), deleteNotification);

module.exports = router;
