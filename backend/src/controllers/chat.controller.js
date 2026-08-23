const prisma = require('../config/prismaClient');
const { getIO } = require('../config/socket');
const { logAction } = require('../utils/logger');

const isAdmin = role => ['school-admin', 'super-admin'].includes(role);
const publicUser = { id: true, firstName: true, lastName: true, role: true, avatarUrl: true };

const requireConversationAccess = async (id, user) => {
    const conversation = await prisma.chatConversation.findFirst({
        where: { id, tenantId: user.tenantId, ...(isAdmin(user.role) ? {} : { participants: { some: { userId: user.id } } }) }
    });
    if (!conversation) { const error = new Error('Conversation not found or access denied'); error.statusCode = 404; throw error; }
    return conversation;
};

const sendError = (res, error) => res.status(error.statusCode || 500).json({ success: false, message: error.message });

exports.getContacts = async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const role = req.user.role;
        const allowedRoles = role === 'parent' ? ['teacher'] : role === 'teacher' ? ['parent', 'teacher'] : ['parent', 'teacher', 'student'];
        const contacts = await prisma.user.findMany({
            where: {
                tenantId: req.user.tenantId, status: 'active', role: { in: allowedRoles }, id: { not: req.user.id },
                ...(q ? { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] } : {})
            }, select: publicUser, take: 50, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
        });
        res.json({ success: true, data: contacts });
    } catch (error) { sendError(res, error); }
};

exports.createConversation = async (req, res) => {
    try {
        const { type = 'private', title, participantIds = [], classId } = req.body;
        if (!['private', 'group', 'class'].includes(type)) return res.status(400).json({ message: 'Invalid conversation type' });
        if (type !== 'private' && !['teacher', 'school-admin', 'super-admin'].includes(req.user.role)) return res.status(403).json({ message: 'Only teachers and admins can create groups' });

        let ids = Array.from(new Set([req.user.id, ...participantIds]));
        if (type === 'private') {
            if (ids.length !== 2) return res.status(400).json({ message: 'Private chat requires exactly two participants' });
            const other = await prisma.user.findFirst({ where: { id: ids.find(id => id !== req.user.id), tenantId: req.user.tenantId }, select: { role: true } });
            if (!other) return res.status(404).json({ message: 'Contact not found' });
            if (!isAdmin(req.user.role) && req.user.role !== 'receptionist' && ![['parent', 'teacher'], ['teacher', 'parent'], ['teacher', 'teacher']].some(pair => pair[0] === req.user.role && pair[1] === other.role)) return res.status(403).json({ message: 'This private chat is not allowed' });
            const existing = await prisma.chatConversation.findFirst({
                where: { tenantId: req.user.tenantId, type: 'private', AND: ids.map(userId => ({ participants: { some: { userId } } })) },
                include: { participants: { include: { user: { select: publicUser } } } }
            });
            if (existing && existing.participants.length === 2) return res.json({ success: true, data: existing });
        }

        if (type === 'class') {
            const cls = await prisma.class.findFirst({ where: { id: classId, tenantId: req.user.tenantId } });
            if (!cls) return res.status(404).json({ message: 'Class not found' });
            const students = await prisma.user.findMany({ where: { tenantId: req.user.tenantId, role: 'student', profileClass: cls.name, profileSection: cls.section }, select: { id: true, parentLinks: { select: { parentId: true } } } });
            ids = Array.from(new Set([req.user.id, ...students.map(s => s.id), ...students.flatMap(s => s.parentLinks.map(p => p.parentId))]));
        }

        const validUsers = await prisma.user.findMany({ where: { id: { in: ids }, tenantId: req.user.tenantId, status: 'active' }, select: { id: true } });
        if (validUsers.length !== ids.length) return res.status(400).json({ message: 'One or more participants are invalid' });
        const conversation = await prisma.chatConversation.create({
            data: { type, title: title?.trim() || null, classId: classId || null, tenantId: req.user.tenantId, createdById: req.user.id, participants: { create: ids.map(userId => ({ userId })) } },
            include: { participants: { include: { user: { select: publicUser } } } }
        });
        res.status(201).json({ success: true, data: conversation });
    } catch (error) { sendError(res, error); }
};

exports.getConversations = async (req, res) => {
    try {
        const conversations = await prisma.chatConversation.findMany({
            where: { tenantId: req.user.tenantId, archived: false, ...(isAdmin(req.user.role) && req.query.moderation === 'true' ? {} : { participants: { some: { userId: req.user.id } } }) },
            include: {
                participants: { include: { user: { select: publicUser } } },
                messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: publicUser } } },
                _count: { select: { messages: true } }
            }, orderBy: { updatedAt: 'desc' }
        });
        res.json({ success: true, data: conversations });
    } catch (error) { sendError(res, error); }
};

exports.getMessages = async (req, res) => {
    try {
        await requireConversationAccess(req.params.id, req.user);
        const messages = await prisma.chatMessage.findMany({
            where: { conversationId: req.params.id }, orderBy: { createdAt: 'asc' }, take: Math.min(Number(req.query.limit) || 100, 200),
            include: { sender: { select: publicUser }, attachments: true, replyTo: { select: { id: true, body: true, sender: { select: publicUser } } }, receipts: { select: { userId: true, status: true, deliveredAt: true, readAt: true } }, _count: { select: { reports: true } } }
        });
        const unread = messages.filter(message => message.senderId !== req.user.id && !message.receipts.some(receipt => receipt.userId === req.user.id));
        if (unread.length) await prisma.chatMessageReceipt.createMany({ data: unread.map(message => ({ messageId: message.id, userId: req.user.id })), skipDuplicates: true });
        res.json({ success: true, data: messages });
    } catch (error) { sendError(res, error); }
};

