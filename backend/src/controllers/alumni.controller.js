const prisma = require('../config/prismaClient');

const clean = value => typeof value === 'string' ? value.trim() : value;
const withId = record => ({ ...record, _id: record.id });

exports.getOverview = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const [alumni, events, donations] = await Promise.all([
            prisma.alumni.findMany({ where: { tenantId }, orderBy: [{ graduationYear: 'desc' }, { lastName: 'asc' }] }),
            prisma.alumniEvent.findMany({ where: { tenantId }, orderBy: { startsAt: 'asc' } }),
            prisma.alumniDonation.findMany({
                where: { tenantId },
                include: { alumni: { select: { id: true, firstName: true, lastName: true } } },
                orderBy: { donatedAt: 'desc' }
            })
        ]);
        const employed = alumni.filter(item => item.employmentStatus === 'employed').length;
        const higherEducation = alumni.filter(item => item.university).length;
        const totalDonations = donations
            .filter(item => item.status === 'received')
            .reduce((sum, item) => sum + Number(item.amount), 0);
        res.json({
            success: true,
            data: {
                alumni: alumni.map(withId),
                events: events.map(withId),
                donations: donations.map(item => ({ ...withId(item), amount: Number(item.amount) })),
                stats: { total: alumni.length, employed, higherEducation, totalDonations }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createAlumni = async (req, res) => {
    try {
        const year = Number(req.body.graduationYear);
        if (!clean(req.body.firstName) || !clean(req.body.lastName) || !Number.isInteger(year) || year < 1900 || year > 2200) {
            return res.status(400).json({ success: false, message: 'First name, last name, and a valid graduation year are required' });
        }
        const item = await prisma.alumni.create({ data: alumniData(req.body, req.user.tenantId, year) });
        res.status(201).json({ success: true, data: withId(item) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateAlumni = async (req, res) => {
    try {
        const existing = await prisma.alumni.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!existing) return res.status(404).json({ success: false, message: 'Alumnus not found' });
        const year = Number(req.body.graduationYear);
        if (!clean(req.body.firstName) || !clean(req.body.lastName) || !Number.isInteger(year)) {
            return res.status(400).json({ success: false, message: 'First name, last name, and graduation year are required' });
        }
        const item = await prisma.alumni.update({ where: { id: existing.id }, data: alumniData(req.body, undefined, year) });
        res.json({ success: true, data: withId(item) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

function alumniData(body, tenantId, graduationYear) {
    const data = {
        firstName: clean(body.firstName), lastName: clean(body.lastName), graduationYear,
        email: clean(body.email) || null, phone: clean(body.phone) || null,
        program: clean(body.program) || null, currentCity: clean(body.currentCity) || null,
        employmentStatus: clean(body.employmentStatus) || 'unknown', employer: clean(body.employer) || null,
        jobTitle: clean(body.jobTitle) || null, university: clean(body.university) || null,
        degree: clean(body.degree) || null, notes: clean(body.notes) || null
    };
    if (tenantId) data.tenantId = tenantId;
    return data;
}

exports.deleteAlumni = async (req, res) => removeOwned(prisma.alumni, 'Alumnus', req, res);

exports.createEvent = async (req, res) => {
    try {
        const startsAt = new Date(req.body.startsAt);
        const capacity = req.body.capacity ? Number(req.body.capacity) : null;
        if (!clean(req.body.title) || Number.isNaN(startsAt.getTime()) || (capacity !== null && (!Number.isInteger(capacity) || capacity < 1))) {
            return res.status(400).json({ success: false, message: 'Title, valid date, and a positive capacity are required' });
        }
        const item = await prisma.alumniEvent.create({ data: {
            tenantId: req.user.tenantId, title: clean(req.body.title), description: clean(req.body.description) || null,
            location: clean(req.body.location) || null, startsAt, capacity,
            attendeeCount: Math.max(0, Number(req.body.attendeeCount) || 0), status: clean(req.body.status) || 'upcoming'
        }});
        res.status(201).json({ success: true, data: withId(item) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteEvent = async (req, res) => removeOwned(prisma.alumniEvent, 'Event', req, res);

exports.createDonation = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (!clean(req.body.donorName) || !Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Donor name and a positive amount are required' });
        }
        if (req.body.alumniId) {
            const alumnus = await prisma.alumni.findFirst({ where: { id: req.body.alumniId, tenantId: req.user.tenantId } });
            if (!alumnus) return res.status(400).json({ success: false, message: 'Selected alumnus was not found' });
        }
        const item = await prisma.alumniDonation.create({ data: {
            tenantId: req.user.tenantId, alumniId: req.body.alumniId || null, donorName: clean(req.body.donorName),
            amount, currency: clean(req.body.currency) || 'USD', purpose: clean(req.body.purpose) || null,
            donatedAt: req.body.donatedAt ? new Date(req.body.donatedAt) : new Date(), status: clean(req.body.status) || 'received'
        }});
        res.status(201).json({ success: true, data: { ...withId(item), amount: Number(item.amount) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteDonation = async (req, res) => removeOwned(prisma.alumniDonation, 'Donation', req, res);

async function removeOwned(model, label, req, res) {
    try {
        const existing = await model.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
        if (!existing) return res.status(404).json({ success: false, message: `${label} not found` });
        await model.delete({ where: { id: existing.id } });
        res.json({ success: true, message: `${label} deleted` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}
