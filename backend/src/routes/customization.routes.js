const router = require('express').Router();
const { protect, authorize } = require('../middlewares/auth.middleware');
const controller = require('../controllers/customization.controller');
const run = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.use(protect, authorize('school-admin'));
router.get('/branches', run(controller.listBranches));
router.get('/branches/resources', run(controller.listBranchResources));
router.post('/branches', run(controller.createBranch));
router.put('/branches/:id', run(controller.updateBranch));
router.delete('/branches/:id', run(controller.deleteBranch));
router.patch('/branches/assign/resource', run(controller.assignBranch));
router.get('/custom-fields', run(controller.listCustomFields));
router.post('/custom-fields', run(controller.createCustomField));
router.put('/custom-fields/:id', run(controller.updateCustomField));
router.delete('/custom-fields/:id', run(controller.deleteCustomField));
router.get('/custom-fields/values/:entityType/:entityId', run(controller.getCustomValues));
router.put('/custom-fields/values/:entityType/:entityId', run(controller.saveCustomValues));
router.get('/workflows', run(controller.listWorkflows));
router.post('/workflows', run(controller.createWorkflow));
router.put('/workflows/:id', run(controller.updateWorkflow));
router.delete('/workflows/:id', run(controller.deleteWorkflow));

module.exports = router;
