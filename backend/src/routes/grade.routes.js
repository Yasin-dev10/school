const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Create a new grade system
router.post('/', authorize('school-admin'), gradeController.createGradeSystem);

// Get active grade system
router.get('/active', gradeController.getActiveGradeSystem);

// Get all grade systems
router.get('/', authorize('school-admin', 'teacher', 'receptionist'), gradeController.getAllGradeSystems);

// Calculate grade from percentage
router.post('/calculate', authorize('school-admin', 'teacher', 'receptionist'), gradeController.calculateGrade);

// Get grade system by ID
router.get('/:id', authorize('school-admin', 'teacher', 'receptionist'), gradeController.getGradeSystemById);

// Update grade system
router.put('/:id', authorize('school-admin'), gradeController.updateGradeSystem);

// Delete grade system
router.delete('/:id', authorize('school-admin'), gradeController.deleteGradeSystem);

// Toggle grade system status (activate/deactivate)
router.patch('/:id/toggle', authorize('school-admin'), gradeController.toggleGradeSystemStatus);

module.exports = router;
