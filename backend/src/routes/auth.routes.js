const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, changePassword, logout } = require('../controllers/auth.controller');
const { protect } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const permissionService = require('../services/permission.service');

const { RESOURCES, ACTIONS } = permissionService;

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Update profile restricted by permission (Student has Read-only on Profile)
router.put('/profile', protect, checkPermission(RESOURCES.PROFILE, ACTIONS.UPDATE), updateProfile);

router.put('/change-password', protect, changePassword);

module.exports = router;
