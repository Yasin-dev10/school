const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PdfPrinter(fonts);

const getTenantBranding = (tenant = {}) => ({
    name: tenant.name || 'School',
    logoUrl: tenant.logoUrl || tenant.config?.logoUrl || null,
    address: tenant.address || tenant.config?.address || '',
    academicYear: tenant.academicYear || tenant.config?.academicYear || ''
});

const addExcelLogo = (workbook, worksheet, logoUrl) => {
    if (!logoUrl?.startsWith('data:image/')) return false;
    const match = logoUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (!match) return false;
    const extension = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
    const imageId = workbook.addImage({ base64: match[2], extension });
    worksheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 72, height: 72 } });
    return true;
};

exports.generateBrandedTabularExcel = async ({ title, columns, rows }, tenant) => {
    const brand = getTenantBranding(tenant);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = brand.name;
    const worksheet = workbook.addWorksheet(String(title || 'Report').slice(0, 31));
    worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 2));
    worksheet.getCell('A1').value = brand.name;
    worksheet.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FF1E293B' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.mergeCells(2, 1, 2, Math.max(columns.length, 2));
    worksheet.getCell('A2').value = `${title}${brand.academicYear ? ` — ${brand.academicYear}` : ''}`;
    worksheet.getCell('A2').font = { bold: true, size: 13, color: { argb: 'FF4F46E5' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getRow(1).height = 42;
    addExcelLogo(workbook, worksheet, brand.logoUrl);

    const headerRow = worksheet.getRow(4);
    columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = column.header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
        cell.alignment = { horizontal: 'center' };
        worksheet.getColumn(index + 1).width = column.width || 18;
    });
    rows.forEach(row => worksheet.addRow(columns.map(column => row[column.key] ?? '')));
    worksheet.views = [{ state: 'frozen', ySplit: 4 }];
    return workbook;
};

exports.generateBrandedTabularPDF = ({ title, columns, rows }, tenant) => {
    const brand = getTenantBranding(tenant);
    const content = [];
    if (brand.logoUrl?.startsWith('data:image/')) {
        content.push({ image: brand.logoUrl, width: 60, alignment: 'center', margin: [0, 0, 0, 6] });
    }
    content.push(
        { text: brand.name, fontSize: 20, bold: true, alignment: 'center', color: '#1E293B' },
        { text: brand.address, fontSize: 9, alignment: 'center', color: '#64748B' },
        { text: title, fontSize: 15, bold: true, alignment: 'center', color: '#4F46E5', margin: [0, 10, 0, 12] },
        {
            table: {
                headerRows: 1,
                widths: columns.map(() => '*'),
                body: [
                    columns.map(column => ({ text: column.header, bold: true, color: 'white', fillColor: '#4F46E5' })),
                    ...rows.map(row => columns.map(column => String(row[column.key] ?? '')))
                ]
            },
            layout: 'lightHorizontalLines',
            fontSize: 8
        }
    );
    return printer.createPdfKitDocument({ content, pageOrientation: columns.length > 6 ? 'landscape' : 'portrait', defaultStyle: { font: 'Roboto' } });
};

exports.generateExcelMatrix = async (data, tenant) => {
    const brand = getTenantBranding(tenant);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Grades Matrix');

    // Headers
    const subjects = data.subjects;
    const columns = [
        { header: 'Roll No', key: 'rollNo', width: 10 },
        { header: 'Student Name', key: 'name', width: 30 },
        ...subjects.map(s => ({ header: s.name, key: s._id, width: 15 })),
        { header: 'Total', key: 'total', width: 10 },
        { header: 'Average', key: 'average', width: 10 },
        { header: 'Grade', key: 'grade', width: 10 }
    ];

    worksheet.columns = columns;

    // Stylish Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo-600
    };

    // Add Data
    data.rows.forEach(row => {
        const rowData = {
            rollNo: row.student.profile?.rollNo || '',
            name: `${row.student.firstName} ${row.student.lastName}`,
            total: row.total,
            average: row.average.toFixed(2),
            grade: row.grade
        };
        subjects.forEach(s => {
            rowData[s._id] = row.marks[s._id] || 0;
        });
        const addedRow = worksheet.addRow(rowData);

        // Coloring based on grade
        const gradeCell = addedRow.getCell('grade');
        if (row.grade === 'F') {
            gradeCell.font = { color: { argb: 'FFFF0000' }, bold: true };
        } else if (['A+', 'A'].includes(row.grade)) {
            gradeCell.font = { color: { argb: 'FF008000' }, bold: true };
        }
    });

    worksheet.insertRows(1, [[brand.name], ['Grades Matrix'], []]);
    worksheet.mergeCells(1, 1, 1, Math.max(columns.length, 2));
    worksheet.mergeCells(2, 1, 2, Math.max(columns.length, 2));
    worksheet.getCell('A1').font = { bold: true, size: 18 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').font = { bold: true, size: 13, color: { argb: 'FF4F46E5' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getRow(1).height = 42;
    const matrixHeader = worksheet.getRow(4);
    matrixHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    matrixHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    addExcelLogo(workbook, worksheet, brand.logoUrl);

    return workbook;
};

