const prisma = require('../config/prismaClient');
const { generateBrandedTabularExcel, generateBrandedTabularPDF } = require('../utils/reportGenerator');

exports.exportBrandedReport = async (req, res) => {
    try {
        const { format, title, columns, rows } = req.body;
        if (!['pdf', 'xlsx'].includes(format))
            return res.status(400).json({ success: false, message: 'Format must be pdf or xlsx' });
        if (!Array.isArray(columns) || !columns.length || columns.length > 30)
            return res.status(400).json({ success: false, message: 'Report columns are required' });
        if (!Array.isArray(rows) || rows.length > 10000)
            return res.status(400).json({ success: false, message: 'Report rows are invalid or exceed 10,000' });

        const safeColumns = columns.map((column, index) => ({
            key: String(column.key || `column_${index}`).slice(0, 80),
            header: String(column.header || column.key || `Column ${index + 1}`).slice(0, 120),
            width: Math.min(50, Math.max(10, Number(column.width) || 18))
        }));
        const safeRows = rows.map(row => Object.fromEntries(
            safeColumns.map(column => [column.key, row?.[column.key] ?? ''])
        ));
        const safeTitle = String(title || 'School Report').slice(0, 150);
        const tenant = await prisma.tenant.findUnique({ where: { tenantId: req.user.tenantId } });
        if (!tenant) return res.status(404).json({ success: false, message: 'School not found' });

        if (format === 'xlsx') {
            const workbook = await generateBrandedTabularExcel({ title: safeTitle, columns: safeColumns, rows: safeRows }, tenant);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=school-report.xlsx');
            await workbook.xlsx.write(res);
            return res.end();
        }

        const doc = generateBrandedTabularPDF({ title: safeTitle, columns: safeColumns, rows: safeRows }, tenant);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=school-report.pdf');
        doc.pipe(res);
        doc.end();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
