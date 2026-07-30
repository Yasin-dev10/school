const prisma = require('../config/prismaClient');

const normalizeItem = item => ({ ...item, _id: item.id });

exports.getInventory = async (req, res) => {
    try {
        const { search, category, status } = req.query;
        const items = await prisma.inventoryItem.findMany({
            where: {
                tenantId: req.user.tenantId,
                ...(category && { category }),
                ...(status && { status }),
                ...(search && {
                    OR: [
                        { itemName: { contains: search, mode: 'insensitive' } },
                        { category: { contains: search, mode: 'insensitive' } },
                        { location: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { updatedAt: 'desc' }
        });
        res.json({ success: true, count: items.length, data: items.map(normalizeItem) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createInventoryItem = async (req, res) => {
    try {
        const { itemName, category, quantity, unit, location, status } = req.body;
        const numericQuantity = Number(quantity);
        if (!itemName?.trim() || !category?.trim() || !Number.isInteger(numericQuantity) || numericQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Item name, category and a non-negative whole quantity are required' });
        }
        const item = await prisma.inventoryItem.create({
            data: {
                tenantId: req.user.tenantId,
                itemName: itemName.trim(),
                category: category.trim(),
                quantity: numericQuantity,
                unit: unit?.trim() || 'pcs',
                location: location?.trim() || null,
                status: status || (numericQuantity === 0 ? 'out_of_stock' : 'available'),
                recordedById: req.user.id
            }
        });
        res.status(201).json({ success: true, data: normalizeItem(item) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateInventoryItem = async (req, res) => {
    try {
        const existing = await prisma.inventoryItem.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Inventory item not found' });

        const { itemName, category, quantity, unit, location, status } = req.body;
        const numericQuantity = quantity === undefined ? undefined : Number(quantity);
        if (numericQuantity !== undefined && (!Number.isInteger(numericQuantity) || numericQuantity < 0)) {
            return res.status(400).json({ success: false, message: 'Quantity must be a non-negative whole number' });
        }
        const item = await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: {
                ...(itemName !== undefined && { itemName: itemName.trim() }),
                ...(category !== undefined && { category: category.trim() }),
                ...(numericQuantity !== undefined && { quantity: numericQuantity }),
                ...(unit !== undefined && { unit: unit.trim() || 'pcs' }),
                ...(location !== undefined && { location: location.trim() || null }),
                ...(status !== undefined && { status }),
                ...(numericQuantity === 0 && status === undefined && { status: 'out_of_stock' })
            }
        });
        res.json({ success: true, data: normalizeItem(item) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteInventoryItem = async (req, res) => {
    try {
        const existing = await prisma.inventoryItem.findFirst({
            where: { id: req.params.id, tenantId: req.user.tenantId }
        });
        if (!existing) return res.status(404).json({ success: false, message: 'Inventory item not found' });
        await prisma.inventoryItem.delete({ where: { id: existing.id } });
        res.json({ success: true, message: 'Inventory item deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
