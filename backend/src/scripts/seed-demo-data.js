const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });
process.env.NODE_ENV = 'production';
const { prisma } = require('../config/db');

const firstNames = ['Ahmed', 'Ayaan', 'Abdi', 'Hodan', 'Mohamed', 'Sahra', 'Yusuf', 'Maryan', 'Ali', 'Fadumo', 'Omar', 'Hibo'];
const lastNames = ['Hassan', 'Ali', 'Mohamed', 'Warsame', 'Nur', 'Osman', 'Abdi', 'Ibrahim'];
const subjectData = [
    ['Mathematics', 'DEM-MATH'], ['English', 'DEM-ENG'], ['Somali', 'DEM-SOM'],
    ['Science', 'DEM-SCI'], ['Social Studies', 'DEM-SOC'], ['Computer Studies', 'DEM-ICT'],
    ['Islamic Studies', 'DEM-ISL'], ['Business Studies', 'DEM-BUS']
];
const classData = [
    ['Grade 7', 'A', 'middle', '7', 'R-07A'], ['Grade 8', 'A', 'middle', '8', 'R-08A'],
    ['Grade 9', 'A', 'middle', '9', 'R-09A'], ['Grade 10', 'A', 'high', '10', 'R-10A']
];

const dateDaysAgo = (days) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - days);
    return date;
};

