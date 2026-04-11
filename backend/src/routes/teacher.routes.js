const express = require('express');
const router = express.Router();
const {
    createTeacher,
    getTeachers,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
    resetTeacherPassword,
    bulkRegisterTeachers
} = require('../controllers/teacher.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(authorize('school-admin', 'receptionist', 'teacher', 'student', 'parent'), getTeachers)
    .post(authorize('school-admin'), createTeacher);

router.post('/bulk', authorize('school-admin'), bulkRegisterTeachers);

router.post('/:id/reset-password', authorize('school-admin', 'receptionist'), resetTeacherPassword);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'receptionist'), getTeacherById)
    .put(authorize('school-admin'), updateTeacher)
    .delete(authorize('school-admin'), deleteTeacher);

module.exports = router;
