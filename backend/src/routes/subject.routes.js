const express = require('express');
const router = express.Router();
const {
    createSubject,
    getSubjects,
    updateSubject,
    deleteSubject,
    addResource,
    removeResource
} = require('../controllers/subject.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist', 'student', 'parent'), getSubjects)
    .post(authorize('school-admin'), createSubject);

router.route('/:id')
    .put(authorize('school-admin'), updateSubject)
    .delete(authorize('school-admin'), deleteSubject);

router.post('/:id/resources', authorize('school-admin', 'teacher'), addResource);
router.delete('/:id/resources/:resourceId', authorize('school-admin', 'teacher'), removeResource);

module.exports = router;