async function main() {
    const admin = await prisma.user.findFirst({
        where: { email: { equals: 'test@gmail.com', mode: 'insensitive' }, tenantId: { not: null } }
    });
    if (!admin?.tenantId) throw new Error('test@gmail.com tenant was not found');

    const tenantId = admin.tenantId;
    const password = await bcrypt.hash('12345678', 10);

    const teachers = [];
    for (let i = 0; i < 8; i += 1) {
        teachers.push(await prisma.user.upsert({
            where: { username: `demo.teacher${i + 1}` },
            update: { tenantId, status: 'active', salary: String(650 + i * 50) },
            create: {
                tenantId, firstName: firstNames[i], lastName: lastNames[i],
                email: `demo.teacher${i + 1}@school.test`, username: `demo.teacher${i + 1}`,
                password, role: 'teacher', status: 'active',
                phone: `+25261000${String(i + 1).padStart(3, '0')}`, designation: 'Subject Teacher',
                qualification: i % 2 ? 'Bachelor of Education' : 'Master of Education', salary: String(650 + i * 50)
            }
        }));
    }

    const classes = [];
    for (let i = 0; i < classData.length; i += 1) {
        const [name, section, gradeLevel, grade, room] = classData[i];
        classes.push(await prisma.class.upsert({
            where: { name_section_tenantId: { name, section, tenantId } },
            update: { gradeLevel, grade, room, status: 'active', classTeacherId: teachers[i].id },
            create: { name, section, gradeLevel, grade, room, tenantId, status: 'active', classTeacherId: teachers[i].id }
        }));
    }

    const subjects = [];
    for (let i = 0; i < subjectData.length; i += 1) {
        const [name, code] = subjectData[i];
        subjects.push(await prisma.subject.upsert({
            where: { name_code_tenantId: { name, code, tenantId } },
            update: { credits: i < 4 ? 4 : 3 },
            create: { name, code, tenantId, gradeLevels: ['middle', 'high'], type: i === 5 ? 'practical' : 'theory', credits: i < 4 ? 4 : 3, description: `Demo ${name} subject` }
        }));
        await prisma.subjectTeacher.upsert({
            where: { subjectId_teacherId: { subjectId: subjects[i].id, teacherId: teachers[i].id } },
            update: {}, create: { subjectId: subjects[i].id, teacherId: teachers[i].id }
        });
    }

    for (let c = 0; c < classes.length; c += 1) {
        for (let s = 0; s < subjects.length; s += 1) {
            const allocation = await prisma.classSubject.upsert({
                where: { classId_subjectId: { classId: classes[c].id, subjectId: subjects[s].id } },
                update: { weeklyPeriods: s < 4 ? 5 : 3, room: classes[c].room },
                create: { classId: classes[c].id, subjectId: subjects[s].id, weeklyPeriods: s < 4 ? 5 : 3, room: classes[c].room }
            });
            await prisma.classSubjectTeacher.upsert({
                where: { classSubjectId_teacherId: { classSubjectId: allocation.id, teacherId: teachers[s].id } },
                update: {}, create: { classSubjectId: allocation.id, teacherId: teachers[s].id }
            });
        }
    }

    const students = [];
    for (let i = 0; i < 60; i += 1) {
        const classroom = classes[i % classes.length];
        const n = i + 1;
        students.push(await prisma.user.upsert({
            where: { username: `demo.student${n}` },
            update: { tenantId, status: 'active', profileClass: classroom.name, profileSection: classroom.section },
            create: {
                tenantId, firstName: firstNames[i % firstNames.length], lastName: lastNames[(i * 3) % lastNames.length],
                email: `demo.student${n}@school.test`, username: `demo.student${n}`,
                password, role: 'student', status: 'active',
                admissionNo: `DEM-${String(n).padStart(4, '0')}`, studentId: `STD-DEM-${String(n).padStart(4, '0')}`,
                rollNo: String(Math.floor(i / classes.length) + 1).padStart(2, '0'),
                profileClass: classroom.name, profileSection: classroom.section,
                gender: i % 2 ? 'female' : 'male', dob: new Date(2010 - (i % 4), i % 12, (i % 27) + 1),
                guardianName: `${lastNames[i % lastNames.length]} Guardian`, guardianTelephone: `+252615${String(100000 + n)}`,
                nationality: 'Somali', regDate: dateDaysAgo(120 + i)
            }
        }));
    }

    const studentIds = students.map((student) => student.id);
    await prisma.attendance.deleteMany({ where: { tenantId, studentId: { in: studentIds } } });
    const attendanceRows = [];
    for (let day = 0; day < 20; day += 1) {
        const date = dateDaysAgo(day);
        if ([5, 6].includes(date.getDay())) continue;
        students.forEach((student, i) => {
            attendanceRows.push({
                tenantId, studentId: student.id, classId: classes[i % classes.length].id,
                subjectId: subjects[(i + day) % subjects.length].id, markedById: teachers[(i + day) % teachers.length].id,
                date, status: (i + day) % 19 === 0 ? 'absent' : (i + day) % 13 === 0 ? 'late' : 'present',
                remarks: (i + day) % 19 === 0 ? 'Demo absence record' : null
            });
        });
    }
    await prisma.attendance.createMany({ data: attendanceRows });

    const exam = await prisma.exam.create({
        data: { name: `Demo Term Exam ${Date.now()}`, term: 'Mid_Term', startDate: dateDaysAgo(35), endDate: dateDaysAgo(30), tenantId, status: 'completed', isApproved: true, approvedById: admin.id, approvalDate: dateDaysAgo(29) }
    });
    await prisma.examClass.createMany({ data: classes.map((item) => ({ examId: exam.id, classId: item.id })) });
    const marks = [];
    students.forEach((student, i) => subjects.forEach((subject, s) => {
        const score = 52 + ((i * 7 + s * 5) % 47);
        marks.push({ examId: exam.id, studentId: student.id, subjectId: subject.id, classId: classes[i % classes.length].id, marksObtained: score, maxMarks: 100, grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'E', tenantId, gradedById: teachers[s].id });
    }));
    await prisma.mark.createMany({ data: marks, skipDuplicates: true });

    let tuition = await prisma.feeType.findFirst({ where: { tenantId, name: 'Demo Tuition Fee' } });
    if (!tuition) tuition = await prisma.feeType.create({ data: { tenantId, name: 'Demo Tuition Fee', description: 'Monthly tuition demo fee', amount: 85 } });
    for (let i = 0; i < students.length; i += 1) {
        const paid = i % 4 === 0 ? 0 : i % 4 === 1 ? 40 : 85;
        const invoice = await prisma.invoice.upsert({
            where: { invoiceNumber: `DEM-INV-${String(i + 1).padStart(4, '0')}` },
            update: { totalAmount: 85, paidAmount: paid, status: paid === 85 ? 'paid' : paid ? 'partially_paid' : 'unpaid' },
            create: { invoiceNumber: `DEM-INV-${String(i + 1).padStart(4, '0')}`, studentId: students[i].id, classId: classes[i % classes.length].id, totalAmount: 85, paidAmount: paid, dueDate: dateDaysAgo(-10), status: paid === 85 ? 'paid' : paid ? 'partially_paid' : 'unpaid', tenantId, items: { create: { feeTypeId: tuition.id, name: 'Tuition Fee', amount: 85 } } }
        });
        await prisma.payment.deleteMany({ where: { tenantId, invoiceId: invoice.id } });
        if (paid) await prisma.payment.create({ data: { invoiceId: invoice.id, amount: paid, paymentMethod: i % 2 ? 'cash' : 'bank_transfer', transactionId: `DEM-PAY-${i + 1}`, tenantId, markedById: admin.id } });
    }

    const teacherIds = teachers.map((teacher) => teacher.id);
    await prisma.salary.deleteMany({ where: { tenantId, userId: { in: teacherIds } } });
    const monthNames = ['June', 'July', 'August'];
    for (const [monthIndex, month] of monthNames.entries()) {
        for (let i = 0; i < teachers.length; i += 1) {
            const basic = 650 + i * 50;
            await prisma.salary.create({ data: {
                tenantId, userId: teachers[i].id, month, year: new Date().getFullYear(), basicSalary: basic, netSalary: basic + 45,
                status: monthIndex < 2 || i < 5 ? 'paid' : 'pending', paymentDate: monthIndex < 2 || i < 5 ? dateDaysAgo(25 - monthIndex * 10) : null,
                allowances: { create: [{ name: 'Transport', amount: 60 }, { name: 'Communication', amount: 25 }] },
                deductions: { create: [{ name: 'Tax', amount: 40 }] }
            } });
        }
    }

    await prisma.notification.deleteMany({ where: { tenantId, data: { path: ['demo'], equals: true } } });
    await prisma.notification.createMany({ data: [
        { tenantId, senderId: admin.id, title: 'Welcome to the Demo School', message: 'Dashboard demo data is ready for testing.', type: 'announcement', channels: ['in_app'], targetRole: 'all', status: 'sent', data: { demo: true } },
        { tenantId, senderId: admin.id, title: 'Fee payment reminder', message: 'Some student invoices are due this month.', type: 'fee_reminder', channels: ['in_app', 'email'], targetRole: 'parent', status: 'sent', data: { demo: true } },
        { tenantId, senderId: admin.id, title: 'Attendance update', message: 'Daily attendance reports are now available.', type: 'attendance_alert', channels: ['in_app'], targetRole: 'teacher', status: 'sent', data: { demo: true } }
    ] });

    await prisma.expense.deleteMany({ where: { tenantId, description: { startsWith: '[DEMO]' } } });
    await prisma.expense.createMany({ data: [
        ['Teacher supplies', 'supplies', 480], ['Electricity and water', 'utilities', 620], ['School building maintenance', 'maintenance', 950], ['Monthly rent', 'rent', 1800], ['Community outreach', 'marketing', 300]
    ].map(([title, category, amount], i) => ({ tenantId, title, category, amount, date: dateDaysAgo(i * 6), paymentMethod: i % 2 ? 'bank_transfer' : 'cash', description: '[DEMO] Sample school expense', recordedById: admin.id })) });

    await prisma.inventoryItem.deleteMany({ where: { tenantId, itemName: { startsWith: 'Demo ' } } });
    await prisma.inventoryItem.createMany({ data: [
        ['Demo Student Desks', 'Furniture', 120, 'pcs', 'Block A'], ['Demo Laptops', 'Electronics', 30, 'pcs', 'ICT Lab'], ['Demo Projectors', 'Electronics', 8, 'pcs', 'Store'], ['Demo Footballs', 'Sports', 20, 'pcs', 'Sports Room'], ['Demo Science Kits', 'Laboratory', 18, 'sets', 'Science Lab']
    ].map(([itemName, category, quantity, unit, location]) => ({ tenantId, itemName, category, quantity, unit, location, status: 'available', recordedById: admin.id })) });

    await prisma.book.deleteMany({ where: { tenantId, isbn: { startsWith: 'DEMO-' } } });
    await prisma.book.createMany({ data: Array.from({ length: 16 }, (_, i) => ({ tenantId, title: `Demo Library Book ${i + 1}`, author: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`, isbn: `DEMO-${String(i + 1).padStart(5, '0')}`, category: ['Education', 'Science', 'Literature', 'Technology'][i % 4], quantity: 3 + (i % 5), available: 2 + (i % 3), shelfLocation: `Shelf ${String.fromCharCode(65 + (i % 5))}-${i + 1}` })) });

    await prisma.alumni.deleteMany({ where: { tenantId, email: { startsWith: 'demo.alumni' } } });
    await prisma.alumni.createMany({ data: Array.from({ length: 12 }, (_, i) => ({ tenantId, firstName: firstNames[i], lastName: lastNames[i % lastNames.length], email: `demo.alumni${i + 1}@school.test`, phone: `+252617${String(100000 + i)}`, graduationYear: 2014 + (i % 10), program: i % 2 ? 'Secondary School' : 'Science', currentCity: ['Mogadishu', 'Hargeisa', 'Garowe'][i % 3], employmentStatus: i % 3 ? 'employed' : 'student', employer: i % 3 ? 'Demo Company' : null, jobTitle: i % 3 ? 'Professional' : null })) });

    console.log(JSON.stringify({ tenantId, teachers: teachers.length, students: students.length, classes: classes.length, subjects: subjects.length, attendance: attendanceRows.length, marks: marks.length, invoices: students.length, payrollRecords: teachers.length * monthNames.length, books: 16, alumni: 12 }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}).finally(() => prisma.$disconnect());
