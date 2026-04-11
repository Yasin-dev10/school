const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/grade.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(protect);

// Create a new grade system
router.post('/', authorize('admin', 'teacher'), gradeController.createGradeSystem);

// Get active grade system
router.get('/active', gradeController.getActiveGradeSystem);

// Get all grade systems
router.get('/', gradeController.getAllGradeSystems);

// Calculate grade from percentage
router.post('/calculate', gradeController.calculateGrade);

// Bulk create grades (admin, teacher)
// Bulk create grades (admin, teacher) - TODO: Implement if needed, currently undefined
// router.post('/bulk', authorize('admin', 'teacher'), gradeController.bulkCreateGrades);

// Get grade system by ID
router.get('/:id', gradeController.getGradeSystemById);

// Update grade system
router.put('/:id', authorize('admin', 'teacher'), gradeController.updateGradeSystem);

// Delete grade system
router.delete('/:id', authorize('admin', 'teacher'), gradeController.deleteGradeSystem);

// Toggle grade system status (activate/deactivate)
router.patch('/:id/toggle', authorize('admin', 'teacher'), gradeController.toggleGradeSystemStatus);

module.exports = router;
