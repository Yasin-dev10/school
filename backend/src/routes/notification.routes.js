const express = require('express');
const router = express.Router();
const {
    createNotification,
    getNotifications,
    markAsRead,
    getUnreadCount,
    getPlatformAnnouncements,
    sendPlatformAnnouncement,
    deleteNotification,
    registerDeviceToken,
    unregisterDeviceToken,
    getPreferences,
    updatePreferences,
    getDeliveryStatus,
    retryDeliveries
} = require('../controllers/notification.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/devices/register', registerDeviceToken);
router.post('/devices/unregister', unregisterDeviceToken);
router.route('/preferences').get(getPreferences).put(updatePreferences);
router.post('/deliveries/retry', authorize('school-admin', 'super-admin'), retryDeliveries);

// Super-admin platform announcements
router.route('/announcements')
    .get(authorize('super-admin'), getPlatformAnnouncements)
    .post(authorize('super-admin'), sendPlatformAnnouncement);

router.route('/')
    .get(getNotifications)
    .post(authorize('school-admin', 'teacher'), createNotification);

router.get('/unread/count', getUnreadCount);
router.get('/:id/deliveries', authorize('school-admin', 'super-admin'), getDeliveryStatus);
router.put('/:id/read', markAsRead);
router.delete('/:id', authorize('school-admin', 'super-admin'), deleteNotification);

module.exports = router;
