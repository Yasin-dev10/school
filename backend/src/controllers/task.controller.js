const prisma = require('../config/prismaClient');

// @desc    Create task
exports.createTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority } = req.body;
        const task = await prisma.task.create({
            data: {
                title, description, priority: priority || 'medium',
                dueDate: dueDate ? new Date(dueDate) : null,
                userId: req.user.id,
                tenantId: req.user.tenantId
            }
        });
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get my tasks
exports.getTasks = async (req, res) => {
    try {
        const { status } = req.query;
        let where = { userId: req.user.id, tenantId: req.user.tenantId };
        if (status) where.status = status;

        const tasks = await prisma.task.findMany({
            where,
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }]
        });
        res.status(200).json({ success: true, count: tasks.length, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update task
exports.updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const { title, description, dueDate, status, priority } = req.body;
        const updated = await prisma.task.update({
            where: { id: req.params.id },
            data: {
                ...(title && { title }),
                ...(description !== undefined && { description }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(status && { status }),
                ...(priority && { priority })
            }
        });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete task
exports.deleteTask = async (req, res) => {
    try {
        const task = await prisma.task.findFirst({ where: { id: req.params.id, userId: req.user.id } });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        await prisma.task.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true, message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getMyTasks = exports.getTasks;

