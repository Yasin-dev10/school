const express = require('express');
const certificateController = require('../controllers/certificate.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public verification route
router.get('/verify/:code', certificateController.verifyCertificate);

// Protected routes
router.use(protect);

router.get('/my', certificateController.getMyCertificates);

router.use(authorize('school-admin', 'teacher'));
router.route('/')
    .get(certificateController.getAllCertificates)
    .post(certificateController.issueCertificate);

router.get('/student/:studentId', certificateController.getStudentCertificates);

router.patch('/:id/revoke', authorize('school-admin'), certificateController.revokeCertificate);

router.route('/:id')
    .patch(authorize('school-admin', 'teacher'), certificateController.updateCertificate)
    .delete(authorize('school-admin'), certificateController.deleteCertificate);

module.exports = router;
