const prisma = require('../config/prismaClient');

const clean = value => typeof value === 'string' ? value.trim() : value;
const fail = (res, message, status = 400) => res.status(status).json({ success: false, message });

exports.listBranches = async (req, res) => {
    const data = await prisma.branch.findMany({
        where: { tenantId: req.user.tenantId },
        include: { _count: { select: { users: true, classes: true } } },
        orderBy: [{ isMain: 'desc' }, { name: 'asc' }]
    });
    res.json({ success: true, data });
};

exports.listBranchResources = async (req, res) => {
    const tenantId = req.user.tenantId;
    const [users, classes] = await Promise.all([
        prisma.user.findMany({
            where: { tenantId, role: { not: 'parent' } },
            select: {
                id: true, firstName: true, lastName: true, username: true,
                email: true, role: true, status: true, branchId: true
            },
            orderBy: [{ role: 'asc' }, { firstName: 'asc' }]
        }),
        prisma.class.findMany({
            where: { tenantId },
            select: { id: true, name: true, section: true, grade: true, status: true, branchId: true },
            orderBy: [{ name: 'asc' }, { section: 'asc' }]
        })
    ]);
    res.json({ success: true, data: { users, classes } });
};

exports.createBranch = async (req, res) => {
    const { name, code, address, phone, email, managerName, isMain = false } = req.body;
    if (!clean(name) || !clean(code)) return fail(res, 'Branch name and code are required');
    try {
        const data = await prisma.$transaction(async tx => {
            if (isMain) await tx.branch.updateMany({ where: { tenantId: req.user.tenantId }, data: { isMain: false } });
            return tx.branch.create({ data: {
                tenantId: req.user.tenantId, name: clean(name), code: clean(code).toUpperCase(),
                address: clean(address) || null, phone: clean(phone) || null, email: clean(email) || null,
                managerName: clean(managerName) || null, isMain: Boolean(isMain)
            } });
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        if (error.code === 'P2002') return fail(res, 'That branch code is already in use');
        throw error;
    }
};

exports.updateBranch = async (req, res) => {
    const existing = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!existing) return fail(res, 'Branch not found', 404);
    const body = req.body;
    try {
        const data = await prisma.$transaction(async tx => {
            if (body.isMain === true) await tx.branch.updateMany({ where: { tenantId: req.user.tenantId, id: { not: existing.id } }, data: { isMain: false } });
            return tx.branch.update({ where: { id: existing.id }, data: {
                ...(body.name !== undefined && { name: clean(body.name) }),
                ...(body.code !== undefined && { code: clean(body.code).toUpperCase() }),
                ...(body.address !== undefined && { address: clean(body.address) || null }),
                ...(body.phone !== undefined && { phone: clean(body.phone) || null }),
                ...(body.email !== undefined && { email: clean(body.email) || null }),
                ...(body.managerName !== undefined && { managerName: clean(body.managerName) || null }),
                ...(body.isMain !== undefined && { isMain: Boolean(body.isMain) }),
                ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) })
            } });
        });
        res.json({ success: true, data });
    } catch (error) {
        if (error.code === 'P2002') return fail(res, 'That branch code is already in use');
        throw error;
    }
};

exports.deleteBranch = async (req, res) => {
    const branch = await prisma.branch.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId }, include: { _count: { select: { users: true, classes: true } } } });
    if (!branch) return fail(res, 'Branch not found', 404);
    if (branch._count.users || branch._count.classes) return fail(res, 'Move assigned users and classes before deleting this branch', 409);
    await prisma.branch.delete({ where: { id: branch.id } });
    res.json({ success: true, message: 'Branch deleted' });
};

exports.assignBranch = async (req, res) => {
    const { resourceType, resourceId, branchId } = req.body;
    if (!['user', 'class'].includes(resourceType) || !resourceId) return fail(res, 'Valid resourceType and resourceId are required');
    if (branchId) {
        const branch = await prisma.branch.findFirst({ where: { id: branchId, tenantId: req.user.tenantId, isActive: true } });
        if (!branch) return fail(res, 'Active branch not found', 404);
    }
    const model = resourceType === 'user' ? prisma.user : prisma.class;
    const resource = await model.findFirst({ where: { id: resourceId, tenantId: req.user.tenantId } });
    if (!resource) return fail(res, `${resourceType} not found`, 404);
    const data = await model.update({ where: { id: resourceId }, data: { branchId: branchId || null } });
    res.json({ success: true, data });
};

