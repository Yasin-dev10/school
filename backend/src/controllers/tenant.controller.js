const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const { AVAILABLE_MODULES } = require('../utils/subscriptionAccess');

const validAccessModes = new Set(['full', 'limited', 'suspended']);
const cleanModules = (modules) => Array.isArray(modules)
    ? [...new Set(modules.filter((moduleName) => AVAILABLE_MODULES.has(moduleName)))]
    : [];

// @desc    Create a new school (Tenant)
// @route   POST /api/tenants
// @access  Super Admin
exports.createTenant = async (req, res) => {
    try {
        const { name, tenantId, domain, adminEmail, adminDetails, config, subscription } = req.body;
        const currentYear = new Date().getUTCFullYear();
        const initialAcademicYear = /^\d{4}-\d{4}$/.test(config?.academicYear || '')
            ? config.academicYear
            : `${currentYear}-${currentYear + 1}`;
        const [initialStartYear, initialEndYear] = initialAcademicYear.split('-').map(Number);

        const existing = await prisma.tenant.findFirst({
            where: { OR: [{ tenantId }, { domain: domain || undefined }] }
        });
        if (existing) {
            return res.status(400).json({ message: 'Tenant ID or Domain already exists' });
        }

        const tenant = await prisma.tenant.create({
            data: {
                tenantId,
                name,
                domain: domain || null,
                ...(config && {
                    academicYear: config.academicYear,
                    gradingSystem: config.gradingSystem || 'GPA',
                    currency: config.currency || 'USD',
                    timezone: config.timezone || 'UTC',
                    logoUrl: config.logoUrl,
                    primaryColor: config.primaryColor || '#4f46e5',
                    secondaryColor: config.secondaryColor || '#1e293b',
                    address: config.address,
                    contactEmail: config.contactEmail,
                    contactPhone: config.contactPhone,
                    vision: config.vision,
                    mission: config.mission,
                    gradeLevels: config.gradeLevels || ['elementary', 'middle', 'high']
                }),
                ...(subscription && {
                    subscriptionPlan: subscription.plan || 'basic',
                    subscriptionValid: subscription.validUntil,
                    subscriptionActive: subscription.isActive !== undefined ? subscription.isActive : true,
                    billingCycle: subscription.billingCycle || 'Monthly',
                    ...(validAccessModes.has(subscription.accessMode) && { accessMode: subscription.accessMode }),
                    allowedModules: cleanModules(subscription.allowedModules),
                    graceDays: Math.max(0, Number(subscription.graceDays) || 0),
                    warningDays: Math.max(0, Number(subscription.warningDays ?? 5) || 0),
                    autoSuspend: subscription.autoSuspend !== false,
                }),
                academicYear: initialAcademicYear,
                academicYears: {
                    create: {
                        name: initialAcademicYear,
                        startDate: new Date(`${initialStartYear}-09-01T00:00:00.000Z`),
                        endDate: new Date(`${initialEndYear}-08-31T23:59:59.999Z`),
                        isCurrent: true
                    }
                }
            }
        });

        let adminUser = null;
        if (adminEmail && adminDetails) {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(adminDetails.password, salt);
            adminUser = await prisma.user.create({
                data: {
                    firstName: adminDetails.firstName,
                    lastName: adminDetails.lastName,
                    email: adminEmail,
                    password: hashed,
                    role: 'school_admin',
                    tenantId: tenant.tenantId
                }
            });
        }

        await logAction({
            action: 'CREATE', module: 'TENANT',
            details: `Created school: ${name} (${tenantId})`,
            userId: req.user?._id, tenantId: 'platform'
        });

        res.status(201).json({
            success: true,
            data: {
                tenant,
                admin: adminUser ? { id: adminUser.id, email: adminUser.email } : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all tenants
exports.getAllTenants = async (req, res) => {
    try {
        const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
        res.status(200).json({ success: true, count: tenants.length, data: tenants });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get tenant by ID
exports.getTenantById = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update tenant details
exports.updateTenant = async (req, res) => {
    try {
        const existing = await prisma.tenant.findUnique({ where: { id: req.params.id } });
        if (!existing) return res.status(404).json({ message: 'Tenant not found' });

        const { name, domain, config, subscription, status } = req.body;

        const tenant = await prisma.tenant.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(domain !== undefined && { domain }),
                ...(status && { status }),
                ...(config && {
                    academicYear: config.academicYear,
                    gradingSystem: config.gradingSystem,
                    currency: config.currency,
                    timezone: config.timezone,
                    logoUrl: config.logoUrl,
                    primaryColor: config.primaryColor,
                    secondaryColor: config.secondaryColor,
                    address: config.address,
                    contactEmail: config.contactEmail,
                    contactPhone: config.contactPhone,
                    vision: config.vision,
                    mission: config.mission,
                    gradeLevels: config.gradeLevels
                }),
                ...(subscription && {
                    ...(subscription.plan !== undefined && { subscriptionPlan: subscription.plan }),
                    ...(subscription.validUntil !== undefined && subscription.validUntil !== null && subscription.validUntil !== '' && {
                        subscriptionValid: new Date(subscription.validUntil).toISOString()
                    }),
                    ...(subscription.isActive !== undefined && { subscriptionActive: subscription.isActive }),
                    ...(subscription.billingCycle !== undefined && { billingCycle: subscription.billingCycle }),
                    ...(validAccessModes.has(subscription.accessMode) && { accessMode: subscription.accessMode }),
                    ...(Array.isArray(subscription.allowedModules) && { allowedModules: cleanModules(subscription.allowedModules) }),
                    ...(subscription.graceDays !== undefined && { graceDays: Math.max(0, Number(subscription.graceDays) || 0) }),
                    ...(subscription.warningDays !== undefined && { warningDays: Math.max(0, Number(subscription.warningDays) || 0) }),
                    ...(subscription.autoSuspend !== undefined && { autoSuspend: Boolean(subscription.autoSuspend) })
                })
            }
        });

        await logAction({
            action: 'UPDATE', module: 'TENANT',
            details: `Updated school: ${existing.name} -> ${tenant.name}. Subscription access: ${existing.accessMode || 'full'} -> ${tenant.accessMode}`,
            userId: req.user?._id, tenantId: 'platform'
        });

        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete tenant
exports.deleteTenant = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        await prisma.tenant.delete({ where: { id: req.params.id } });

        await logAction({
            action: 'DELETE', module: 'TENANT',
            details: `Deleted school: ${tenant.name} (${tenant.tenantId})`,
            userId: req.user?._id, tenantId: 'platform'
        });

        res.status(200).json({ success: true, message: 'Tenant deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Record a subscription payment for a tenant (Super Admin)
// @route   POST /api/tenants/:id/payments
exports.recordTenantPayment = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        const {
            amount,
            paymentMethod = 'credit_card',
            transactionId,
            note,
            paymentDate,
            renewMonths = 1,
            accessMode = 'full',
            allowedModules,
        } = req.body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // Extend subscription validity
        const baseDate = tenant.subscriptionValid && new Date(tenant.subscriptionValid) > new Date()
            ? new Date(tenant.subscriptionValid)
            : new Date();
        baseDate.setMonth(baseDate.getMonth() + Number(renewMonths));

        const updated = await prisma.tenant.update({
            where: { id: req.params.id },
            data: {
                subscriptionActive: true,
                subscriptionValid: baseDate.toISOString(),
                status: 'active',
                accessMode: accessMode === 'limited' ? 'limited' : 'full',
                ...(accessMode === 'limited' && { allowedModules: cleanModules(allowedModules) }),
                lastPaymentAt: paymentDate ? new Date(paymentDate) : new Date(),
            }
        });

        await logAction({
            action: 'UPDATE',
            module: 'TENANT',
            details: `Payment recorded for ${tenant.name}: $${amount} via ${paymentMethod}. Access granted: ${accessMode === 'limited' ? 'limited' : 'full'}. TxnID: ${transactionId || 'N/A'}. Note: ${note || '—'}`,
            userId: req.user?._id,
            tenantId: 'platform'
        });

        res.status(201).json({
            success: true,
            message: 'Payment recorded and subscription extended',
            data: {
                tenantId:    tenant.id,
                schoolName:  tenant.name,
                amount:      Number(amount),
                paymentMethod,
                transactionId: transactionId || null,
                note:          note || null,
                paymentDate:   paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
                newValidUntil: baseDate.toISOString(),
                renewMonths:   Number(renewMonths),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current tenant (Dashboard/Branding)
// @route   GET /api/tenants/me
exports.getMyTenant = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { tenantId: req.user.tenantId } });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        const subscription = req.subscription ? {
            mode: req.subscription.mode,
            overdue: req.subscription.overdue,
            graceExpired: req.subscription.graceExpired,
            graceUntil: req.subscription.graceUntil,
            daysRemaining: req.subscription.daysRemaining,
            showWarning: req.subscription.showWarning,
            allowedModules: tenant.allowedModules,
        } : null;
        res.status(200).json({ success: true, data: { ...tenant, subscriptionAccess: subscription } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update current tenant branding
// @route   PUT /api/tenants/me
exports.updateMyTenant = async (req, res) => {
    try {
        const existing = await prisma.tenant.findUnique({ where: { tenantId: req.user.tenantId } });
        if (!existing) return res.status(404).json({ message: 'School not found' });

        const { name, config } = req.body;

        const tenant = await prisma.tenant.update({
            where: { tenantId: req.user.tenantId },
            data: {
                ...(name && { name }),
                ...(config && {
                    academicYear: config.academicYear ?? existing.academicYear,
                    gradingSystem: config.gradingSystem ?? existing.gradingSystem,
                    currency: config.currency ?? existing.currency,
                    timezone: config.timezone ?? existing.timezone,
                    logoUrl: config.logoUrl ?? existing.logoUrl,
                    primaryColor: config.primaryColor ?? existing.primaryColor,
                    secondaryColor: config.secondaryColor ?? existing.secondaryColor,
                    address: config.address ?? existing.address,
                    contactEmail: config.contactEmail ?? existing.contactEmail,
                    contactPhone: config.contactPhone ?? existing.contactPhone,
                    vision: config.vision ?? existing.vision,
                    mission: config.mission ?? existing.mission
                })
            }
        });

        await logAction({
            action: 'UPDATE', module: 'TENANT',
            details: `Updated institutional branding for: ${tenant.name}`,
            userId: req.user._id, tenantId: tenant.tenantId
        });

        res.status(200).json({ success: true, data: tenant });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const academicYearPattern = /^(\d{4})-(\d{4})$/;

const parseAcademicYearInput = (body) => {
    const name = String(body.name || '').trim();
    const match = name.match(academicYearPattern);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
        return { error: 'Academic year must use YYYY-YYYY and span exactly one year (for example 2026-2027)' };
    }

    const startDate = body.startDate
        ? new Date(body.startDate)
        : new Date(`${match[1]}-09-01T00:00:00.000Z`);
    const endDate = body.endDate
        ? new Date(body.endDate)
        : new Date(`${match[2]}-08-31T23:59:59.999Z`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        return { error: 'A valid start date and an end date after it are required' };
    }

    return { name, startDate, endDate };
};

// @desc    List current and archived academic years, including preserved data counts
// @route   GET /api/tenants/me/academic-years
exports.getMyAcademicYears = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const years = await prisma.academicYear.findMany({
            where: { tenantId },
            orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }]
        });

        const data = await Promise.all(years.map(async (year) => {
            const range = { gte: year.startDate, lte: year.endDate };
            const [exams, attendanceRecords, invoices, payments] = await Promise.all([
                prisma.exam.count({ where: { tenantId, startDate: range } }),
                prisma.attendance.count({ where: { tenantId, date: range } }),
                prisma.invoice.count({ where: { tenantId, createdAt: range } }),
                prisma.payment.aggregate({
                    where: { tenantId, paymentDate: range },
                    _count: { _all: true },
                    _sum: { amount: true }
                })
            ]);

            return {
                ...year,
                stats: {
                    exams,
                    attendanceRecords,
                    invoices,
                    payments: payments._count._all,
                    amountPaid: payments._sum.amount || 0
                }
            };
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    View preserved records belonging to one academic year
// @route   GET /api/tenants/me/academic-years/:yearId
exports.getMyAcademicYearRecords = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const year = await prisma.academicYear.findFirst({
            where: { id: req.params.yearId, tenantId }
        });
        if (!year) return res.status(404).json({ success: false, message: 'Academic year not found' });

        const range = { gte: year.startDate, lte: year.endDate };
        const [exams, attendance, invoices, payments] = await Promise.all([
            prisma.exam.findMany({
                where: { tenantId, startDate: range },
                select: { id: true, name: true, term: true, startDate: true, endDate: true, status: true },
                orderBy: { startDate: 'desc' }, take: 100
            }),
            prisma.attendance.findMany({
                where: { tenantId, date: range },
                select: {
                    id: true, date: true, status: true, remarks: true,
                    student: { select: { id: true, firstName: true, lastName: true } },
                    class: { select: { id: true, name: true, section: true } }
                },
                orderBy: { date: 'desc' }, take: 100
            }),
            prisma.invoice.findMany({
                where: { tenantId, createdAt: range },
                select: {
                    id: true, invoiceNumber: true, totalAmount: true, paidAmount: true,
                    dueDate: true, status: true, createdAt: true,
                    student: { select: { id: true, firstName: true, lastName: true } },
                    class: { select: { id: true, name: true, section: true } }
                },
                orderBy: { createdAt: 'desc' }, take: 100
            }),
            prisma.payment.findMany({
                where: { tenantId, paymentDate: range },
                select: {
                    id: true, amount: true, paymentDate: true, paymentMethod: true,
                    transactionId: true, invoice: { select: { invoiceNumber: true } }
                },
                orderBy: { paymentDate: 'desc' }, take: 100
            })
        ]);

        res.status(200).json({ success: true, data: { year, exams, attendance, invoices, payments } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Close the current year and begin a new academic year without deleting old data
// @route   POST /api/tenants/me/academic-years
exports.startMyAcademicYear = async (req, res) => {
    try {
        const parsed = parseAcademicYearInput(req.body);
        if (parsed.error) {
            return res.status(400).json({ success: false, message: parsed.error });
        }

        const tenantId = req.user.tenantId;
        const existing = await prisma.academicYear.findUnique({
            where: { tenantId_name: { tenantId, name: parsed.name } }
        });
        if (existing) {
            return res.status(409).json({ success: false, message: `${parsed.name} already exists in academic-year history` });
        }

        const now = new Date();
        const year = await prisma.$transaction(async (tx) => {
            await tx.academicYear.updateMany({
                where: { tenantId, isCurrent: true },
                data: { isCurrent: false, closedAt: now }
            });
            const created = await tx.academicYear.create({
                data: {
                    tenantId,
                    name: parsed.name,
                    startDate: parsed.startDate,
                    endDate: parsed.endDate,
                    isCurrent: true
                }
            });
            await tx.tenant.update({
                where: { tenantId },
                data: { academicYear: parsed.name }
            });
            return created;
        });

        await logAction({
            action: 'CREATE', module: 'TENANT',
            details: `Closed the previous academic year and started ${parsed.name}`,
            userId: req.user._id, tenantId
        });

        res.status(201).json({
            success: true,
            message: `${parsed.name} is now the current academic year. Previous records remain archived.`,
            data: year
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
