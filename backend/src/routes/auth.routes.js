const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, changePassword, logout, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const permissionService = require('../services/permission.service');

const { RESOURCES, ACTIONS } = permissionService;

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// Update profile restricted by permission (Student has Read-only on Profile)
router.put('/profile', protect, checkPermission(RESOURCES.PROFILE, ACTIONS.UPDATE), updateProfile);

router.put('/change-password', protect, changePassword);

module.exports = router;
