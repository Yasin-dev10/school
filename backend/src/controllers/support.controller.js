const prisma = require('../config/prismaClient');

const categories = ['technical', 'account', 'attendance', 'grades', 'fees', 'communication', 'other'];
const priorities = ['low', 'normal', 'high', 'urgent'];
const statuses = ['open', 'in_progress', 'resolved', 'closed'];

exports.createTicket = async (req, res) => {
    try {
        const { category, subject, description, priority = 'normal' } = req.body;
        if (!categories.includes(category) || !priorities.includes(priority) || !subject?.trim() || !description?.trim()) return res.status(400).json({ message: 'Please provide a valid category, subject, description, and priority.' });
        if (subject.trim().length > 140 || description.trim().length > 5000) return res.status(400).json({ message: 'Ticket content is too long.' });
        const ticket = await prisma.supportTicket.create({ data: { tenantId: req.user.tenantId, requesterId: req.user.id, category, subject: subject.trim(), description: description.trim(), priority }, include: { requester: { select: { firstName: true, lastName: true, role: true } } } });
        res.status(201).json({ message: 'Your support ticket has been submitted.', data: ticket });
    } catch (error) { res.status(500).json({ message: 'Failed to create support ticket.' }); }
};

exports.getTickets = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'school-admin';
        const where = { tenantId: req.user.tenantId, ...(isAdmin ? {} : { requesterId: req.user.id }), ...(req.query.status && statuses.includes(req.query.status) ? { status: req.query.status } : {}) };
        const tickets = await prisma.supportTicket.findMany({ where, include: { requester: { select: { id: true, firstName: true, lastName: true, role: true } }, assignedTo: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
        res.json({ data: tickets });
    } catch (error) { res.status(500).json({ message: 'Failed to load support tickets.' }); }
};

exports.updateTicket = async (req, res) => {
    try {
        const { status, adminReply } = req.body;
        if (!statuses.includes(status)) return res.status(400).json({ message: 'Invalid ticket status.' });
        const existing = await prisma.supportTicket.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!existing) return res.status(404).json({ message: 'Ticket not found.' });
        const ticket = await prisma.supportTicket.update({ where: { id: existing.id }, data: { status, adminReply: typeof adminReply === 'string' ? adminReply.trim().slice(0, 5000) : existing.adminReply, assignedToId: req.user.id, resolvedAt: ['resolved', 'closed'].includes(status) ? new Date() : null } });
        res.json({ message: 'Ticket updated.', data: ticket });
    } catch (error) { res.status(500).json({ message: 'Failed to update support ticket.' }); }
};

exports.submitSurvey = async (req, res) => {
    try {
        const rating = Number(req.body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        const survey = await prisma.satisfactionSurvey.create({ data: { tenantId: req.user.tenantId, userId: req.user.id, rating, comment: req.body.comment?.trim().slice(0, 2000) || null, context: req.body.context?.trim().slice(0, 80) || 'general' } });
        res.status(201).json({ message: 'Thank you for your feedback.', data: survey });
    } catch (error) { res.status(500).json({ message: 'Failed to save feedback.' }); }
};

exports.getInsights = async (req, res) => {
    try {
        const tenantId = req.user.tenantId; const since = new Date(); since.setDate(since.getDate() - 90);
        const [tickets, surveys] = await Promise.all([prisma.supportTicket.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { category: true, status: true, subject: true } }), prisma.satisfactionSurvey.findMany({ where: { tenantId, createdAt: { gte: since } }, select: { rating: true } })]);
        const categoryMap = {};
        tickets.forEach(t => { if (!categoryMap[t.category]) categoryMap[t.category] = { category: t.category, count: 0, open: 0, latestSubjects: [] }; const item = categoryMap[t.category]; item.count++; if (!['resolved', 'closed'].includes(t.status)) item.open++; if (item.latestSubjects.length < 3) item.latestSubjects.push(t.subject); });
        const recurringComplaints = Object.values(categoryMap).filter(x => x.count >= 2).sort((a, b) => b.count - a.count);
        const average = surveys.length ? surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length : 0;
        res.json({ data: { recurringComplaints, totalTickets: tickets.length, openTickets: tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length, satisfaction: { average: +average.toFixed(1), responses: surveys.length, positiveRate: surveys.length ? +((surveys.filter(s => s.rating >= 4).length / surveys.length) * 100).toFixed(1) : 0 } } });
    } catch (error) { res.status(500).json({ message: 'Failed to load support insights.' }); }
};
