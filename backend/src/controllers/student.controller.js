const prisma = require('../config/prismaClient');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/logger');
const generatePassword = require('../utils/generatePassword');
const { emitToTenant } = require('../config/socket');
const { getTeacherScope, canTeacherAccessStudent } = require('../utils/teacherScope');

const userSelect = {
    id: true, tenantId: true, firstName: true, lastName: true,
    email: true, role: true, status: true, lastLogin: true,
    phone: true, profileAddress: true, avatarUrl: true,
    designation: true, admissionNo: true, studentId: true,
    rollNo: true, profileClass: true, profileSection: true,
    gender: true, dob: true, parentRelationship: true,
    motherName: true, birthPlace: true, disabilityStatus: true,
    orphanStatus: true, refugeeStatus: true, nationality: true,
    studentState: true, studentRegion: true, studentDistrict: true,
    studentVillage: true, guardianName: true, guardianTelephone: true,
    emergencyContactNo: true, schoolComments: true, absenteeismStatus: true,
    regDate: true, editDate: true,
    qualification: true, salary: true, stripeCustomerId: true,
    passwordPlain: true, createdAt: true, updatedAt: true
};

const canViewUserPasswords = (viewer) => ['school-admin', 'receptionist'].includes(viewer?.role);

const formatUser = (u, viewer) => {
    if (!u) return null;

    const { passwordPlain, ...safeUser } = u;

    return {
        ...safeUser,
        _id: u.id,
        ...(canViewUserPasswords(viewer) && { password_plain: passwordPlain }),
        profile: {
            phone: u.phone, address: u.profileAddress, avatarUrl: u.avatarUrl,
            designation: u.designation, admissionNo: u.admissionNo,
            studentId: u.studentId, rollNo: u.rollNo,
            class: u.profileClass, section: u.profileSection,
            gender: u.gender, dob: u.dob,
            motherName: u.motherName, birthPlace: u.birthPlace,
            disabilityStatus: u.disabilityStatus, orphanStatus: u.orphanStatus,
            refugeeStatus: u.refugeeStatus, nationality: u.nationality,
            state: u.studentState, region: u.studentRegion,
            district: u.studentDistrict, village: u.studentVillage,
            guardianName: u.guardianName, guardianTelephone: u.guardianTelephone,
            emergencyContactNo: u.emergencyContactNo,
            schoolComments: u.schoolComments, absenteeismStatus: u.absenteeismStatus,
            regDate: u.regDate, editDate: u.editDate,
            parentRelationship: u.parentRelationship,
            qualification: u.qualification, salary: u.salary,
            stripeCustomerId: u.stripeCustomerId
        }
    };
};

const optionalDate = (value) => value ? new Date(value) : null;

