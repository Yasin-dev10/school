const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');

// @desc    Create a new school (Tenant)
// @route   POST /api/tenants
// @access  Super Admin
exports.createTenant = async (req, res) => {
    try {
        const { name, tenantId, domain, adminEmail, adminDetails, config, subscription } = req.body;

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
                    subscriptionActive: subscription.isActive !== undefined ? subscription.isActive : true
                })
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
                    passwordPlain: adminDetails.password,
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
                    subscriptionPlan: subscription.plan,
                    subscriptionValid: subscription.validUntil,
                    subscriptionActive: subscription.isActive
                })
            }
        });

        await logAction({
            action: 'UPDATE', module: 'TENANT',
            details: `Updated school: ${existing.name} -> ${tenant.name}`,
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

// @desc    Get current tenant (Dashboard/Branding)
// @route   GET /api/tenants/me
exports.getMyTenant = async (req, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { tenantId: req.user.tenantId } });
        if (!tenant) return res.status(404).json({ message: 'School not found' });
        res.status(200).json({ success: true, data: tenant });
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
