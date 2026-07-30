const express = require('express');
const { protect, authorize } = require('../middlewares/auth.middleware');
const {
    getInventory,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem
} = require('../controllers/inventory.controller');

const router = express.Router();
router.use(protect);
router.get('/', authorize('school-admin', 'accountant', 'librarian', 'receptionist'), getInventory);
router.post('/', authorize('school-admin', 'librarian'), createInventoryItem);
router.put('/:id', authorize('school-admin', 'librarian'), updateInventoryItem);
router.delete('/:id', authorize('school-admin'), deleteInventoryItem);

module.exports = router;
