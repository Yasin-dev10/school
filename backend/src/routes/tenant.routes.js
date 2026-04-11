const express = require('express');
const router = express.Router();
const {
    createTenant,
    getAllTenants,
    getTenantById,
    updateTenant,
    deleteTenant,
    getMyTenant,
    updateMyTenant
} = require('../controllers/tenant.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

// Self-management for school admins
router.route('/me')
    .get(authorize('school-admin', 'super-admin', 'teacher', 'student', 'parent', 'receptionist'), getMyTenant)
    .put(authorize('school-admin'), updateMyTenant);

// Platforms management (Super Admin only)
router.use(authorize('super-admin'));

router.route('/')
    .post(createTenant)
    .get(getAllTenants);

router.route('/:id')
    .get(getTenantById)
    .put(updateTenant)
    .delete(deleteTenant);

module.exports = router;
