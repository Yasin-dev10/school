const express = require('express');
const router = express.Router();
const {
    createClass,
    getClasses,
    getClass,
    updateClass,
    deleteClass
} = require('../controllers/class.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validateObjectId } = require('../middlewares/validation.middleware');

router.use(protect);

router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent', 'super-admin'), getClasses)
    .post(authorize('school-admin', 'super-admin'), createClass);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent', 'super-admin'), validateObjectId('id'), getClass)
    .put(authorize('school-admin', 'super-admin'), validateObjectId('id'), updateClass)
    .delete(authorize('school-admin', 'super-admin'), validateObjectId('id'), deleteClass);

module.exports = router;
