const express = require('express');
const router = express.Router();
const {
    createMaterial,
    getMaterials,
    updateMaterial,
    deleteMaterial
} = require('../controllers/material.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(getMaterials)
    .post(authorize('teacher', 'school-admin'), createMaterial);

router.route('/:id')
    .put(authorize('teacher', 'school-admin'), updateMaterial)
    .delete(authorize('teacher', 'school-admin'), deleteMaterial);

module.exports = router;