exports.listCustomFields = async (req, res) => {
    const where = { tenantId: req.user.tenantId, ...(req.query.entityType && { entityType: req.query.entityType }) };
    const data = await prisma.customField.findMany({ where, orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
    res.json({ success: true, data });
};

exports.createCustomField = async (req, res) => {
    const { entityType, label, fieldKey, fieldType = 'text', placeholder, options, isRequired = false, sortOrder = 0 } = req.body;
    const allowedTypes = ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'textarea', 'email', 'phone'];
    if (!clean(entityType) || !clean(label) || !clean(fieldKey)) return fail(res, 'Entity, label and field key are required');
    if (!allowedTypes.includes(fieldType)) return fail(res, 'Unsupported field type');
    try {
        const data = await prisma.customField.create({ data: {
            tenantId: req.user.tenantId, entityType: clean(entityType).toLowerCase(), label: clean(label),
            fieldKey: clean(fieldKey).toLowerCase().replace(/[^a-z0-9_]+/g, '_'), fieldType,
            placeholder: clean(placeholder) || null, options: Array.isArray(options) ? options : [],
            isRequired: Boolean(isRequired), sortOrder: Number(sortOrder) || 0
        } });
        res.status(201).json({ success: true, data });
    } catch (error) {
        if (error.code === 'P2002') return fail(res, 'That field key already exists for this entity');
        throw error;
    }
};

exports.updateCustomField = async (req, res) => {
    const field = await prisma.customField.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!field) return fail(res, 'Custom field not found', 404);
    const allowed = ['label', 'fieldType', 'placeholder', 'options', 'isRequired', 'isActive', 'sortOrder'];
    const data = {};
    for (const key of allowed) if (req.body[key] !== undefined) data[key] = req.body[key];
    const updated = await prisma.customField.update({ where: { id: field.id }, data });
    res.json({ success: true, data: updated });
};

exports.deleteCustomField = async (req, res) => {
    const field = await prisma.customField.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!field) return fail(res, 'Custom field not found', 404);
    await prisma.customField.delete({ where: { id: field.id } });
    res.json({ success: true, message: 'Custom field deleted' });
};

exports.getCustomValues = async (req, res) => {
    const data = await prisma.customFieldValue.findMany({ where: { tenantId: req.user.tenantId, entityType: req.params.entityType, entityId: req.params.entityId }, include: { customField: true } });
    res.json({ success: true, data });
};

exports.saveCustomValues = async (req, res) => {
    const { entityType, entityId } = req.params;
    const values = req.body.values;
    if (!values || typeof values !== 'object' || Array.isArray(values)) return fail(res, 'values must be an object keyed by custom field id');
    const fields = await prisma.customField.findMany({ where: { tenantId: req.user.tenantId, entityType, id: { in: Object.keys(values) } } });
    await prisma.$transaction(fields.map(field => prisma.customFieldValue.upsert({
        where: { customFieldId_entityId: { customFieldId: field.id, entityId } },
        create: { tenantId: req.user.tenantId, customFieldId: field.id, entityType, entityId, value: values[field.id] },
        update: { value: values[field.id] }
    })));
    res.json({ success: true, message: 'Custom values saved' });
};

exports.listWorkflows = async (req, res) => {
    const data = await prisma.workflow.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data });
};

const workflowPayload = body => ({
    name: clean(body.name), description: clean(body.description) || null,
    entityType: clean(body.entityType)?.toLowerCase(), trigger: body.trigger || 'manual',
    steps: Array.isArray(body.steps) ? body.steps.map((step, index) => ({ id: step.id || `step-${index + 1}`, name: clean(step.name), assigneeRole: step.assigneeRole || 'school-admin', action: step.action || 'approve' })) : [],
    ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) })
});

exports.createWorkflow = async (req, res) => {
    const payload = workflowPayload(req.body);
    if (!payload.name || !payload.entityType || !payload.steps.length || payload.steps.some(step => !step.name)) return fail(res, 'Name, entity and at least one named step are required');
    try {
        const data = await prisma.workflow.create({ data: { tenantId: req.user.tenantId, ...payload } });
        res.status(201).json({ success: true, data });
    } catch (error) {
        if (error.code === 'P2002') return fail(res, 'A workflow with that name already exists');
        throw error;
    }
};

exports.updateWorkflow = async (req, res) => {
    const workflow = await prisma.workflow.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!workflow) return fail(res, 'Workflow not found', 404);
    const payload = workflowPayload({ ...workflow, ...req.body });
    if (!payload.steps.length || payload.steps.some(step => !step.name)) return fail(res, 'At least one named step is required');
    const data = await prisma.workflow.update({ where: { id: workflow.id }, data: payload });
    res.json({ success: true, data });
};

exports.deleteWorkflow = async (req, res) => {
    const workflow = await prisma.workflow.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    if (!workflow) return fail(res, 'Workflow not found', 404);
    await prisma.workflow.delete({ where: { id: workflow.id } });
    res.json({ success: true, message: 'Workflow deleted' });
};