// @desc    Register a new student
exports.createStudent = async (req, res) => {
    try {
        const { firstName, lastName, email, password, profile, parentDetails, parentRelationship } = req.body;

        const nameRegex = /^[a-zA-Z\s\-\']+$/;
        if (!firstName || !nameRegex.test(firstName))
            return res.status(400).json({ success: false, message: 'First name must contain only letters' });
        if (!lastName || !nameRegex.test(lastName))
            return res.status(400).json({ success: false, message: 'Last name must contain only letters' });

        if (profile?.dob) {
            const age = calcAge(new Date(profile.dob));
            if (age < 3 || age > 25)
                return res.status(400).json({ success: false, message: 'Student age must be between 3 and 25 years' });
        }

        const tenantId = req.user.tenantId;
        const generatedPassword = password || generatePassword();

        const exists = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
        if (exists) return res.status(400).json({ message: 'User with this email already exists' });

        let parentId = null;
        if (parentDetails?.email) {
            let parent = await prisma.user.findFirst({ where: { email: parentDetails.email, tenantId, role: 'parent' } });
            if (!parent) {
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash('parent123', salt);
                parent = await prisma.user.create({
                    data: {
                        firstName: parentDetails.firstName,
                        lastName: parentDetails.lastName,
                        email: parentDetails.email,
                        password: hashed,
                        passwordPlain: 'parent123',
                        role: 'parent',
                        tenantId,
                        phone: parentDetails.phone || null
                    }
                });
            }
            parentId = parent.id;
        }

        const studentCount = await prisma.user.count({ where: { tenantId, role: 'student' } });
        const year = new Date().getFullYear();
        const yr2 = year.toString().slice(-2);
        const admissionNo = profile?.admissionNo || `${yr2}${String(studentCount + 1).padStart(4, '0')}`;
        const studentId = profile?.studentId || `STU-${year}-${String(studentCount + 1).padStart(4, '0')}`;

        let rollNo = profile?.rollNo;
        if (!rollNo && profile?.class) {
            const count = await prisma.user.count({
                where: { tenantId, role: 'student', profileClass: profile.class, profileSection: profile.section }
            });
            rollNo = String(count + 1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(generatedPassword, salt);

        const student = await prisma.user.create({
            data: {
                firstName, lastName,
                email: email.toLowerCase(),
                password: hashed,
                passwordPlain: generatedPassword,
                role: 'student',
                tenantId,
                phone: profile?.phone || null,
                profileAddress: profile?.address || null,
                avatarUrl: profile?.avatarUrl || null,
                admissionNo,
                studentId,
                rollNo: rollNo || null,
                profileClass: profile?.class || null,
                profileSection: profile?.section || null,
                gender: profile?.gender || null,
                dob: profile?.dob ? new Date(profile.dob) : null,
                motherName: profile?.motherName || null,
                birthPlace: profile?.birthPlace || null,
                disabilityStatus: profile?.disabilityStatus || null,
                orphanStatus: profile?.orphanStatus || null,
                refugeeStatus: profile?.refugeeStatus || null,
                nationality: profile?.nationality || null,
                studentState: profile?.state || null,
                studentRegion: profile?.region || null,
                studentDistrict: profile?.district || null,
                studentVillage: profile?.village || null,
                guardianName: profile?.guardianName || parentDetails?.firstName || null,
                guardianTelephone: profile?.guardianTelephone || parentDetails?.phone || null,
                emergencyContactNo: profile?.emergencyContactNo || null,
                schoolComments: profile?.schoolComments || null,
                absenteeismStatus: profile?.absenteeismStatus || null,
                regDate: optionalDate(profile?.regDate),
                editDate: optionalDate(profile?.editDate),
                parentRelationship: parentRelationship || parentDetails?.relationship || 'Guardian'
            }
        });

        // link parent
        if (parentId) {
            await prisma.studentParent.create({ data: { studentId: student.id, parentId } });
        }

        await logAction({ action: 'CREATE', module: 'USER', details: `Admitted student: ${firstName} ${lastName} (${admissionNo})`, userId: req.user._id, tenantId });
        emitToTenant(tenantId, 'student:created', formatUser(student, req.user));

        res.status(201).json({
            success: true, message: 'Student registered successfully',
            data: formatUser(student, req.user), tempPassword: generatedPassword
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all students
exports.getStudents = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const role = req.user.role;
        const { sortBy, order = 'asc' } = req.query;

        let where = { tenantId, role: 'student' };

        if (role === 'teacher') {
            const scope = await getTeacherScope(req.user.id, tenantId);
            if (scope.classFilters.length > 0) {
                where.OR = scope.classFilters;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        if (req.query.class) {
            const targetClass = await prisma.class.findFirst({ where: { id: req.query.class, tenantId } });
            if (targetClass) {
                where.profileClass = targetClass.name;
                where.profileSection = targetClass.section;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [] });
            }
        }

        let orderBy = { createdAt: 'desc' };
        if (sortBy === 'name') orderBy = [{ firstName: order }, { lastName: order }];
        else if (sortBy === 'class') orderBy = [{ profileClass: order }, { profileSection: order }];

        const students = await prisma.user.findMany({ where, select: userSelect, orderBy });
        res.status(200).json({ success: true, count: students.length, data: students.map(student => formatUser(student, req.user)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student by ID
exports.getStudentById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id === 'undefined' || id === 'null')
            return res.status(400).json({ success: false, message: 'Invalid Student ID' });

        if (req.user.role === 'teacher') {
            const allowed = await canTeacherAccessStudent(req.user.id, id, req.user.tenantId);
            if (!allowed) return res.status(403).json({ success: false, message: 'You are not assigned to this student' });
        }

        const student = await prisma.user.findFirst({
            where: { id, tenantId: req.user.tenantId, role: 'student' },
            select: {
                ...userSelect,
                parentLinks: { include: { parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } }
            }
        });

        if (!student) return res.status(404).json({ success: false, message: 'Student not found in this school' });

        const formatted = formatUser(student, req.user);
        formatted.profile.parentIds = student.parentLinks?.map(l => formatUser(l.parent, req.user)) || [];
        res.status(200).json({ success: true, data: formatted });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update student
exports.updateStudent = async (req, res) => {
    try {
        const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'student' } });
        if (!existing) return res.status(404).json({ message: 'Student not found' });

        if (req.body.profile?.dob) {
            const age = calcAge(new Date(req.body.profile.dob));
            if (age < 3 || age > 25)
                return res.status(400).json({ success: false, message: 'Student age must be between 3 and 25 years' });
        }

        const { firstName, lastName, email, status, profile } = req.body;
        const updated = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(email && { email: email.toLowerCase() }),
                ...(status && { status }),
                ...(profile?.phone !== undefined && { phone: profile.phone }),
                ...(profile?.address !== undefined && { profileAddress: profile.address }),
                ...(profile?.avatarUrl !== undefined && { avatarUrl: profile.avatarUrl }),
                ...(profile?.class !== undefined && { profileClass: profile.class }),
                ...(profile?.section !== undefined && { profileSection: profile.section }),
                ...(profile?.gender !== undefined && { gender: profile.gender }),
                ...(profile?.dob !== undefined && { dob: profile.dob ? new Date(profile.dob) : null }),
                ...(profile?.motherName !== undefined && { motherName: profile.motherName }),
                ...(profile?.birthPlace !== undefined && { birthPlace: profile.birthPlace }),
                ...(profile?.disabilityStatus !== undefined && { disabilityStatus: profile.disabilityStatus }),
                ...(profile?.orphanStatus !== undefined && { orphanStatus: profile.orphanStatus }),
                ...(profile?.refugeeStatus !== undefined && { refugeeStatus: profile.refugeeStatus }),
                ...(profile?.nationality !== undefined && { nationality: profile.nationality }),
                ...(profile?.state !== undefined && { studentState: profile.state }),
                ...(profile?.region !== undefined && { studentRegion: profile.region }),
                ...(profile?.district !== undefined && { studentDistrict: profile.district }),
                ...(profile?.village !== undefined && { studentVillage: profile.village }),
                ...(profile?.guardianName !== undefined && { guardianName: profile.guardianName }),
                ...(profile?.guardianTelephone !== undefined && { guardianTelephone: profile.guardianTelephone }),
                ...(profile?.emergencyContactNo !== undefined && { emergencyContactNo: profile.emergencyContactNo }),
                ...(profile?.schoolComments !== undefined && { schoolComments: profile.schoolComments }),
                ...(profile?.absenteeismStatus !== undefined && { absenteeismStatus: profile.absenteeismStatus }),
                ...(profile?.regDate !== undefined && { regDate: optionalDate(profile.regDate) }),
                ...(profile?.editDate !== undefined && { editDate: optionalDate(profile.editDate) }),
                ...(profile?.rollNo !== undefined && { rollNo: profile.rollNo }),
                ...(profile?.admissionNo !== undefined && { admissionNo: profile.admissionNo }),
                ...(profile?.studentId !== undefined && { studentId: profile.studentId }),
                ...(profile?.parentRelationship !== undefined && { parentRelationship: profile.parentRelationship }),
                ...(profile?.qualification !== undefined && { qualification: profile.qualification })
            },
            select: userSelect
        });

        await logAction({ action: 'UPDATE', module: 'USER', details: `Updated student: ${updated.firstName} ${updated.lastName}`, userId: req.user._id, tenantId: req.user.tenantId });
        emitToTenant(req.user.tenantId, 'student:updated', formatUser(updated, req.user));
        res.status(200).json({ success: true, data: formatUser(updated, req.user) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete student
exports.deleteStudent = async (req, res) => {
    try {
        const student = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'student' } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        await prisma.user.delete({ where: { id: req.params.id } });

        await logAction({ action: 'DELETE', module: 'USER', details: `Removed student: ${student.firstName} ${student.lastName}`, userId: req.user._id, tenantId: req.user.tenantId });
        emitToTenant(req.user.tenantId, 'student:deleted', student);
        res.status(200).json({ success: true, message: 'Student record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Promote students
exports.promoteStudents = async (req, res) => {
    try {
        const { studentIds, currentClass, nextClass, nextSection, type } = req.body;
        const tenantId = req.user.tenantId;

        if (type === 'auto') {
            if (!currentClass || !nextClass)
                return res.status(400).json({ message: 'Current Class and Next Class are required' });

            const classDoc = await prisma.class.findFirst({ where: { name: currentClass, tenantId } });
            if (!classDoc) return res.status(404).json({ message: 'Current class not found' });

            const exams = await prisma.exam.findMany({
                where: { tenantId, status: 'completed', classes: { some: { classId: classDoc.id } } }
            });

            if (exams.length === 0)
                return res.status(400).json({ message: 'No completed exams found for this class.' });

            const students = await prisma.user.findMany({ where: { profileClass: currentClass, tenantId, role: 'student' } });
            const promotedIds = [], retainedIds = [], debugDetails = [];

            for (const student of students) {
                let passedAll = true, failureReason = '';
                for (const exam of exams) {
                    const marks = await prisma.mark.findMany({ where: { studentId: student.id, examId: exam.id, tenantId } });
                    if (!marks.length) { passedAll = false; failureReason = `No marks for exam: ${exam.name}`; break; }
                    const failed = marks.find(m => (m.marksObtained / m.maxMarks) * 100 < 50);
                    if (failed) { passedAll = false; failureReason = `Failed subject in ${exam.name}`; break; }
                }
                if (passedAll) promotedIds.push(student.id);
                else { retainedIds.push(student.id); debugDetails.push({ student: `${student.firstName} ${student.lastName}`, reason: failureReason }); }
            }

            if (promotedIds.length > 0) {
                await prisma.user.updateMany({
                    where: { id: { in: promotedIds } },
                    data: { profileClass: nextClass, profileSection: nextSection || 'A' }
                });
            }

            await logAction({ action: 'UPDATE', module: 'USER', details: `Auto-promoted ${promotedIds.length} students from ${currentClass} to ${nextClass}`, userId: req.user._id, tenantId });

            return res.status(200).json({
                success: true, message: `Promotion complete. ${promotedIds.length} promoted, ${retainedIds.length} retained.`,
                promotedCount: promotedIds.length, retainedCount: retainedIds.length,
                promotedStudents: promotedIds, retainedStudents: retainedIds, failures: debugDetails
            });
        } else {
            if (!studentIds || !Array.isArray(studentIds))
                return res.status(400).json({ message: 'Please provide an array of student IDs' });

            const result = await prisma.user.updateMany({
                where: { id: { in: studentIds }, tenantId, role: 'student' },
                data: { profileClass: nextClass, profileSection: nextSection || 'A' }
            });

            await logAction({ action: 'UPDATE', module: 'USER', details: `Promoted ${result.count} students to ${nextClass}`, userId: req.user._id, tenantId });
            res.status(200).json({ success: true, message: `Successfully promoted ${result.count} students`, modifiedCount: result.count });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all children for a parent
exports.getChildren = async (req, res) => {
    try {
        const children = await prisma.user.findMany({
            where: {
                parentLinks: { some: { parentId: req.user.id } },
                tenantId: req.user.tenantId, role: 'student'
            },
            select: userSelect
        });
        res.status(200).json({ success: true, data: children.map(child => formatUser(child, req.user)) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk Import Students
exports.bulkImportStudents = async (req, res) => {
    try {
        const { students } = req.body;
        const tenantId = req.user.tenantId;

        if (!students || !Array.isArray(students))
            return res.status(400).json({ message: 'Invalid data format. Expected an array.' });

        const importResults = [];
        for (const s of students) {
            try {
                if (!s.firstName || !s.lastName || !s.email) {
                    importResults.push({ email: s.email, status: 'failed', reason: 'Missing required fields' }); continue;
                }
                const nameRegex = /^[a-zA-Z\s\-\']+$/;
                if (!nameRegex.test(s.firstName) || !nameRegex.test(s.lastName)) {
                    importResults.push({ email: s.email, status: 'failed', reason: 'Names must contain only letters' }); continue;
                }
                const exists = await prisma.user.findFirst({ where: { email: s.email.toLowerCase() } });
                if (exists) { importResults.push({ email: s.email, status: 'failed', reason: 'Email already exists' }); continue; }

                if (s.dob) {
                    const age = calcAge(new Date(s.dob));
                    if (age < 3 || age > 25) { importResults.push({ email: s.email, status: 'failed', reason: 'Age must be 3-25' }); continue; }
                }

                const count = await prisma.user.count({ where: { tenantId, role: 'student' } });
                const year = new Date().getFullYear();
                const yr2 = year.toString().slice(-2);
                const admissionNo = s.admissionNo || `${yr2}${String(count + 1).padStart(4, '0')}`;
                const studentId = s.studentId || `STU-${year}-${String(count + 1).padStart(4, '0')}`;
                const genPass = s.password || generatePassword();
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(genPass, salt);

                await prisma.user.create({
                    data: {
                        firstName: s.firstName, lastName: s.lastName,
                        email: s.email.toLowerCase(), password: hashed, passwordPlain: genPass,
                        role: 'student', tenantId,
                        admissionNo, studentId,
                        profileClass: s.class || null, profileSection: s.section || 'A',
                        gender: s.gender || null, phone: s.phone || null
                    }
                });
                importResults.push({ email: s.email, status: 'success' });
            } catch (err) {
                importResults.push({ email: s.email, status: 'failed', reason: err.message });
            }
        }

        const successCount = importResults.filter(r => r.status === 'success').length;
        await logAction({ action: 'CREATE', module: 'USER', details: `Bulk imported ${successCount} students`, userId: req.user._id, tenantId });
        if (successCount > 0) emitToTenant(tenantId, 'student:bulk-imported', { count: successCount });

        res.status(200).json({
            success: true, results: importResults,
            summary: { total: students.length, success: successCount, failed: importResults.filter(r => r.status === 'failed').length }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Reset student password
exports.resetStudentPassword = async (req, res) => {
    try {
        const student = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId, role: 'student' } });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const newPassword = generatePassword();
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({ where: { id: req.params.id }, data: { password: hashed, passwordPlain: newPassword } });

        await logAction({ action: 'UPDATE', module: 'USER', details: `Reset password for student: ${student.firstName} ${student.lastName}`, userId: req.user._id, tenantId: req.user.tenantId });
        res.status(200).json({ success: true, message: 'Password reset successfully', password: newPassword });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper
function calcAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}
