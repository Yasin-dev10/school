const express = require('express');
const router = express.Router();
const { getMyTasks, createTask, updateTask, deleteTask } = require('../controllers/task.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.route('/')
    .get(getMyTasks)
    .post(createTask);

router.route('/:id')
    .put(updateTask)
    .delete(deleteTask);

module.exports = router;
