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

exports.generateExcelMatrix = async (data, tenant) => {
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

    return workbook;
};

exports.generateReportCardPDF = (data, tenant) => {
    const docDefinition = {
        content: [
            { text: tenant.name, style: 'header' },
            { text: tenant.config?.address || '', style: 'subheader' },
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
                                    { text: `${tenant.config?.academicYear || '2025/26'}\n` },
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
