const express = require('express');
const router = express.Router();
const {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    promoteStudents,
    getChildren,
    bulkImportStudents,
    resetStudentPassword
} = require('../controllers/student.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');
const { validate, validateObjectId, validateBulkOperation } = require('../middlewares/validation.middleware');
const { studentSchema } = require('../utils/validationSchemas');

// All student management routes require authentication
router.use(protect);

router.get('/my-children', authorize('parent'), getChildren);
router.post('/promote', authorize('school-admin'), validateBulkOperation(), promoteStudents);
router.post('/bulk-import', authorize('school-admin'), validateBulkOperation(), bulkImportStudents);

// Restricted to roles that can manage students
router.route('/')
    .get(authorize('school-admin', 'teacher', 'receptionist'), getStudents)
    .post(authorize('school-admin', 'receptionist'), validate(studentSchema), createStudent);

router.post('/:id/reset-password', authorize('school-admin', 'receptionist'), validateObjectId('id'), resetStudentPassword);

router.route('/:id')
    .get(authorize('school-admin', 'teacher', 'parent', 'receptionist'), validateObjectId('id'), getStudentById)
    .put(authorize('school-admin', 'teacher'), validateObjectId('id'), updateStudent)
    .delete(authorize('school-admin'), validateObjectId('id'), deleteStudent);

module.exports = router;
