"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import api from '../../../utils/api';

type View = 'profile' | 'attendance' | 'exams' | 'finance' | 'documents' | 'idcard';
type DateInput = string | number | Date | null | undefined;

interface Entity {
    _id?: string;
    id?: string;
}

interface Person extends Entity {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    profile?: {
        phone?: string | null;
    };
}

interface StudentProfile {
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    designation?: string | null;
    admissionNo?: string | null;
    studentId?: string | null;
    rollNo?: string | null;
    class?: string | null;
    section?: string | null;
    gender?: string | null;
    dob?: DateInput;
    motherName?: string | null;
    birthPlace?: string | null;
    disabilityStatus?: string | null;
    orphanStatus?: string | null;
    refugeeStatus?: string | null;
    nationality?: string | null;
    state?: string | null;
    region?: string | null;
    district?: string | null;
    village?: string | null;
    guardianName?: string | null;
    guardianTelephone?: string | null;
    emergencyContactNo?: string | null;
    schoolComments?: string | null;
    absenteeismStatus?: string | null;
    regDate?: DateInput;
    editDate?: DateInput;
    parentRelationship?: string | null;
    parentIds?: Person[];
    stripeCustomerId?: string | null;
}

interface Student extends Person {
    profile?: StudentProfile;
    password_plain?: string | null;
    createdAt?: DateInput;
    updatedAt?: DateInput;
}

interface ClassItem extends Entity {
    name?: string | null;
    section?: string | null;
}

interface Tenant {
    name?: string | null;
    config?: {
        logoUrl?: string | null;
    } | null;
}

interface Subject extends Entity {
    name?: string | null;
    code?: string | null;
    credits?: number | null;
}

interface AttendanceStats {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: string | number;
}

interface AttendanceRecord extends Entity {
    date?: DateInput;
    status?: string | null;
    remarks?: string | null;
    subject?: Subject | null;
    class?: ClassItem | null;
}

interface AttendanceData {
    records: AttendanceRecord[];
    stats: AttendanceStats;
}

interface Exam extends Entity {
    name?: string | null;
    term?: string | null;
    isApproved?: boolean;
    startDate?: DateInput;
}

interface Course {
    subjectName?: string | null;
    subjectCode?: string | null;
    credits?: number;
    marksObtained?: number;
    maxMarks?: number;
    percentage?: string | number;
    grade?: string | null;
    gpa?: string | number;
}

interface Term extends Entity {
    name?: string | null;
    term?: string | null;
    startDate?: DateInput;
    courses?: Course[];
    totalCredits?: number;
    weightedGpaSum?: number;
    termGpa?: string | number;
}

interface GradesData {
    terms: Term[];
    cumulativeGpa: string | number;
    totalCredits: number;
}

interface Mark extends Entity {
    examId?: string;
    exam?: Exam | null;
    subject?: Subject | null;
    marksObtained?: number;
    maxMarks?: number;
    remarks?: string | null;
    gradeRemarks?: string | null;
}

interface InvoiceItem {
    name?: string | null;
    amount?: number | null;
    feeType?: {
        name?: string | null;
    } | null;
}

interface Payment {
    paymentDate?: DateInput;
}

interface Invoice extends Entity {
    invoiceNumber?: string | null;
    class?: ClassItem | null;
    items?: InvoiceItem[];
    payments?: Payment[];
    dueDate?: DateInput;
    totalAmount?: number | null;
    paidAmount?: number | null;
    status?: string | null;
}

interface Certificate extends Entity {
    title?: string | null;
    certificateType?: string | null;
    certificateNumber?: string | null;
    issueDate?: DateInput;
    status?: string | null;
    verificationCode?: string | null;
    issuer?: Person | null;
}

interface RequestError {
    response?: {
        data?: {
            message?: string;
        };
    };
}

const tabs: View[] = ['profile', 'attendance', 'exams', 'finance', 'documents'];
const tabLabels: Record<View, string> = {
    profile: 'Profile',
    attendance: 'Attendance',
    exams: 'Exams',
    finance: 'Finance',
    documents: 'Documents',
    idcard: 'ID Card'
};

const emptyAttendanceStats: AttendanceStats = {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: '0.0'
};

const getId = (item?: Entity | null) => item?._id || item?.id || '';

