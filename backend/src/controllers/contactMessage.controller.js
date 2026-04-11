const prisma = require('../config/prismaClient');

// Create contact message (public)
const createContactMessage = async (req, res) => {
    try {
        const { firstName, lastName, email, institution, message, role } = req.body;

        if (!firstName || !lastName || !email || !message)
            return res.status(400).json({ message: 'Please provide all required fields' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ message: 'Please provide a valid email address' });

        const contactMessage = await prisma.contactMessage.create({
            data: { firstName, lastName, email: email.toLowerCase(), institution: institution || null, message, role: role || 'Other' }
        });

        res.status(201).json({ message: 'Thank you! We will get back to you soon.', data: contactMessage });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send message.' });
    }
};

// Get all contact messages
const getContactMessages = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let where = {};
        if (status) where.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [messages, total] = await Promise.all([
            prisma.contactMessage.findMany({
                where,
                include: { repliedBy: { select: { id: true, firstName: true, lastName: true, email: true } } },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.contactMessage.count({ where })
        ]);

        res.json({ messages, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Get single message
const getContactMessageById = async (req, res) => {
    try {
        const msg = await prisma.contactMessage.findUnique({
            where: { id: req.params.id },
            include: { repliedBy: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });

        if (!msg) return res.status(404).json({ message: 'Contact message not found' });

        // Mark as read
        if (msg.status === 'new') {
            await prisma.contactMessage.update({ where: { id: req.params.id }, data: { status: 'read' } });
        }

        res.json(msg);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch message' });
    }
};

// Update status / reply
const updateContactMessageStatus = async (req, res) => {
    try {
        const { status, reply } = req.body;

        if (!['new', 'read', 'replied', 'archived'].includes(status))
            return res.status(400).json({ message: 'Invalid status value' });

        const msg = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
        if (!msg) return res.status(404).json({ message: 'Contact message not found' });

        const updated = await prisma.contactMessage.update({
            where: { id: req.params.id },
            data: {
                status,
                ...(reply && status === 'replied' && {
                    reply,
                    repliedById: req.user._id,
                    repliedAt: new Date()
                })
            },
            include: { repliedBy: { select: { id: true, firstName: true, lastName: true, email: true } } }
        });

        res.json({ message: 'Updated successfully', data: updated });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update message' });
    }
};

// Delete message
const deleteContactMessage = async (req, res) => {
    try {
        const msg = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
        if (!msg) return res.status(404).json({ message: 'Contact message not found' });

        await prisma.contactMessage.delete({ where: { id: req.params.id } });
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete message' });
    }
};

// Stats
const getContactStats = async (req, res) => {
    try {
        const today = new Date(); today.setHours(0, 0, 0, 0);

        const [total, todayCount, newCount, readCount, repliedCount, archivedCount] = await Promise.all([
            prisma.contactMessage.count(),
            prisma.contactMessage.count({ where: { createdAt: { gte: today } } }),
            prisma.contactMessage.count({ where: { status: 'new' } }),
            prisma.contactMessage.count({ where: { status: 'read' } }),
            prisma.contactMessage.count({ where: { status: 'replied' } }),
            prisma.contactMessage.count({ where: { status: 'archived' } })
        ]);

        res.json({ total, todayCount, statusCounts: { new: newCount, read: readCount, replied: repliedCount, archived: archivedCount } });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
};

module.exports = { createContactMessage, getContactMessages, getContactMessageById, updateContactMessageStatus, deleteContactMessage, getContactStats };
