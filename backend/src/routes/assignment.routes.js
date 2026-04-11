const express = require('express');
const router = express.Router();
const {
    createAssignment,
    getAssignments,
    deleteAssignment,
    submitAssignment,
    getSubmissions,
    gradeSubmission
} = require('../controllers/assignment.controller');
const { protect } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const permissionService = require('../services/permission.service');

const { RESOURCES, ACTIONS } = permissionService;

const upload = require('../middlewares/upload.middleware');

router.use(protect);

router.route('/')
    .get(checkPermission(RESOURCES.ASSIGNMENTS, ACTIONS.READ), getAssignments)
    .post(checkPermission(RESOURCES.ASSIGNMENTS, ACTIONS.CREATE), createAssignment);

router.route('/:id')
    .delete(checkPermission(RESOURCES.ASSIGNMENTS, ACTIONS.DELETE), deleteAssignment);

router.route('/:id/submit')
    .post(checkPermission(RESOURCES.SUBMISSIONS, ACTIONS.CREATE), upload.single('file'), submitAssignment);

router.route('/:id/submissions')
    .get(checkPermission(RESOURCES.SUBMISSIONS, ACTIONS.READ), getSubmissions);

router.route('/submissions/:id/grade')
    // Grading is effectively creating/updating a grade, which students cannot do.
    .post(checkPermission(RESOURCES.GRADES, ACTIONS.CREATE), gradeSubmission);

module.exports = router;