const fullName = (person?: Person | null) => `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'N/A';

const formatDate = (value: DateInput, fallback = 'Not set') => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleDateString();
};

const formatDateTime = (value: DateInput, fallback = 'Not set') => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toLocaleString();
};

const formatMoney = (value: number | string | null | undefined) => `$${Number(value ?? 0).toLocaleString()}`;

const statusClass = (status: string | null | undefined) => {
    const value = String(status || '').toLowerCase();
    if (['present', 'paid', 'active', 'completed', 'approved'].includes(value)) {
        return 'bg-green-400/10 text-green-400 border border-green-400/20';
    }
    if (['absent', 'unpaid', 'revoked', 'failed'].includes(value)) {
        return 'bg-red-400/10 text-red-400 border border-red-400/20';
    }
    if (['late', 'partially_paid', 'ongoing', 'scheduled'].includes(value)) {
        return 'bg-amber-400/10 text-amber-300 border border-amber-400/20';
    }
    return 'bg-slate-400/10 text-slate-300 border border-slate-400/20';
};

const requestMessage = (error: unknown, fallback: string) => {
    const requestError = error as RequestError;
    return requestError.response?.data?.message || fallback;
};

export default function StudentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [student, setStudent] = useState<Student | null>(null);
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [sectionLoading, setSectionLoading] = useState(false);
    const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({});
    const [view, setView] = useState<View>('profile');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [attendanceData, setAttendanceData] = useState<AttendanceData>({ records: [], stats: emptyAttendanceStats });
    const [gradesData, setGradesData] = useState<GradesData>({ terms: [], cumulativeGpa: '0.00', totalCredits: 0 });
    const [marks, setMarks] = useState<Mark[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [assignData, setAssignData] = useState({ class: '', section: 'A' });
    const [editData, setEditData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dob: '',
        gender: 'male',
        studentId: '',
        admissionNo: '',
        rollNo: '',
        parentRelationship: 'Guardian'
    });

    const idCardRef = useRef<HTMLDivElement>(null);

    const financeTotals = useMemo(() => {
        const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0);
        const paidAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
        const outstanding = totalAmount - paidAmount;
        const overdue = invoices.filter(invoice => {
            if (invoice.status === 'paid' || !invoice.dueDate) return false;
            return new Date(invoice.dueDate) < new Date();
        }).length;

        return { totalAmount, paidAmount, outstanding, overdue };
    }, [invoices]);

    const examSummary = useMemo(() => {
        const approvedTerms = gradesData.terms || [];
        const examIds = new Set(marks.map(mark => mark.examId || mark.exam?.id).filter(Boolean));
        const approvedCourses = approvedTerms.reduce((sum, term) => sum + (term.courses?.length || 0), 0);

        return {
            approvedTerms: approvedTerms.length,
            recordedExams: examIds.size,
            approvedCourses,
            cumulativeGpa: gradesData.cumulativeGpa || '0.00',
            totalCredits: gradesData.totalCredits || 0
        };
    }, [gradesData, marks]);

    const fetchStudentSections = useCallback(async () => {
        if (!id) return;
        setSectionLoading(true);
        const errors: Record<string, string> = {};

        const [attendanceRes, gradesRes, marksRes, invoicesRes, certificatesRes] = await Promise.allSettled([
            api.get(`/attendance/student/${id}`),
            api.get(`/exams/student-grades/${id}`),
            api.get(`/exams/marks?studentId=${id}`),
            api.get(`/fees/invoices?studentId=${id}`),
            api.get(`/certificates/student/${id}`)
        ]);

        if (attendanceRes.status === 'fulfilled') {
            const payload = attendanceRes.value.data.data as Partial<AttendanceData> | undefined;
            setAttendanceData({
                records: payload?.records || [],
                stats: { ...emptyAttendanceStats, ...(payload?.stats || {}) }
            });
        } else {
            errors.attendance = requestMessage(attendanceRes.reason, 'Attendance data could not be loaded.');
        }

        if (gradesRes.status === 'fulfilled') {
            const payload = gradesRes.value.data.data as Partial<GradesData> | undefined;
            setGradesData({
                terms: payload?.terms || [],
                cumulativeGpa: payload?.cumulativeGpa || '0.00',
                totalCredits: payload?.totalCredits || 0
            });
        } else {
            errors.exams = requestMessage(gradesRes.reason, 'Exam summary could not be loaded.');
        }

        if (marksRes.status === 'fulfilled') {
            setMarks((marksRes.value.data.data as Mark[]) || []);
        } else {
            errors.exams = requestMessage(marksRes.reason, errors.exams || 'Exam marks could not be loaded.');
        }

        if (invoicesRes.status === 'fulfilled') {
            setInvoices((invoicesRes.value.data.data as Invoice[]) || []);
        } else {
            errors.finance = requestMessage(invoicesRes.reason, 'Finance data could not be loaded.');
        }

        if (certificatesRes.status === 'fulfilled') {
            setCertificates((certificatesRes.value.data.data?.certificates as Certificate[]) || []);
        } else {
            errors.documents = requestMessage(certificatesRes.reason, 'Documents could not be loaded.');
        }

        setSectionErrors(errors);
        setSectionLoading(false);
    }, [id]);

    const fetchStudent = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [studentRes, classRes, tenantRes] = await Promise.all([
                api.get(`/students/${id}`),
                api.get('/classes'),
                api.get('/tenants/me')
            ]);

            const studentData = studentRes.data.data as Student;
            const classData = (classRes.data.data || []) as ClassItem[];
            const currentClass = classData.find((item) =>
                item.name === studentData.profile?.class && item.section === studentData.profile?.section
            );

            setStudent(studentData);
            setClasses(classData);
            setTenant(tenantRes.data.data as Tenant);
            setAssignData({
                class: getId(currentClass) || '',
                section: studentData.profile?.section || currentClass?.section || 'A'
            });
            setEditData({
                firstName: studentData.firstName || '',
                lastName: studentData.lastName || '',
                email: studentData.email || '',
                phone: studentData.profile?.phone || '',
                address: studentData.profile?.address || '',
                dob: studentData.profile?.dob ? new Date(studentData.profile.dob).toISOString().split('T')[0] : '',
                gender: studentData.profile?.gender || 'male',
                studentId: studentData.profile?.studentId || '',
                admissionNo: studentData.profile?.admissionNo || '',
                rollNo: studentData.profile?.rollNo || '',
                parentRelationship: studentData.profile?.parentRelationship || 'Guardian'
            });

            await fetchStudentSections();
        } catch (error) {
            console.error('Failed to fetch student profile', error);
            setStudent(null);
        } finally {
            setLoading(false);
        }
    }, [fetchStudentSections, id]);

    useEffect(() => {
        if (id) fetchStudent();
    }, [fetchStudent, id]);

    const handleEditSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!student) return;
        try {
            await api.put(`/students/${id}`, {
                firstName: editData.firstName,
                lastName: editData.lastName,
                email: editData.email,
                profile: {
                    ...(student.profile || {}),
                    phone: editData.phone,
                    address: editData.address,
                    dob: editData.dob,
                    gender: editData.gender,
                    studentId: editData.studentId,
                    admissionNo: editData.admissionNo,
                    rollNo: editData.rollNo,
                    parentRelationship: editData.parentRelationship
                }
            });
            alert('Profile updated successfully');
            setIsEditModalOpen(false);
            fetchStudent();
        } catch (err: unknown) {
            alert(requestMessage(err, 'Update failed'));
        }
    };

    const handleAssignSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!student) return;
        const selectedClass = classes.find(item => getId(item) === assignData.class);
        if (!selectedClass) {
            alert('Please select a class.');
            return;
        }

        try {
            await api.put(`/students/${id}`, {
                profile: {
                    ...(student.profile || {}),
                    class: selectedClass.name,
                    section: assignData.section || selectedClass.section || 'A'
                }
            });
            alert('Class assigned successfully');
            setIsModalOpen(false);
            fetchStudent();
        } catch (err: unknown) {
            alert(requestMessage(err, 'Class assignment failed'));
        }
    };

    const downloadIDCard = async () => {
        if (!idCardRef.current || !student) return;
        try {
            const canvas = await html2canvas(idCardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: null
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [canvas.width / 4, canvas.height / 4]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 4, canvas.height / 4);
            pdf.save(`${student.firstName}_ID_Card.pdf`);
        } catch (error) {
            console.error('PDF generation failed', error);
            alert('Failed to generate PDF. Check console for details.');
        }
    };

    const renderTabError = (key: string) => sectionErrors[key] ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-medium text-red-200">
            {sectionErrors[key]}
        </div>
    ) : null;

    const renderEmpty = (message: string) => (
        <div className="glass-dark rounded-[2rem] border border-white/5 px-8 py-12 text-center text-slate-500 font-medium">
            {message}
        </div>
    );

    if (loading) {
        return <div className="p-20 text-center text-slate-500 font-medium animate-pulse italic">Retrieving academic profile...</div>;
    }

    if (!student) {
        return <div className="p-20 text-center text-red-500 font-bold">Student record not found.</div>;
    }

    const attendanceStats = { ...emptyAttendanceStats, ...(attendanceData.stats || {}) };
    const attendanceRecords = attendanceData.records || [];
    const attendancePercentage = Number(attendanceStats.percentage || 0);
    const studentName = fullName(student);
    const avatarUrl = student.profile?.avatarUrl || '';
    const tenantLogoUrl = tenant?.config?.logoUrl || '';
    const guardians = student.profile?.parentIds || [];
    const currentClassLabel = student.profile?.class
        ? `${student.profile.class}${student.profile?.section ? ` - ${student.profile.section}` : ''}`
        : 'No class assigned';

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/students" className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition">
                        Back
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/30 overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={studentName} className="w-full h-full object-cover" />
                            ) : (
                                student.firstName?.charAt(0) || 'S'
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{studentName}</h1>
                            <p className="text-slate-500 font-mono text-sm">{student.profile?.admissionNo || 'N/A'} | {currentClassLabel}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setView('idcard')} className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-all">
                        View ID Card
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all">
                        Assign Class
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold border border-white/5 hover:bg-slate-700 transition">
                        Edit Profile
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="glass-dark w-full max-w-lg p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                        <h2 className="text-2xl font-black text-white mb-2">Assign Class</h2>
                        <p className="text-sm text-slate-500 mb-6">Move {studentName} to the correct class and section.</p>
                        <form onSubmit={handleAssignSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Class</label>
                                <select
                                    required
                                    value={assignData.class}
                                    onChange={event => {
                                        const selectedClass = classes.find(item => getId(item) === event.target.value);
                                        setAssignData({
                                            class: event.target.value,
                                            section: selectedClass?.section || assignData.section || 'A'
                                        });
                                    }}
                                    className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                >
                                    <option value="">Select class</option>
                                    {classes.map((item) => (
                                        <option key={getId(item)} value={getId(item)}>
                                            {item.name} - {item.section}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section</label>
                                <input
                                    value={assignData.section}
                                    onChange={event => setAssignData({ ...assignData, section: event.target.value })}
                                    className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                />
                            </div>
                            <div className="flex gap-4 pt-2">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">
                                    Save Assignment
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="glass-dark w-full max-w-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black text-white mb-6">Edit Student Profile</h2>

                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                                    <input
                                        required
                                        value={editData.firstName}
                                        onChange={event => setEditData({ ...editData, firstName: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                                    <input
                                        required
                                        value={editData.lastName}
                                        onChange={event => setEditData({ ...editData, lastName: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={editData.email}
                                        onChange={event => setEditData({ ...editData, email: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                                    <input
                                        value={editData.phone}
                                        onChange={event => setEditData({ ...editData, phone: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={editData.dob}
                                        onChange={event => setEditData({ ...editData, dob: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                                    <select
                                        value={editData.gender}
                                        onChange={event => setEditData({ ...editData, gender: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student ID</label>
                                    <input
                                        value={editData.studentId}
                                        onChange={event => setEditData({ ...editData, studentId: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admission No</label>
                                    <input
                                        value={editData.admissionNo}
                                        onChange={event => setEditData({ ...editData, admissionNo: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Roll No</label>
                                    <input
                                        value={editData.rollNo}
                                        onChange={event => setEditData({ ...editData, rollNo: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Parent Relationship</label>
                                    <select
                                        value={editData.parentRelationship}
                                        onChange={event => setEditData({ ...editData, parentRelationship: event.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    >
                                        <option value="Father">Father</option>
                                        <option value="Mother">Mother</option>
                                        <option value="Guardian">Guardian</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Address</label>
                                <textarea
                                    value={editData.address}
                                    onChange={event => setEditData({ ...editData, address: event.target.value })}
                                    className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition h-24"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">
                                    Save Changes
                                </button>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex gap-8 border-b border-white/5 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${view === tab ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tabLabels[tab]}
                        {view === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-full"></div>}
                    </button>
                ))}
            </div>

            {sectionLoading && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3 text-sm text-slate-500">
                    Refreshing student records...
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {view === 'profile' && (
                    <>
                        <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8">
                                <h3 className="text-xl font-bold text-white">Full Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { label: 'Date of Birth', value: formatDate(student.profile?.dob) },
                                        { label: 'Gender', value: student.profile?.gender || 'Not set' },
                                        { label: 'Mother Name', value: student.profile?.motherName || 'Not set' },
                                        { label: 'Birth Place', value: student.profile?.birthPlace || 'Not set' },
                                        { label: 'Phone', value: student.profile?.phone || 'Not set' },
                                        { label: 'Email', value: student.email || 'Not set' },
                                        { label: 'Address', value: student.profile?.address || 'Not set' },
                                        { label: 'Student ID', value: student.profile?.studentId || 'N/A' },
                                        { label: 'Admission No', value: student.profile?.admissionNo || 'N/A' },
                                        { label: 'Roll Number', value: student.profile?.rollNo || 'N/A' },
                                        { label: 'Nationality', value: student.profile?.nationality || 'Not set' },
                                        { label: 'Disability Status', value: student.profile?.disabilityStatus || 'Not set' },
                                        { label: 'Orphan Status', value: student.profile?.orphanStatus || 'Not set' },
                                        { label: 'Refugee Status', value: student.profile?.refugeeStatus || 'Not set' },
                                        { label: 'State', value: student.profile?.state || 'Not set' },
                                        { label: 'Region', value: student.profile?.region || 'Not set' },
                                        { label: 'District', value: student.profile?.district || 'Not set' },
                                        { label: 'Village', value: student.profile?.village || 'Not set' },
                                        { label: 'Guardian Name', value: student.profile?.guardianName || 'Not set' },
                                        { label: 'Guardian Telephone', value: student.profile?.guardianTelephone || 'Not set' },
                                        { label: 'Emergency Contact No', value: student.profile?.emergencyContactNo || 'Not set' },
                                        { label: 'Absenteeism Status', value: student.profile?.absenteeismStatus || 'Not set' },
                                        { label: 'Registration Date', value: formatDateTime(student.profile?.regDate) },
                                        { label: 'School Comments', value: student.profile?.schoolComments || 'Not set' },
                                        { label: 'Password', value: student.password_plain || '********' }
                                    ].map((item, index) => (
                                        <div key={index}>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{item.label}</p>
                                            <p className="text-slate-200 font-medium break-words">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Guardians</h3>
                                {guardians.length > 0 ? guardians.map((parent) => (
                                    <div key={getId(parent)} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                        <div className="flex justify-between items-start gap-3">
                                            <p className="text-sm font-bold text-white">{fullName(parent)}</p>
                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                {student.profile?.parentRelationship || 'Guardian'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 break-words">{parent.email || 'No email'}</p>
                                        <p className="text-[10px] text-indigo-400 font-medium">{parent.profile?.phone || parent.phone || 'No phone'}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500 italic px-2">No guardian linked.</p>
                                )}
                            </div>

                            <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Attendance Rate</span>
                                        <span className="text-green-400 font-bold">{attendanceStats.percentage}%</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Cumulative GPA</span>
                                        <span className="text-indigo-400 font-bold">{examSummary.cumulativeGpa}</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Outstanding Fees</span>
                                        <span className="text-amber-300 font-bold">{formatMoney(financeTotals.outstanding)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {view === 'attendance' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        {renderTabError('attendance')}
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <h3 className="text-xl font-bold text-white">Attendance History</h3>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[
                                    { label: 'Present Rate', value: `${attendancePercentage.toFixed(1)}%`, color: 'text-green-400' },
                                    { label: 'Present', value: attendanceStats.present, color: 'text-green-400' },
                                    { label: 'Absent', value: attendanceStats.absent, color: 'text-red-400' },
                                    { label: 'Late', value: attendanceStats.late, color: 'text-amber-300' },
                                    { label: 'Total', value: attendanceStats.total, color: 'text-slate-200' }
                                ].map((item) => (
                                    <div key={item.label} className="px-4 py-3 bg-white/5 border border-white/5 rounded-xl">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">{item.label}</p>
                                        <p className={`${item.color} font-black text-lg`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {attendanceRecords.length === 0 ? renderEmpty('No attendance records found for this student.') : (
                            <div className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-8 py-4">Date</th>
                                            <th className="px-8 py-4">Subject</th>
                                            <th className="px-8 py-4">Class</th>
                                            <th className="px-8 py-4">Status</th>
                                            <th className="px-8 py-4">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {attendanceRecords.map((record) => (
                                            <tr key={getId(record)}>
                                                <td className="px-8 py-4 text-slate-400 text-xs">{formatDate(record.date)}</td>
                                                <td className="px-8 py-4 text-slate-300 text-xs">{record.subject?.name || 'General'}</td>
                                                <td className="px-8 py-4 text-slate-400 text-xs">{record.class?.name || student.profile?.class || 'N/A'} {record.class?.section || student.profile?.section || ''}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusClass(record.status)}`}>{record.status || 'N/A'}</span>
                                                </td>
                                                <td className="px-8 py-4 text-slate-500 text-xs italic">{record.remarks || 'No remarks'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {view === 'exams' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        {renderTabError('exams')}
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <h3 className="text-xl font-bold text-white">Exam Performance</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Cumulative GPA', value: examSummary.cumulativeGpa, color: 'text-indigo-400' },
                                    { label: 'Credits', value: examSummary.totalCredits, color: 'text-slate-200' },
                                    { label: 'Approved Exams', value: examSummary.approvedTerms, color: 'text-green-400' },
                                    { label: 'Recorded Exams', value: examSummary.recordedExams, color: 'text-amber-300' }
                                ].map((item) => (
                                    <div key={item.label} className="px-4 py-3 bg-white/5 border border-white/5 rounded-xl">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">{item.label}</p>
                                        <p className={`${item.color} font-black text-lg`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {gradesData.terms.length === 0 && marks.length === 0 ? renderEmpty('No exam results or marks found for this student.') : (
                            <div className="space-y-6">
                                {(gradesData.terms || []).map((term) => (
                                    <div key={term.id || term.name} className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
                                        <div className="px-8 py-5 border-b border-white/5 flex flex-col md:flex-row justify-between gap-3">
                                            <div>
                                                <h4 className="text-white font-black">{term.name}</h4>
                                                <p className="text-xs text-slate-500">{term.term || 'Term not set'} | {formatDate(term.startDate)}</p>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-black">Term GPA</p>
                                                <p className="text-indigo-400 font-black text-xl">{term.termGpa || '0.00'}</p>
                                            </div>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="px-8 py-4">Subject</th>
                                                    <th className="px-8 py-4">Marks</th>
                                                    <th className="px-8 py-4">Percentage</th>
                                                    <th className="px-8 py-4">Grade</th>
                                                    <th className="px-8 py-4">GPA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {(term.courses || []).map((course, index) => (
                                                    <tr key={`${term.id}-${course.subjectCode || course.subjectName}-${index}`}>
                                                        <td className="px-8 py-4">
                                                            <p className="text-slate-200 text-sm font-bold">{course.subjectName}</p>
                                                            <p className="text-[10px] text-slate-500">{course.subjectCode || 'No code'}</p>
                                                        </td>
                                                        <td className="px-8 py-4 text-slate-300 text-xs">{course.marksObtained} / {course.maxMarks}</td>
                                                        <td className="px-8 py-4 text-slate-300 text-xs">{course.percentage}%</td>
                                                        <td className="px-8 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-400/10 text-indigo-300 border border-indigo-400/20">{course.grade || 'N/A'}</span></td>
                                                        <td className="px-8 py-4 text-indigo-400 font-black text-xs">{course.gpa || '0.00'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}

                                {marks.length > 0 && (
                                    <div className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
                                        <div className="px-8 py-5 border-b border-white/5">
                                            <h4 className="text-white font-black">All Recorded Marks</h4>
                                            <p className="text-xs text-slate-500">Includes approved and pending exam marks.</p>
                                        </div>
                                        <table className="w-full text-left">
                                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                                <tr>
                                                    <th className="px-8 py-4">Exam</th>
                                                    <th className="px-8 py-4">Subject</th>
                                                    <th className="px-8 py-4">Marks</th>
                                                    <th className="px-8 py-4">Status</th>
                                                    <th className="px-8 py-4">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {marks.map((mark) => (
                                                    <tr key={getId(mark)}>
                                                        <td className="px-8 py-4">
                                                            <p className="text-slate-200 text-sm font-bold">{mark.exam?.name || 'N/A'}</p>
                                                            <p className="text-[10px] text-slate-500">{mark.exam?.term || 'No term'} | {formatDate(mark.exam?.startDate)}</p>
                                                        </td>
                                                        <td className="px-8 py-4 text-slate-300 text-xs">{mark.subject?.name || 'N/A'}</td>
                                                        <td className="px-8 py-4 text-slate-300 text-xs">{mark.marksObtained} / {mark.maxMarks}</td>
                                                        <td className="px-8 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusClass(mark.exam?.isApproved ? 'approved' : 'scheduled')}`}>
                                                                {mark.exam?.isApproved ? 'Approved' : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-4 text-slate-500 text-xs italic">{mark.remarks || mark.gradeRemarks || 'No remarks'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {view === 'finance' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        {renderTabError('finance')}
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <h3 className="text-xl font-bold text-white">Student Finance</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { label: 'Billed', value: formatMoney(financeTotals.totalAmount), color: 'text-indigo-400' },
                                    { label: 'Paid', value: formatMoney(financeTotals.paidAmount), color: 'text-green-400' },
                                    { label: 'Outstanding', value: formatMoney(financeTotals.outstanding), color: financeTotals.outstanding > 0 ? 'text-amber-300' : 'text-green-400' },
                                    { label: 'Overdue', value: financeTotals.overdue, color: financeTotals.overdue > 0 ? 'text-red-400' : 'text-slate-200' }
                                ].map((item) => (
                                    <div key={item.label} className="px-4 py-3 bg-white/5 border border-white/5 rounded-xl">
                                        <p className="text-[10px] text-slate-500 uppercase font-black">{item.label}</p>
                                        <p className={`${item.color} font-black text-lg`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {invoices.length === 0 ? renderEmpty('No invoices found for this student.') : (
                            <div className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-8 py-4">Invoice</th>
                                            <th className="px-8 py-4">Items</th>
                                            <th className="px-8 py-4">Due Date</th>
                                            <th className="px-8 py-4">Amount</th>
                                            <th className="px-8 py-4">Paid</th>
                                            <th className="px-8 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {invoices.map((invoice) => (
                                            <tr key={getId(invoice)}>
                                                <td className="px-8 py-4">
                                                    <p className="text-slate-200 text-sm font-bold">{invoice.invoiceNumber || getId(invoice)}</p>
                                                    <p className="text-[10px] text-slate-500">{invoice.class?.name || student.profile?.class || 'N/A'} {invoice.class?.section || student.profile?.section || ''}</p>
                                                </td>
                                                <td className="px-8 py-4 text-slate-400 text-xs">
                                                    {(invoice.items || []).length > 0
                                                        ? (invoice.items || []).map((item) => item.name || item.feeType?.name || 'Fee').join(', ')
                                                        : 'No items'}
                                                </td>
                                                <td className="px-8 py-4 text-slate-400 text-xs">{formatDate(invoice.dueDate)}</td>
                                                <td className="px-8 py-4 text-white font-black text-xs">{formatMoney(invoice.totalAmount)}</td>
                                                <td className="px-8 py-4 text-green-400 font-black text-xs">{formatMoney(invoice.paidAmount)}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusClass(invoice.status)}`}>{invoice.status || 'N/A'}</span>
                                                    {(invoice.payments || []).length > 0 && (
                                                        <p className="text-[10px] text-slate-500 mt-2">Last paid {formatDate((invoice.payments || [])[0]?.paymentDate)}</p>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {view === 'documents' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        {renderTabError('documents')}
                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">Student Documents</h3>
                                <p className="text-sm text-slate-500 mt-1">Official generated records and issued certificates for this student.</p>
                            </div>
                            <Link href="/dashboard/certificates" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition text-center">
                                Issue Certificate
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition space-y-4">
                                <div>
                                    <p className="text-white font-bold">Student ID Card</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Generated from current profile data</p>
                                </div>
                                <button onClick={() => setView('idcard')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold transition">
                                    View ID Card
                                </button>
                            </div>
                            <div className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition space-y-4">
                                <div>
                                    <p className="text-white font-bold">Profile Record</p>
                                    <p className="text-[10px] text-slate-500 mt-1">Created {formatDate(student.createdAt)} | Updated {formatDate(student.updatedAt)}</p>
                                </div>
                                <button onClick={() => setView('profile')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold transition">
                                    View Profile
                                </button>
                            </div>
                            {certificates.map((certificate) => (
                                <div key={getId(certificate)} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition space-y-4">
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-white font-bold">{certificate.title || certificate.certificateType}</p>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusClass(certificate.status)}`}>{certificate.status || 'active'}</span>
                                        </div>
                                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-2">{certificate.certificateType}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Issued {formatDate(certificate.issueDate)} by {fullName(certificate.issuer)}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">Certificate No: {certificate.certificateNumber || 'N/A'}</p>
                                    </div>
                                    {certificate.verificationCode && (
                                        <Link href={`/verify-certificate/${certificate.verificationCode}`} className="block w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-bold transition text-center">
                                            Verify Certificate
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>

                        {certificates.length === 0 && renderEmpty('No certificates have been issued for this student yet.')}
                    </div>
                )}

                {view === 'idcard' && (
                    <div className="lg:col-span-3 flex flex-col items-center py-10 animate-in zoom-in duration-300 gap-8">
                        <div ref={idCardRef} className="w-[350px] h-[520px] bg-[#020617] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col items-center shadow-2xl relative">
                            <div className="absolute top-0 w-full h-40 bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#1e1b4b] -skew-y-6 -translate-y-12"></div>

                            <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg overflow-hidden">
                                    {tenantLogoUrl ? (
                                        <img src={tenantLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="text-white font-black text-2xl italic">{tenant?.name?.charAt(0) || 'S'}</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-xs tracking-widest uppercase">
                                        {tenant?.name || 'SchoolOS'}
                                    </span>
                                    <span className="text-white/60 font-medium text-[7px] tracking-widest uppercase -mt-0.5">Official Student ID</span>
                                </div>
                            </div>

                            <div className="absolute top-4 right-6 z-20">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
                                    <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Official</span>
                                </div>
                            </div>

                            <div className="z-10 mt-14 mb-8">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-[#0f172a] border-4 border-[#020617] flex items-center justify-center text-5xl font-black text-white shadow-2xl relative group overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={studentName} className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="absolute inset-0 bg-[#4f46e5]/20 group-hover:bg-[#4f46e5]/30 transition-colors"></div>
                                            <span className="relative z-10">{student.firstName?.charAt(0) || 'S'}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="z-10 text-center px-8 w-full">
                                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{studentName}</h2>
                                <p className="text-[#818cf8] font-black uppercase tracking-[0.2em] text-[10px] my-2 bg-[#818cf8]/10 inline-block px-3 py-1 rounded-full border border-[#818cf8]/20">Student ID Card</p>

                                <div className="mt-10 space-y-6 w-full">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center border-r border-white/5">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Student ID</p>
                                            <p className="text-white font-mono text-xs font-bold">{student.profile?.studentId || 'N/A'}</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Adm No</p>
                                            <p className="text-white font-mono text-xs font-bold">{student.profile?.admissionNo || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-4">
                                        <div className="border-r border-white/5 text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Grade</p>
                                            <p className="text-white text-[10px] font-black">{student.profile?.class || 'N/A'}</p>
                                        </div>
                                        <div className="border-r border-white/5 text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Sec</p>
                                            <p className="text-white text-[10px] font-black uppercase">{student.profile?.section || 'N/A'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Roll</p>
                                            <p className="text-white text-[10px] font-black">{student.profile?.rollNo || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex flex-col items-center gap-3">
                                        <div className="w-24 h-24 bg-white p-2.5 rounded-2xl shadow-inner flex items-center justify-center relative overflow-hidden group border border-slate-200">
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#4f46e5]"></div>
                                            <div className="w-full h-full flex gap-1 items-end justify-center">
                                                {[3, 6, 4, 8, 5, 7, 4, 6, 3, 5].map((height, index) => (
                                                    <div key={index} className="w-1 bg-[#020617] rounded-full" style={{ height: `${height * 10}%` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-[8px] font-mono text-[#64748b] tracking-[0.3em]">{Date.now().toString().slice(-10)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-6 w-full text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <p className="text-[10px] font-black text-[#94a3b8] tracking-[0.2em] uppercase">Contact: {student.profile?.phone || 'N/A'}</p>
                                </div>
                                <p className="text-[7px] text-[#475569] font-medium">Valid for the current academic year</p>
                            </div>
                        </div>

                        <button
                            onClick={downloadIDCard}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95"
                        >
                            Download PDF Version
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