exports.sendMessage = async (req, res) => {
    try {
        const conversation = await requireConversationAccess(req.params.id, req.user);
        const body = String(req.body.body || '').trim();
        if (!body && !req.file) return res.status(400).json({ message: 'Message or attachment is required' });
        if (body.length > 5000) return res.status(400).json({ message: 'Message is too long' });
        if (req.body.replyToId) {
            const reply = await prisma.chatMessage.findFirst({ where: { id: req.body.replyToId, conversationId: conversation.id } });
            if (!reply) return res.status(400).json({ message: 'Reply target is invalid' });
        }
        const participants = await prisma.chatParticipant.findMany({ where: { conversationId: conversation.id, userId: { not: req.user.id } }, select: { userId: true } });
        const isAudio = req.file?.mimetype?.startsWith('audio/');
        const message = await prisma.chatMessage.create({
            data: {
                conversationId: conversation.id, senderId: req.user.id, body: body || null, type: req.file ? (isAudio ? 'audio' : 'file') : 'text', replyToId: req.body.replyToId || null,
                attachments: req.file ? { create: [{ fileName: req.file.originalname, fileUrl: `/uploads/chat/${req.file.filename}`, mimeType: req.file.mimetype, size: req.file.size, duration: req.body.duration ? Number(req.body.duration) : null }] } : undefined,
                receipts: { create: participants.map(p => ({ userId: p.userId })) }
            }, include: { sender: { select: publicUser }, attachments: true, replyTo: { select: { id: true, body: true, sender: { select: publicUser } } }, receipts: true }
        });
        await prisma.chatConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
        try { getIO().to(`chat:${conversation.id}`).emit('chat:message', message); } catch (_) {}
        res.status(201).json({ success: true, data: message });
    } catch (error) { sendError(res, error); }
};

exports.markRead = async (req, res) => {
    try {
        await requireConversationAccess(req.params.id, req.user);
        const messages = await prisma.chatMessage.findMany({ where: { conversationId: req.params.id, senderId: { not: req.user.id } }, select: { id: true } });
        await prisma.$transaction([
            ...messages.map(message => prisma.chatMessageReceipt.upsert({ where: { messageId_userId: { messageId: message.id, userId: req.user.id } }, update: { status: 'read', readAt: new Date() }, create: { messageId: message.id, userId: req.user.id, status: 'read', readAt: new Date() } })),
            prisma.chatParticipant.update({ where: { conversationId_userId: { conversationId: req.params.id, userId: req.user.id } }, data: { lastReadAt: new Date() } })
        ]);
        try { getIO().to(`chat:${req.params.id}`).emit('chat:read', { conversationId: req.params.id, userId: req.user.id }); } catch (_) {}
        res.json({ success: true });
    } catch (error) { sendError(res, error); }
};

exports.reportMessage = async (req, res) => {
    try {
        const message = await prisma.chatMessage.findFirst({ where: { id: req.params.messageId, conversation: { tenantId: req.user.tenantId, participants: { some: { userId: req.user.id } } } } });
        if (!message) return res.status(404).json({ message: 'Message not found' });
        const report = await prisma.chatMessageReport.upsert({ where: { messageId_reporterId: { messageId: message.id, reporterId: req.user.id } }, update: { reason: req.body.reason, details: req.body.details || null, status: 'pending' }, create: { messageId: message.id, reporterId: req.user.id, reason: req.body.reason || 'inappropriate', details: req.body.details || null } });
        res.status(201).json({ success: true, data: report });
    } catch (error) { sendError(res, error); }
};

exports.getReports = async (req, res) => {
    try {
        const reports = await prisma.chatMessageReport.findMany({ where: { message: { conversation: { tenantId: req.user.tenantId } }, ...(req.query.status ? { status: req.query.status } : {}) }, include: { reporter: { select: publicUser }, message: { include: { sender: { select: publicUser }, conversation: { select: { id: true, title: true, type: true } }, attachments: true } } }, orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data: reports });
    } catch (error) { sendError(res, error); }
};

exports.moderateReport = async (req, res) => {
    try {
        const report = await prisma.chatMessageReport.findFirst({ where: { id: req.params.reportId, message: { conversation: { tenantId: req.user.tenantId } } }, include: { message: true } });
        if (!report) return res.status(404).json({ message: 'Report not found' });
        const action = req.body.action;
        await prisma.$transaction([
            prisma.chatMessageReport.update({ where: { id: report.id }, data: { status: action === 'remove' ? 'actioned' : action === 'dismiss' ? 'dismissed' : 'reviewed', reviewedById: req.user.id, reviewedAt: new Date() } }),
            ...(action === 'remove' ? [prisma.chatMessage.update({ where: { id: report.messageId }, data: { deletedAt: new Date(), moderatedAt: new Date(), moderatedById: req.user.id } })] : [])
        ]);
        await logAction({ action: 'UPDATE', module: 'USER', details: `Moderated chat report ${report.id}: ${action}`, userId: req.user.id, tenantId: req.user.tenantId });
        res.json({ success: true });
    } catch (error) { sendError(res, error); }
};

exports.getModerationStats = async (req, res) => {
    try {
        const [conversations, messages, pendingReports, removedMessages] = await Promise.all([
            prisma.chatConversation.count({ where: { tenantId: req.user.tenantId } }),
            prisma.chatMessage.count({ where: { conversation: { tenantId: req.user.tenantId } } }),
            prisma.chatMessageReport.count({ where: { status: 'pending', message: { conversation: { tenantId: req.user.tenantId } } } }),
            prisma.chatMessage.count({ where: { deletedAt: { not: null }, conversation: { tenantId: req.user.tenantId } } })
        ]);
        res.json({ success: true, data: { conversations, messages, pendingReports, removedMessages } });
    } catch (error) { sendError(res, error); }
};