exports.generateReportCardPDF = (data, tenant) => {
    const brand = getTenantBranding(tenant);
    const docDefinition = {
        content: [
            ...(brand.logoUrl?.startsWith('data:image/') ? [{ image: brand.logoUrl, width: 70, alignment: 'center', margin: [0, 0, 0, 5] }] : []),
            { text: brand.name, style: 'header' },
            { text: brand.address, style: 'subheader' },
            { text: '\n' },
            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 2, lineColor: '#6366F1' }] },
            { text: '\n' },
            { text: 'OFFICIAL REPORT CARD', style: 'title' },
            { text: `Exam: ${data.exam.name} (${data.exam.term})`, style: 'info', alignment: 'center' },
            { text: '\n' },
            {
                style: 'infoTable',
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            {
                                text: [
                                    { text: 'Student: ', bold: true, color: '#6366F1' },
                                    { text: `${data.student.firstName} ${data.student.lastName}\n`, bold: true, fontSize: 14 },
                                    { text: 'Roll No: ', bold: true, color: '#6366F1' },
                                    { text: `${data.student.profile?.rollNo || 'N/A'}\n` },
                                    { text: 'Class: ', bold: true, color: '#6366F1' },
                                    { text: `${data.class.name} - ${data.class.section}` }
                                ]
                            },
                            {
                                text: [
                                    { text: 'Academic Year: ', bold: true, color: '#6366F1' },
                                    { text: `${brand.academicYear || '2025/26'}\n` },
                                    { text: 'Rank: ', bold: true, color: '#6366F1' },
                                    { text: `${data.summary.rank} of ${data.summary.totalStudents}\n`, bold: true, fontSize: 14 },
                                    { text: 'Status: ', bold: true, color: '#6366F1' },
                                    { text: data.summary.grade === 'F' ? 'FAILED' : 'PASSED', color: data.summary.grade === 'F' ? 'red' : 'green', bold: true }
                                ]
                            }
                        ]
                    ]
                },
                layout: 'noBorders'
            },
            { text: '\n\n' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'],
                    body: [
                        [
                            { text: 'Subject', style: 'tableHeader' },
                            { text: 'Max Marks', style: 'tableHeader' },
                            { text: 'Obtained', style: 'tableHeader' },
                            { text: 'Grade', style: 'tableHeader' }
                        ],
                        ...data.marks.map(m => [
                            { text: m.subject.name, margin: [0, 5, 0, 5] },
                            { text: m.maxMarks, alignment: 'center', margin: [0, 5, 0, 5] },
                            { text: m.marksObtained, alignment: 'center', margin: [0, 5, 0, 5], bold: true },
                            {
                                text: m.grade || '-',
                                alignment: 'center',
                                margin: [0, 5, 0, 5],
                                bold: true,
                                color: m.grade === 'F' ? 'red' : 'black'
                            }
                        ])
                    ]
                },
                layout: {
                    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 2 : 1,
                    vLineWidth: (i, node) => 0,
                    hLineColor: (i, node) => (i === 0 || i === 1) ? '#6366F1' : '#eee',
                    paddingLeft: (i) => 10,
                    paddingRight: (i) => 10,
                }
            },
            { text: '\n\n' },
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: 'SUMMARY', bold: true, color: '#6366F1', margin: [0, 0, 0, 5] },
                            {
                                table: {
                                    widths: ['auto', '*'],
                                    body: [
                                        ['Total Marks:', { text: `${data.summary.totalObtained} / ${data.summary.totalMax}`, bold: true }],
                                        ['Percentage:', { text: `${data.summary.percentage.toFixed(1)}%`, bold: true }],
                                        ['GPA:', { text: `${data.summary.gpa.toFixed(2)}`, bold: true }],
                                        ['Grade:', { text: data.summary.grade, bold: true, fontSize: 16, color: '#6366F1' }]
                                    ]
                                },
                                layout: 'noBorders'
                            }
                        ]
                    },
                    {
                        width: '*',
                        stack: [
                            { text: '\n\n\n' },
                            { canvas: [{ type: 'line', x1: 50, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
                            { text: 'Principal Signature', alignment: 'center', margin: [0, 5, 0, 0], fontSize: 10 }
                        ],
                        alignment: 'right'
                    }
                ]
            }
        ],
        styles: {
            header: { fontSize: 24, bold: true, alignment: 'center', color: '#1E293B' },
            subheader: { fontSize: 10, alignment: 'center', color: '#64748B' },
            title: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 10, 0, 10], color: '#6366F1' },
            tableHeader: { bold: true, fontSize: 12, color: 'white', fillColor: '#6366F1', alignment: 'center', margin: [0, 5, 0, 5] },
            info: { fontSize: 12, color: '#475569' }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    return printer.createPdfKitDocument(docDefinition);
};

exports.generateAttendanceReport = async (data, tenant) => {
    const brand = getTenantBranding(tenant);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Roll No', key: 'rollNo', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    // Style the header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' } // Indigo-600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    data.forEach(record => {
        const row = worksheet.addRow({
            date: new Date(record.date).toLocaleDateString(),
            name: `${record.student.firstName} ${record.student.lastName}`,
            rollNo: record.student.profile?.rollNo || 'N/A',
            status: record.status.toUpperCase(),
            remarks: record.remarks || ''
        });

        // Align status and roll no to center
        row.getCell('status').alignment = { horizontal: 'center' };
        row.getCell('rollNo').alignment = { horizontal: 'center' };

        // Color status
        const statusCell = row.getCell('status');
        if (record.status === 'absent') {
            statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
        } else if (record.status === 'present') {
            statusCell.font = { color: { argb: 'FF008000' }, bold: true };
        } else if (record.status === 'late') {
            statusCell.font = { color: { argb: 'FFFFA500' }, bold: true };
        }
    });

    worksheet.insertRows(1, [[brand.name], ['Attendance Report'], []]);
    worksheet.mergeCells('A1:E1');
    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A1').font = { bold: true, size: 18 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getCell('A2').font = { bold: true, size: 13, color: { argb: 'FF4F46E5' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };
    worksheet.getRow(1).height = 42;
    const attendanceHeader = worksheet.getRow(4);
    attendanceHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    attendanceHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    addExcelLogo(workbook, worksheet, brand.logoUrl);

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
    });

    return workbook;
};
