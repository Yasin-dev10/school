"use client";
import { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title as ChartTitle,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import api from '../../utils/api';
import { validateMarkEntry } from '../../../utils/validation';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ChartTitle,
    Tooltip,
    Legend,
    ArcElement
);

export default function ExamsPage() {
    const [user, setUser] = useState<any>(null);
    const [view, setView] = useState('board');
    const [maxMarks, setMaxMarks] = useState('100');
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Board State
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [examForm, setExamForm] = useState<{ name: string; term: string; startDate: string; endDate: string; classes: string[] }>({ name: '', term: 'First_Term', startDate: '', endDate: '', classes: [] });

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [editForm, setEditForm] = useState<{ name: string; term: string; startDate: string; endDate: string; classes: string[] }>({ name: '', term: 'First_Term', startDate: '', endDate: '', classes: [] });
    const [isEditSaving, setIsEditSaving] = useState(false);

    // Delete State
    const [deletingExamId, setDeletingExamId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Grades State
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState<any>({}); // { studentId: { score, remarks, grade, gpa, gradeRemarks, isDirty } }
    const [studentMarks, setStudentMarks] = useState([]); // For student view
    const [saving, setSaving] = useState(false);

    // Grade Configuration State
    const [gradeSystem, setGradeSystem] = useState<any>(null);
    const [isConfigSaving, setIsConfigSaving] = useState(false);

    // Complaints State
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [complaintForm, setComplaintForm] = useState({ examId: '', subjectId: '', currentMark: 0, reason: '' });

    // Clearance State
    const [clearanceClass, setClearanceClass] = useState<any>(null);
    const [clearanceStudents, setClearanceStudents] = useState<any[]>([]);
    const [clearanceSelectedStudent, setClearanceSelectedStudent] = useState<any>(null);
    const [clearanceData, setClearanceData] = useState<any>(null);
    const [isCheckingClearance, setIsCheckingClearance] = useState(false);

    // Report Card State
    const [reportData, setReportData] = useState<any>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);

    // Entry Status — subjects with marks entered vs remaining
    const [entryStatusExam, setEntryStatusExam] = useState<any>(null);
    const [entryStatusLoading, setEntryStatusLoading] = useState(false);
    const [entryStatusRows, setEntryStatusRows] = useState<any[]>([]);

    // Exam schedule
    const [examSchedules, setExamSchedules] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleGenerating, setScheduleGenerating] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [editScheduleForm, setEditScheduleForm] = useState({ classId: '', subjectId: '', date: '', startTime: '', endTime: '', room: '' });
    const [scheduleExamFilter, setScheduleExamFilter] = useState('');
    const [scheduleClassFilter, setScheduleClassFilter] = useState('');
    const [scheduleForm, setScheduleForm] = useState({ examId: '', classId: '', subjectId: '', date: '', startTime: '', endTime: '', room: '', invigilators: [] as string[] });
    const [generatorTimes, setGeneratorTimes] = useState({ firstStart: '08:00', firstEnd: '10:00', secondStart: '10:30', secondEnd: '12:30' });
    const [generatorStartDate, setGeneratorStartDate] = useState('');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            if (userData && !userData._id && userData.id) {
                userData._id = userData.id;
            }
            setUser(userData);
            if (userData.role === 'student' || userData.role === 'parent') {
                setView('my-results');
            } else if (userData.role === 'teacher') {
                setView('grades');
            }
        }

        const fetchBase = async () => {
            try {
                const userStr = localStorage.getItem('user');
                const userData = userStr ? JSON.parse(userStr) : null;
                const subjectQuery = userData?.role === 'teacher' ? '/subjects?assignedOnly=true' : '/subjects';

                const [exRes, clRes, subRes, tenRes, scheduleRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes'),
                    api.get(subjectQuery),
                    api.get('/tenants/me'),
                    api.get('/exams/schedule').catch(() => ({ data: { data: [] } }))
                ]);
                setExams(exRes.data.data);
                setClasses(clRes.data.data);
                setSubjects(subRes.data.data);
                setTenant(tenRes.data.data);
                const loadedSchedules = scheduleRes.data.data || [];
                setExamSchedules(loadedSchedules);
                if (loadedSchedules.length) {
                    setScheduleExamFilter(loadedSchedules[0].exam?._id || loadedSchedules[0].exam?.id || '');
                    setScheduleClassFilter('');
                    setGeneratorStartDate(String(loadedSchedules[0].exam?.startDate || '').slice(0, 10));
                }
                if (userData?.role === 'school-admin') {
                    const teacherRes = await api.get('/teachers');
                    setTeachers(teacherRes.data.data || []);
                }
            } catch (err) {
                console.error("Base fetch failed");
            } finally {
                setLoading(false);
            }
        };
        fetchBase();
    }, []);

    const fetchReport = async (examId: string, studentId: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/exams/report/${examId}/${studentId}`);
            setReportData(data.data);
            setIsReportOpen(true);
        } catch (err) {
            alert("Report card data not ready yet.");
        } finally {
            setLoading(false);
        }
    };

    const downloadPDFReport = (examId: string, studentId: string) => {
        window.open(`${api.defaults.baseURL}/exams/report/${examId}/${studentId}?format=pdf`, '_blank');
    };

    const exportMatrix = async () => {
        if (!selectedExam || !selectedClass) return alert("Select Exam and Class");
        window.open(`${api.defaults.baseURL}/exams/export-matrix?examId=${selectedExam._id}&classId=${selectedClass._id}`, '_blank');
    };

    const handleApprove = async (examId: string) => {
        if (!confirm("Approve these results? This will finalize them for students.")) return;
        try {
            await api.put(`/exams/${examId}/approve`);
            alert("Exam results approved!");
            const { data } = await api.get('/exams');
            setExams(data.data);
        } catch (err) {
            alert("Approval failed");
        }
    };

    const handleUnapprove = async (examId: string) => {
        if (!confirm("Unlock this exam for editing? Teachers will be able to modify marks again.")) return;
        try {
            await api.put(`/exams/${examId}/unapprove`);
            alert("Exam unlocked! Teachers can now edit marks.");
            const { data } = await api.get('/exams');
            setExams(data.data);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to unlock exam");
        }
    };

    const fetchAnalytics = async (examId: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/exams/analytics/${examId}`);
            setAnalytics(data.data);
            setSelectedExam(exams.find(e => e._id === examId));
            setView('analytics');
        } catch (err) {
            alert("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    // For Student View
    useEffect(() => {
        if (view === 'my-results' && user?.role === 'student') {
            const fetchMyMarks = async () => {
                setLoading(true);
                try {
                    const { data } = await api.get(`/exams/marks?studentId=${user._id}`);
                    setStudentMarks(data.data);
                } catch (err) {
                    console.error("Failed to fetch results");
                } finally {
                    setLoading(false);
                }
            };
            fetchMyMarks();
        }
        if (view === 'complaints') {
            const fetchComplaints = async () => {
                try {
                    const { data } = await api.get('/exams/complaints');
                    setComplaints(data.data);
                } catch (err) { console.error(err); }
            };
            fetchComplaints();
        }
        if (view === 'grade-config') {
            const fetchGradeSystem = async () => {
                try {
                    const { data } = await api.get('/exams/grade-system');
                    setGradeSystem(data.data);
                } catch (err) { console.error(err); }
            };
            fetchGradeSystem();
        }
    }, [view, user]);

    const fetchMarksAndStudents = async () => {
        if (!selectedExam || !selectedClass || !selectedSubject) return;
        setLoading(true);
        try {
            const { data: stuRes } = await api.get(`/students?class=${selectedClass._id}`);
            const classStudents = stuRes.data;
            setStudents(classStudents);

            const { data: markRes } = await api.get(`/exams/marks?examId=${selectedExam._id}&subjectId=${selectedSubject._id}&classId=${selectedClass._id}`);

            const existing: any = {};
            classStudents.forEach((s: any) => {
                existing[s._id] = { score: '', remarks: '', grade: null, gpa: null, gradeRemarks: null, isDirty: false };
            });
            markRes.data.forEach((m: any) => {
                const studentId = m.student?._id;
                if (studentId && existing[studentId]) {
                    existing[studentId] = {
                        score: m.marksObtained,
                        remarks: m.remarks || '',
                        maxMarks: m.maxMarks,
                        grade: m.grade || null,
                        gpa: m.gpa ?? null,
                        gradeRemarks: m.gradeRemarks || null,
                        isDirty: false
                    };
                }
            });
            setMarksData(existing);
        } catch (err) {
            console.error("Marks/Students fetch failed");
        } finally {
            setLoading(false);
        }
    };

    // When filters change for grades view (Admin/Teacher)
    useEffect(() => {
        if (view !== 'grades' || !selectedExam || !selectedClass || !selectedSubject) return;
        fetchMarksAndStudents();
    }, [view, selectedExam, selectedClass, selectedSubject]);

    // When class changes for clearance view
    useEffect(() => {
        if (view === 'clearance' && clearanceClass) {
            const fetchStudents = async () => {
                try {
                    const { data } = await api.get(`/students?class=${clearanceClass._id}`);
                    setClearanceStudents(data.data);
                    setClearanceSelectedStudent(null);
                    setClearanceData(null);
                } catch (err) {
                    console.error("Failed to fetch students");
                }
            };
            fetchStudents();
        }
    }, [view, clearanceClass]);

    // Load subject mark-entry progress for Entry Status view
    useEffect(() => {
        if (view !== 'entry-status' || !entryStatusExam) {
            if (view !== 'entry-status') setEntryStatusRows([]);
            return;
        }
        const load = async () => {
            setEntryStatusLoading(true);
            try {
                const examId = entryStatusExam._id || entryStatusExam.id;
                const examClassIds: string[] = (entryStatusExam.classes || [])
                    .map((c: any) => (typeof c === 'string' ? c : c._id || c.id))
                    .filter(Boolean);

                const targetClasses = examClassIds.length
                    ? classes.filter((c: any) => examClassIds.includes(c._id || c.id))
                    : classes;

                const [marksRes, ...studentResList] = await Promise.all([
                    api.get('/exams/marks', { params: { examId } }),
                    ...targetClasses.map((c: any) =>
                        api.get(`/students?class=${c._id || c.id}`).catch(() => ({ data: { data: [] } }))
                    ),
                ]);

                const marks: any[] = marksRes.data.data || [];
                const markCount = new Map<string, number>(); // `${classId}:${subjectId}` -> count
                marks.forEach((m: any) => {
                    const classId = m.classId || m.class?._id || m.class?.id;
                    const subjectId = m.subjectId || m.subject?._id || m.subject?.id;
                    if (!classId || !subjectId) return;
                    const key = `${classId}:${subjectId}`;
                    markCount.set(key, (markCount.get(key) || 0) + 1);
                });

                const rows = targetClasses.map((cls: any, idx: number) => {
                    const classId = cls._id || cls.id;
                    const studentTotal = (studentResList[idx]?.data?.data || []).length;
                    const classSubjects = (cls.subjects || [])
                        .map((item: any) => item?.subject)
                        .filter((s: any) => s && (s._id || s.id));

                    const subjects = classSubjects.map((sub: any) => {
                        const subjectId = sub._id || sub.id;
                        const entered = markCount.get(`${classId}:${subjectId}`) || 0;
                        const complete = studentTotal > 0 && entered >= studentTotal;
                        const partial = entered > 0 && !complete;
                        return {
                            id: subjectId,
                            name: sub.name,
                            entered,
                            studentTotal,
                            complete,
                            partial,
                            status: complete ? 'done' : partial ? 'partial' : 'pending',
                        };
                    });

                    const done = subjects.filter((s: any) => s.complete).length;
                    const partial = subjects.filter((s: any) => s.partial).length;
                    const pending = subjects.filter((s: any) => !s.complete && !s.partial).length;

                    return {
                        classId,
                        className: `${cls.grade || cls.name}${cls.section ? ` ${cls.section}` : ''}`,
                        studentTotal,
                        subjects,
                        done,
                        partial,
                        pending,
                        totalSubjects: subjects.length,
                    };
                });

                setEntryStatusRows(rows);
            } catch (err) {
                console.error(err);
                setEntryStatusRows([]);
            } finally {
                setEntryStatusLoading(false);
            }
        };
        load();
    }, [view, entryStatusExam, classes]);

    const checkClearance = async (studentId: string) => {
        setIsCheckingClearance(true);
        try {
            const { data } = await api.get(`/fees/invoices?studentId=${studentId}`);
            const invoices = data.data;
            const unpaidInvoices = invoices.filter((i: any) => i.status === 'unpaid' || i.status === 'partially_paid');
            const totalOwed = unpaidInvoices.reduce((acc: number, i: any) => acc + (i.totalAmount - i.paidAmount), 0);
            setClearanceData({ unpaidInvoices, totalOwed });
        } catch (err) {
            console.error("Failed to fetch fee clearance");
        } finally {
            setIsCheckingClearance(false);
        }
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/exams', examForm);
            setIsExamModalOpen(false);
            const { data } = await api.get('/exams');
            setExams(data.data);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to create exam");
        }
    };

    const openEditModal = (exam: any) => {
        setEditingExam(exam);
        setEditForm({
            name: exam.name,
            term: exam.term,
            startDate: exam.startDate ? exam.startDate.split('T')[0] : '',
            endDate: exam.endDate ? exam.endDate.split('T')[0] : '',
            classes: exam.classes?.map((ec: any) => ec._id || ec.classId || ec.class?._id) || [],
        });
        setIsEditModalOpen(true);
    };

    const handleEditExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExam) return;
        setIsEditSaving(true);
        try {
            await api.put(`/exams/${editingExam._id}`, editForm);
            setIsEditModalOpen(false);
            setEditingExam(null);
            const { data } = await api.get('/exams');
            setExams(data.data);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update exam");
        } finally {
            setIsEditSaving(false);
        }
    };

    const handleDeleteExam = async (examId: string) => {
        setDeletingExamId(examId);
        try {
            await api.delete(`/exams/${examId}`);
            setExams(prev => prev.filter(e => e._id !== examId));
            setConfirmDeleteId(null);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete exam");
        } finally {
            setDeletingExamId(null);
        }
    };

    const handleSaveMarks = async () => {
        setSaving(true);
        try {
            // Filter out marks with empty scores and prepare payload
            const marks = Object.keys(marksData)
                .filter(sid => marksData[sid].score !== '' && marksData[sid].score !== null && marksData[sid].score !== undefined)
                .map(sid => ({
                    studentId: sid,
                    score: Number(marksData[sid].score),
                    remarks: marksData[sid].remarks || ''
                }));

            if (marks.length === 0) {
                alert('Please enter at least one mark before saving');
                setSaving(false);
                return;
            }

            // Validate Marks
            for (const m of marks) {
                const validation = validateMarkEntry(m.score, Number(maxMarks));
                if (!validation.isValid) {
                    alert(`Error for student ${m.studentId}: ${validation.message}`);
                    setSaving(false);
                    return;
                }
            }

            await api.post('/exams/marks/bulk', {
                examId: selectedExam._id,
                subjectId: selectedSubject._id,
                classId: selectedClass._id,
                marks,
                maxMarks: Number(maxMarks)
            });
            await fetchMarksAndStudents();
            alert("Grade book updated!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to save marks.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveGradeConfig = async () => {
        setIsConfigSaving(true);
        try {
            const payload = {
                isActive: gradeSystem?.isActive ?? true,
                grades: gradeSystem?.grades?.map((g: any) => ({
                    grade: g.grade,
                    minPercentage: Number(g.minPercentage),
                    maxPercentage: Number(g.maxPercentage),
                    gpa: Number(g.gpa),
                    remarks: g.remarks || null
                })) || []
            };
            await api.put('/exams/grade-system', payload);
            alert("Grade configuration saved!");
        } catch (err) {
            alert("Failed to save configuration");
        } finally {
            setIsConfigSaving(false);
        }
    };

    const handleComplaintSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/exams/complaints', complaintForm);
            alert("Complaint submitted!");
            setIsComplaintModalOpen(false);
            const { data } = await api.get('/exams/complaints');
            setComplaints(data.data);
        } catch (err) {
            alert("Failed to submit complaint");
        }
    };

    const refreshExamSchedules = async () => {
        setScheduleLoading(true);
        try {
            const { data } = await api.get('/exams/schedule');
            setExamSchedules(data.data || []);
        } finally {
            setScheduleLoading(false);
        }
    };

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        setScheduleSaving(true);
        try {
            await api.post('/exams/schedule', scheduleForm);
            setScheduleForm({ examId: '', classId: '', subjectId: '', date: '', startTime: '', endTime: '', room: '', invigilators: [] });
            await refreshExamSchedules();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Jadwalka lama kaydin karin');
        } finally {
            setScheduleSaving(false);
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('Ma hubtaa inaad tirtirayso jadwalkan?')) return;
        try {
            await api.delete(`/exams/schedule/${id}?applyToAllClasses=true`);
            await refreshExamSchedules();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Jadwalka lama tirtiri karin');
        }
    };

    const handleDeleteFullSchedule = async () => {
        if (!scheduleExamFilter) return;
        const examName = exams.find((exam: any) => exam._id === scheduleExamFilter)?.name || 'imtixaankan';
        if (!confirm(`Ma hubtaa inaad tirtirayso jadwalka ${examName} oo dhan?`)) return;
        try {
            await api.delete(`/exams/schedule/exam/${scheduleExamFilter}`);
            setExamSchedules(rows => rows.filter((row: any) => (row.exam?._id || row.exam?.id) !== scheduleExamFilter));
        } catch (err: any) {
            alert(err.response?.data?.message || 'Jadwalka lama tirtiri karin');
        }
    };

    const openScheduleEditor = (row: any) => {
        setEditingSchedule(row);
        setEditScheduleForm({
            classId: row.class?._id || row.class?.id || '', subjectId: row.subject?._id || row.subject?.id || '',
            date: String(row.date).slice(0, 10), startTime: row.startTime, endTime: row.endTime, room: row.room || ''
        });
    };

    const handleUpdateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const id = editingSchedule._id || editingSchedule.id;
            await api.put(`/exams/schedule/${id}`, { ...editScheduleForm, applyToAllClasses: true });
            await refreshExamSchedules();
            setEditingSchedule(null);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Jadwalka lama cusboonaysiin karin');
        }
    };

    const handleGenerateSchedule = async () => {
        if (!scheduleExamFilter) return alert('Marka hore dooro imtixaanka');
        if (examSchedules.some((row: any) => (row.exam?._id || row.exam?.id) === scheduleExamFilter) && !confirm('Imtixaankan jadwal ayuu leeyahay. Ma rabtaa in jadwalkii hore la beddelo?')) return;
        setScheduleGenerating(true);
        try {
            const toMinutes = (time: string) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
            const fromMinutes = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
            const firstDuration = Math.max(30, toMinutes(generatorTimes.firstEnd) - toMinutes(generatorTimes.firstStart));
            const normalizedSecondStart = toMinutes(generatorTimes.secondStart) < toMinutes(generatorTimes.firstEnd) ? generatorTimes.firstEnd : generatorTimes.secondStart;
            const normalizedSecondEnd = toMinutes(generatorTimes.secondEnd) <= toMinutes(normalizedSecondStart) ? fromMinutes(toMinutes(normalizedSecondStart) + firstDuration) : generatorTimes.secondEnd;
            const normalizedTimes = { ...generatorTimes, secondStart: normalizedSecondStart, secondEnd: normalizedSecondEnd };
            setGeneratorTimes(normalizedTimes);
            const { data } = await api.post('/exams/schedule/generate', { examId: scheduleExamFilter, startDate: generatorStartDate || undefined, ...normalizedTimes, replaceExisting: true });
            setExamSchedules(data.data || []);
            setScheduleClassFilter('');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Jadwalka otomaatiga ah lama samayn karin');
        } finally {
            setScheduleGenerating(false);
        }
    };

    const isStaff = user && ['school-admin', 'teacher', 'receptionist'].includes(user.role);
    const isActualAdmin = user && user.role === 'school-admin';
    const isAdmin = isStaff;
    const visibleSchedules = examSchedules.filter((row: any) =>
        (!scheduleExamFilter || (row.exam?._id || row.exam?.id) === scheduleExamFilter) &&
        (!scheduleClassFilter || (row.class?._id || row.class?.id) === scheduleClassFilter)
    );
    const combinedScheduleRows = Object.values(visibleSchedules.reduce((groups: Record<string, any[]>, row: any) => {
        const key = String(row.date).slice(0, 10);
        const subjectId = row.subject?._id || row.subject?.id;
        groups[key] ||= [];
        if (!groups[key].some(item => (item.subject?._id || item.subject?.id) === subjectId)) groups[key].push(row);
        groups[key].sort((a, b) => a.startTime.localeCompare(b.startTime));
        return groups;
    }, {})).sort((a: any, b: any) => String(a[0].date).localeCompare(String(b[0].date))) as any[][];
    const displayedExam = exams.find((exam: any) => exam._id === scheduleExamFilter) || visibleSchedules[0]?.exam;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {isAdmin ? 'Examinations & Grading' : 'My Academic Results'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isAdmin ? 'Manage terms, board schedules, and academic performance.' : 'View your performance history and exam schedules.'}
                    </p>
                </div>
                {isStaff && (
                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner flex-wrap gap-1 w-full lg:w-auto">
                        <button onClick={() => setView('board')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'board' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Board</button>
                        <button onClick={() => setView('schedule')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'schedule' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Jadwalka</button>
                        <button onClick={() => setView('grades')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'grades' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Grades</button>
                        <button onClick={() => setView('entry-status')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'entry-status' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Entry Status</button>
                        {isActualAdmin && <button onClick={() => setView('grade-config')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'grade-config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Grading</button>}
                        <button onClick={() => setView('clearance')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'clearance' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Clearance</button>
                        <button onClick={() => setView('complaints')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'complaints' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Complaints</button>
                    </div>
                )}
                {!isAdmin && ['student', 'parent'].includes(user?.role) && (
                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner w-full lg:w-auto">
                        <button onClick={() => setView('my-results')} className={`flex-1 lg:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'my-results' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Results</button>
                        <button onClick={() => setView('schedule')} className={`flex-1 lg:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'schedule' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Jadwalka</button>
                        {user?.role === 'student' && <button onClick={() => setView('complaints')} className={`flex-1 lg:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'complaints' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Complaints</button>}
                    </div>
                )}
            </div>

            {view === 'schedule' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <style jsx global>{`
                        @media print {
                            body * { visibility: hidden !important; }
                            #exam-schedule-poster, #exam-schedule-poster * { visibility: visible !important; }
                            #exam-schedule-poster { position: absolute; inset: 0; width: 100%; min-height: 100vh; }
                            @page { size: A4 landscape; margin: 0; }
                        }
                    `}</style>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div><h2 className="text-3xl font-black text-white">Jadwalka Imtixaannada</h2><p className="text-sm text-slate-400 mt-1">Maalmaha, saacadaha, qolalka iyo ilaaliyeyaasha imtixaanka.</p></div>
                        <button onClick={refreshExamSchedules} className="px-5 py-3 rounded-2xl bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10">Cusboonaysii</button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                        <select value={scheduleExamFilter} onChange={e => { const examId = e.target.value; const selected = exams.find((exam:any) => exam._id === examId); setScheduleExamFilter(examId); setScheduleClassFilter(''); setGeneratorStartDate(selected?.startDate ? String(selected.startDate).slice(0, 10) : ''); }} className="flex-1 px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white"><option value="">Dooro imtixaanka</option>{exams.map((x:any) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
                        <button onClick={() => window.print()} className="px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black">Daabac Jadwalka</button>
                        {isActualAdmin && scheduleExamFilter && <button onClick={handleDeleteFullSchedule} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black">Tirtir Jadwalka</button>}
                    </div>

                    {isActualAdmin && scheduleExamFilter && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-[2rem] border border-cyan-500/20 bg-cyan-950/20 p-5 print:hidden">
                            <label className="col-span-2 md:col-span-4 text-xs font-bold text-slate-400">Taariikhda bilowga jadwalka<input required type="date" value={generatorStartDate} onChange={e => setGeneratorStartDate(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
                            <label className="text-xs font-bold text-slate-400">Bilowga 1aad<input type="time" value={generatorTimes.firstStart} onChange={e => setGeneratorTimes({ ...generatorTimes, firstStart: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
                            <label className="text-xs font-bold text-slate-400">Dhammaadka 1aad<input type="time" value={generatorTimes.firstEnd} onChange={e => setGeneratorTimes({ ...generatorTimes, firstEnd: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
                            <label className="text-xs font-bold text-slate-400">Bilowga 2aad<input type="time" value={generatorTimes.secondStart} onChange={e => setGeneratorTimes({ ...generatorTimes, secondStart: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
                            <label className="text-xs font-bold text-slate-400">Dhammaadka 2aad<input type="time" value={generatorTimes.secondEnd} onChange={e => setGeneratorTimes({ ...generatorTimes, secondEnd: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-white" /></label>
                            <button onClick={handleGenerateSchedule} disabled={scheduleGenerating} className="col-span-2 md:col-span-4 rounded-2xl bg-cyan-600 py-4 font-black text-white hover:bg-cyan-500 disabled:opacity-50">{scheduleGenerating ? 'Jadwalka ayaa la samaynayaa...' : '⚡ Soo qaado dhammaan fasallada iyo maaddooyinka'}</button>
                            <p className="col-span-2 md:col-span-4 text-center text-xs text-cyan-200/70">Laba maaddo maalintii • Jimcaha waa laga boodayaa • Dhammaan fasalladu hal jadwal ayay ku wada jiraan</p>
                        </div>
                    )}

                    <div className="space-y-8 overflow-x-auto rounded-[2.5rem]" id="exam-schedule-poster">
                        {combinedScheduleRows.length > 0 && <section className="min-w-[850px] bg-gradient-to-b from-sky-200 via-sky-400 to-blue-700 px-14 py-10 text-white print:min-w-0 print:rounded-none print:p-10">
                            <div className="mx-auto max-w-[820px] rounded-[2.5rem] bg-gradient-to-b from-blue-600/95 via-sky-500/90 to-sky-200/90 px-8 py-10 sm:px-12 sm:py-12 shadow-2xl">
                                <div className="text-center">
                                    {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="Astaanta dugsiga" className="mx-auto mb-6 h-28 w-28 rounded-lg bg-white object-contain p-2 shadow-xl" /> : <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 text-4xl font-black">{(tenant?.schoolName || tenant?.name || 'S').charAt(0)}</div>}
                                    <h2 className="text-3xl sm:text-4xl font-black uppercase leading-tight tracking-tight">Jadwalka<br />{displayedExam?.name || 'Imtixaannada'}</h2>
                                    <p className="mt-3 text-lg font-bold uppercase text-white/90">
                                        {displayedExam?.startDate ? `${new Date(displayedExam.startDate).getFullYear()}-${new Date(displayedExam.endDate).getFullYear()}` : 'Sannad Dugsiyeedka'}
                                    </p>
                                </div>

                                <div className="mt-12 overflow-hidden shadow-xl">
                                    <table className="w-full table-fixed border-collapse text-[11px] sm:text-sm">
                                        <thead className="bg-blue-950/85 text-[10px] sm:text-xs uppercase tracking-wider"><tr><th className="w-[6%] border border-white/15 p-3">TT</th><th className="w-[21%] border border-white/15 p-3">Taariikhda</th><th className="w-[18%] border border-white/15 p-3">Maaddada 1aad</th><th className="w-[14%] border border-white/15 p-3">Waqtiga</th><th className="w-[11%] border border-white/15 p-3">Dhex Taal</th><th className="w-[18%] border border-white/15 p-3">Maaddada 2aad</th><th className="w-[14%] border border-white/15 p-3">Waqtiga</th></tr></thead>
                                        <tbody>
                                            {combinedScheduleRows.map((slots, index) => {
                                                const first = slots[0]; const second = slots[1];
                                                const breakTime = second ? `${first.endTime}-${second.startTime}` : '—';
                                                return <tr key={String(first.date)} className={index % 2 ? 'bg-blue-200/80 text-blue-950' : 'bg-sky-100/90 text-blue-950'}>
                                                    <td className="border border-white/30 p-3 text-center font-bold">{index + 1}</td>
                                                    <td className="border border-white/30 p-3 text-center font-bold">{new Intl.DateTimeFormat('so-SO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(first.date))}</td>
                                                    <td className="border border-white/30 p-3 font-bold">{first.subject?.name}{isActualAdmin && <span className="mt-1 flex gap-3 print:hidden"><button onClick={() => openScheduleEditor(first)} className="text-[9px] text-blue-700">Edit</button><button onClick={() => handleDeleteSchedule(first._id || first.id)} className="text-[9px] text-red-700">Tirtir</button></span>}</td>
                                                    <td className="border border-white/30 p-3 text-center font-bold">{first.startTime}-{first.endTime}</td>
                                                    <td className="border border-white/30 p-3 text-center font-bold">{breakTime}</td>
                                                    <td className="border border-white/30 p-3 font-bold">{second?.subject?.name || '—'}{isActualAdmin && second && <span className="mt-1 flex gap-3 print:hidden"><button onClick={() => openScheduleEditor(second)} className="text-[9px] text-blue-700">Edit</button><button onClick={() => handleDeleteSchedule(second._id || second.id)} className="text-[9px] text-red-700">Tirtir</button></span>}</td>
                                                    <td className="border border-white/30 p-3 text-center font-bold">{second ? `${second.startTime}-${second.endTime}` : '—'}</td>
                                                </tr>;
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-12 text-center"><p className="text-xl font-black">{tenant?.schoolName || tenant?.name || 'Maamulka Dugsiga'}</p><p className="mt-1 text-sm font-bold text-white/80">Waxbarasho tayo leh iyo mustaqbal ifaya</p></div>
                            </div>
                        </section>}
                        {!scheduleLoading && combinedScheduleRows.length === 0 && <div className="min-w-[850px] bg-sky-100 p-20 text-center font-bold text-blue-950">Dooro imtixaan, kadibna riix “Soo qaado dhammaan fasallada iyo maaddooyinka”.</div>}
                        {scheduleLoading && <div className="min-w-[850px] bg-sky-100 p-20 text-center font-bold text-blue-950 animate-pulse">Jadwalka ayaa soo raraya...</div>}
                    </div>

                    {isActualAdmin && (
                        <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] print:hidden">
                            <h3 className="lg:col-span-4 text-xl font-black text-white">Ku dar jadwal gaar ah</h3>
                            <select required value={scheduleForm.examId} onChange={e => setScheduleForm({ ...scheduleForm, examId: e.target.value })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white"><option value="">Dooro imtixaanka</option>{exams.map((x:any) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
                            <select required value={scheduleForm.classId} onChange={e => setScheduleForm({ ...scheduleForm, classId: e.target.value })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white"><option value="">Dooro fasalka</option>{classes.map((x:any) => <option key={x._id} value={x._id}>{x.name} - {x.section}</option>)}</select>
                            <select required value={scheduleForm.subjectId} onChange={e => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white"><option value="">Dooro maaddada</option>{subjects.map((x:any) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
                            <input required type="date" title="Taariikhda" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white" />
                            <label className="text-xs font-bold text-slate-400">Waqtiga bilowga<input required type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} className="mt-2 w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white" /></label>
                            <label className="text-xs font-bold text-slate-400">Waqtiga dhammaadka<input required type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} className="mt-2 w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white" /></label>
                            <input placeholder="Qolka (tusaale A-12)" value={scheduleForm.room} onChange={e => setScheduleForm({ ...scheduleForm, room: e.target.value })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white" />
                            <select multiple value={scheduleForm.invigilators} onChange={e => setScheduleForm({ ...scheduleForm, invigilators: Array.from(e.target.selectedOptions, o => o.value) })} className="px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white min-h-24"><option disabled value="">Ilaaliyeyaasha (Ctrl si badan)</option>{teachers.map((x:any) => <option key={x._id} value={x._id}>{x.firstName} {x.lastName}</option>)}</select>
                            <button disabled={scheduleSaving} className="lg:col-span-4 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black">{scheduleSaving ? 'Kaydinaya...' : '+ Ku dar jadwalka'}</button>
                        </form>
                    )}

                    {editingSchedule && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm print:hidden">
                            <form onSubmit={handleUpdateSchedule} className="grid w-full max-w-2xl grid-cols-1 gap-4 rounded-[2.5rem] border border-white/10 bg-slate-900 p-8 sm:grid-cols-2">
                                <h3 className="sm:col-span-2 text-2xl font-black text-white">Wax ka beddel jadwalka</h3>
                                <select required value={editScheduleForm.subjectId} onChange={e => setEditScheduleForm({ ...editScheduleForm, subjectId: e.target.value })} className="sm:col-span-2 p-4 bg-slate-950 border border-white/10 rounded-2xl text-white">{subjects.map((x:any) => <option key={x._id} value={x._id}>{x.name}</option>)}</select>
                                <input required type="date" value={editScheduleForm.date} onChange={e => setEditScheduleForm({ ...editScheduleForm, date: e.target.value })} className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" />
                                <div className="flex items-center rounded-2xl border border-cyan-500/20 bg-cyan-950/30 px-4 text-xs font-bold text-cyan-300">Isbeddelku dhammaan fasallada ayuu qabanayaa</div>
                                <label className="text-xs font-bold text-slate-400">Waqtiga bilowga<input required type="time" value={editScheduleForm.startTime} onChange={e => setEditScheduleForm({ ...editScheduleForm, startTime: e.target.value })} className="mt-2 w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" /></label>
                                <label className="text-xs font-bold text-slate-400">Waqtiga dhammaadka<input required type="time" value={editScheduleForm.endTime} onChange={e => setEditScheduleForm({ ...editScheduleForm, endTime: e.target.value })} className="mt-2 w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" /></label>
                                <button type="button" onClick={() => setEditingSchedule(null)} className="py-4 bg-slate-700 text-white rounded-2xl font-bold">Jooji</button>
                                <button className="py-4 bg-indigo-600 text-white rounded-2xl font-black">Update garee</button>
                            </form>
                        </div>
                    )}
                </div>
            ) : view === 'my-results' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl">📈</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Overall GPA</p>
                            <p className="text-4xl font-black text-white">
                                {studentMarks.length > 0 ? (studentMarks.reduce((acc: number, m: any) => acc + Number(m.gpa || 0), 0) / studentMarks.length).toFixed(2) : '0.00'}
                            </p>
                            <p className="text-[10px] text-indigo-400 font-bold mt-2 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Based on {studentMarks.length} subjects
                            </p>
                        </div>
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 md:col-span-2 flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-white">Full Report Card</h3>
                                <p className="text-slate-500 text-sm">Download your official academic transcript.</p>
                            </div>
                            <div className="flex gap-3">
                                {exams.filter(e => e.isApproved).map(exam => (
                                    <div key={exam._id} className="flex gap-2">
                                        <button onClick={() => fetchReport(exam._id, user._id)} className="px-6 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-400/20 rounded-2xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">View {exam.name}</button>
                                        <button onClick={() => downloadPDFReport(exam._id, user._id)} className="px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all">PDF</button>
                                    </div>
                                ))}
                                {exams.filter(e => e.isApproved).length === 0 && <span className="text-slate-500 text-xs italic">No finalized reports available yet.</span>}
                            </div>
                        </div>
                    </div>
                    <div className="glass-dark rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-6">Exam & Subject</th>
                                    <th className="px-8 py-6">Score Details</th>
                                    <th className="px-8 py-6">Performance Grade</th>
                                    <th className="px-8 py-6">Teacher Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {studentMarks.filter((m: any) => m.exam?.isApproved).map((m: any) => (
                                    <tr key={m._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{m.exam?.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">{m.subject?.name}</div>
                                        </td>
                                        <td className="px-8 py-5 text-indigo-400 font-black text-lg">{m.marksObtained} <span className="text-slate-600 text-[10px] font-medium">/ {m.maxMarks}</span></td>
                                        <td className="px-8 py-5">
                                            <span className={`px-4 py-1.5 rounded-xl font-black text-xs border ${m.grade === 'F' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'}`}>
                                                {m.grade || 'N/A'}{m.gpa !== null && m.gpa !== undefined ? ` / ${Number(m.gpa).toFixed(1)}` : ''}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-slate-400 italic text-xs leading-relaxed max-w-xs">{m.gradeRemarks || m.remarks || 'No specific remarks shared.'}</td>
                                    </tr>
                                ))}
                                {studentMarks.filter((m: any) => m.exam?.isApproved).length === 0 && (
                                    <tr><td colSpan={4} className="px-8 py-24 text-center text-slate-500">No published results found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : view === 'board' ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    {user?.role === 'school-admin' && (
                        <div className="flex justify-start sm:justify-end">
                            <button onClick={() => setIsExamModalOpen(true)} className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all">+ Initialize New Exam</button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {exams.map((exam: any) => (
                            <div key={exam._id} className="glass-dark p-8 rounded-[3rem] border border-white/5 relative group hover:border-white/10 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl text-indigo-400">📝</div>
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${exam.isApproved ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {exam.isApproved ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-white mb-1">{exam.name}</h3>
                                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-6">{exam.term.replace('_', ' ')}</p>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black uppercase">Starts</p><p className="text-xs font-bold text-slate-300">{new Date(exam.startDate).toLocaleDateString()}</p></div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black uppercase">Classes</p><p className="text-xs font-bold text-slate-300">{exam.classes?.length || 0}</p></div>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    <button onClick={() => { setSelectedExam(exam); setView('grades'); }} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Mark Entry</button>
                                    <button onClick={() => { setEntryStatusExam(exam); setView('entry-status'); }} className="flex-1 py-4 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Entry Status</button>
                                    {!exam.isApproved && user?.role === 'school-admin' && (
                                        <button onClick={() => handleApprove(exam._id)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">Finalize</button>
                                    )}
                                    {exam.isApproved && user?.role === 'school-admin' && (
                                        <button onClick={() => handleUnapprove(exam._id)} className="flex-1 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all">🔓 Unlock</button>
                                    )}
                                    <button onClick={() => fetchAnalytics(exam._id)} className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/10">Academic Analytics</button>
                                    <a href="/dashboard/combined-results" className="w-full py-4 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-violet-500/10 text-center">Combined Results</a>
                                    {user?.role === 'school-admin' && (
                                        <div className="w-full flex gap-2">
                                            <button
                                                onClick={() => openEditModal(exam)}
                                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                ✏️ Edit
                                            </button>
                                            {confirmDeleteId === exam._id ? (
                                                <div className="flex-1 flex gap-1">
                                                    <button
                                                        onClick={() => handleDeleteExam(exam._id)}
                                                        disabled={deletingExamId === exam._id}
                                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                    >
                                                        {deletingExamId === exam._id ? '...' : 'Sure?'}
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="flex-1 py-3 bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(exam._id)}
                                                    className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    🗑 Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : view === 'analytics' && analytics ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <button onClick={() => setView('board')} className="text-slate-500 hover:text-white transition-colors text-sm font-bold flex items-center gap-2">← Back to Board</button>
                        <h2 className="text-2xl font-black text-white">{selectedExam?.name} - Performance Analysis</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Students</p>
                            <p className="text-4xl font-black text-white">{analytics.totalStudents}</p>
                        </div>
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Pass Rate</p>
                            <p className="text-4xl font-black text-emerald-400">
                                {(analytics.subjectAnalytics.reduce((acc: number, s: any) => acc + Number(s.passRate), 0) / analytics.subjectAnalytics.length).toFixed(1)}%
                            </p>
                        </div>
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 md:col-span-2">
                            <Pie
                                data={{
                                    labels: ['Excellent (90%+)', 'Good (70-90%)', 'Average (50-70%)', 'Below Average (<50%)'],
                                    datasets: [{
                                        data: [
                                            analytics.performanceDistribution.excellent,
                                            analytics.performanceDistribution.good,
                                            analytics.performanceDistribution.average,
                                            analytics.performanceDistribution.belowAverage
                                        ],
                                        backgroundColor: ['#10b981', '#4f46e5', '#f59e0b', '#ef4444'],
                                        borderWidth: 0
                                    }]
                                }}
                                options={{
                                    plugins: { legend: { position: 'right', labels: { color: '#64748b', font: { weight: 'bold' } } } },
                                    maintainAspectRatio: false
                                }}
                                height={150}
                            />
                        </div>
                    </div>

                    <div className="glass-dark rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-6">Subject</th>
                                    <th className="px-8 py-6">Average Score</th>
                                    <th className="px-8 py-6">Highest / Lowest</th>
                                    <th className="px-8 py-6">Pass Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {analytics.subjectAnalytics.map((s: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-5 font-bold text-white uppercase tracking-tight">{s.subject}</td>
                                        <td className="px-8 py-5 text-indigo-400 font-black text-lg">{s.average}</td>
                                        <td className="px-8 py-5">
                                            <span className="text-emerald-400 font-bold">{s.highest}</span>
                                            <span className="text-slate-700 mx-2">/</span>
                                            <span className="text-red-400 font-bold">{s.lowest}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden w-24">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.passRate}%` }} />
                                                </div>
                                                <span className="text-xs font-black text-slate-300">{s.passRate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : view === 'grade-config' ? (
                <div className="glass-dark p-10 rounded-[3rem] border border-white/5 space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-white">Grading System</h2>
                            <p className="text-slate-500 text-sm">Define percentage brackets and GPA calculations.</p>
                        </div>
                        <button onClick={handleSaveGradeConfig} disabled={isConfigSaving} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Update Config</button>
                    </div>
                    <div className="space-y-4">
                        {gradeSystem?.grades?.map((g: any, i: number) => (
                            <div key={i} className="grid grid-cols-5 gap-4 items-center bg-slate-950/40 p-4 rounded-3xl border border-white/5">
                                <input value={g.grade} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].grade = e.target.value; setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-white font-black text-center focus:outline-none uppercase" />
                                <input type="number" value={g.minPercentage} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].minPercentage = Number(e.target.value); setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-indigo-400 font-bold text-center focus:outline-none" />
                                <input type="number" value={g.maxPercentage} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].maxPercentage = Number(e.target.value); setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-indigo-400 font-bold text-center focus:outline-none" />
                                <input type="number" step="0.1" value={g.gpa} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].gpa = Number(e.target.value); setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-emerald-400 font-bold text-center focus:outline-none" />
                                <input value={g.remarks || ''} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].remarks = e.target.value; setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-800" placeholder="Default remark..." />
                            </div>
                        ))}
                    </div>
                </div>
            ) : view === 'complaints' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-3xl font-black text-white">Academic Complaints</h2>
                        {user?.role === 'student' && <button onClick={() => setIsComplaintModalOpen(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20">+ Report Discrepancy</button>}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {complaints.length > 0 ? complaints.map(c => (
                            <div key={c._id} className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 text-lg">⚠️</div>
                                        <div>
                                            <p className="text-indigo-400 text-[10px] font-black">{c.exam?.name} • {c.subject?.name}</p>
                                            <p className="text-[10px] text-slate-500">Ticket ID: {c._id.slice(-6).toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${c.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-400'}`}>{c.status}</span>
                                </div>
                                <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-6 italic text-slate-300 text-sm leading-relaxed">"{c.reason}"</div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">{c.student?.firstName.charAt(0)}{c.student?.lastName.charAt(0)}</div>
                                        <p className="text-xs text-slate-400 font-bold">{c.student?.firstName} {c.student?.lastName}</p>
                                    </div>
                                    <div className="text-right"><p className="text-[9px] text-slate-500 font-blackUppercase">Grade</p><p className="text-lg font-black text-white">{c.currentMark}</p></div>
                                </div>
                            </div>
                        )) : <div className="col-span-full py-24 text-center opacity-40">No complaints reported.</div>}
                    </div>
                </div>
            ) : view === 'entry-status' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white">Marks Entry Status</h2>
                            <p className="text-slate-400 text-sm mt-1">Arag inta maado oo marks la xareeyey iyo inta dhiman.</p>
                        </div>
                        <select
                            value={entryStatusExam?._id || entryStatusExam?.id || ''}
                            onChange={(e) => setEntryStatusExam(exams.find((ex: any) => (ex._id || ex.id) === e.target.value) || null)}
                            className="w-full sm:w-72 px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm"
                        >
                            <option value="">Dooro Imtixaanka...</option>
                            {exams.map((ex: any) => (
                                <option key={ex._id || ex.id} value={ex._id || ex.id}>{ex.name} — {ex.term?.replace?.('_', ' ') || ex.term}</option>
                            ))}
                        </select>
                    </div>

                    {!entryStatusExam ? (
                        <div className="glass-dark p-16 rounded-[3rem] text-center text-slate-500">Dooro imtixaan si aad u aragto horumarka maadooyinka.</div>
                    ) : entryStatusLoading ? (
                        <div className="glass-dark p-16 rounded-[3rem] text-center text-slate-400 animate-pulse">Xogta ayaa soo raraya...</div>
                    ) : entryStatusRows.length === 0 ? (
                        <div className="glass-dark p-16 rounded-[3rem] text-center text-slate-500">Fasalo lama helin imtixaanakan.</div>
                    ) : (
                        <>
                            {(() => {
                                const totalDone = entryStatusRows.reduce((a, r) => a + r.done, 0);
                                const totalPartial = entryStatusRows.reduce((a, r) => a + r.partial, 0);
                                const totalPending = entryStatusRows.reduce((a, r) => a + r.pending, 0);
                                const totalSubjects = entryStatusRows.reduce((a, r) => a + r.totalSubjects, 0);
                                const pct = totalSubjects ? Math.round((totalDone / totalSubjects) * 100) : 0;
                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="glass-dark p-6 rounded-[2rem] border border-white/5">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Done</p>
                                            <p className="text-3xl font-black text-emerald-400 mt-1">{totalDone}</p>
                                        </div>
                                        <div className="glass-dark p-6 rounded-[2rem] border border-white/5">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Partial</p>
                                            <p className="text-3xl font-black text-amber-400 mt-1">{totalPartial}</p>
                                        </div>
                                        <div className="glass-dark p-6 rounded-[2rem] border border-white/5">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Remaining</p>
                                            <p className="text-3xl font-black text-slate-300 mt-1">{totalPending}</p>
                                        </div>
                                        <div className="glass-dark p-6 rounded-[2rem] border border-white/5">
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Overall</p>
                                            <p className="text-3xl font-black text-indigo-400 mt-1">{pct}%</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{totalDone}/{totalSubjects} subjects</p>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-6">
                                {entryStatusRows.map((row: any) => (
                                    <div key={row.classId} className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden">
                                        <div className="px-6 sm:px-8 py-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-black text-white">{row.className}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">{row.studentTotal} students · {row.done} done · {row.partial} partial · {row.pending} remaining</p>
                                            </div>
                                            <div className="w-40 h-2 rounded-full bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500"
                                                    style={{ width: `${row.totalSubjects ? Math.round((row.done / row.totalSubjects) * 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                        {row.subjects.length === 0 ? (
                                            <p className="px-8 py-8 text-sm text-slate-500">Maadooyin lama qoondein fasalkan.</p>
                                        ) : (
                                            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {row.subjects.map((sub: any) => (
                                                    <div
                                                        key={sub.id}
                                                        className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-sm ${
                                                            sub.complete
                                                                ? 'border-emerald-500/20 bg-emerald-500/10'
                                                                : sub.partial
                                                                    ? 'border-amber-500/20 bg-amber-500/10'
                                                                    : 'border-white/5 bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-white truncate">{sub.name}</p>
                                                            <p className="text-[11px] text-slate-400">{sub.entered}/{sub.studentTotal} marks</p>
                                                        </div>
                                                        <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                            sub.complete ? 'text-emerald-400' : sub.partial ? 'text-amber-400' : 'text-slate-500'
                                                        }`}>
                                                            {sub.complete ? 'Done' : sub.partial ? 'Partial' : 'Pending'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : view === 'clearance' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-black text-white">Exam Fee Clearance</h2>
                            <p className="text-slate-400 text-sm mt-1">Hubi in ardeyga uu bixiyay dhammaan lacagaha si uu imtixaanka u galo.</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-4 sm:p-6 rounded-[2.5rem] border border-white/5 items-end">
                        <select 
                            value={clearanceClass?._id || ''} 
                            onChange={(e) => setClearanceClass(classes.find((cl: any) => cl._id === e.target.value))} 
                            className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm"
                        >
                            <option value="">Dooro Fasalka (Class)...</option>
                            {classes.map((cl: any) => <option key={cl._id} value={cl._id}>{cl.name} - {cl.section}</option>)}
                        </select>
                        <select 
                            value={clearanceSelectedStudent?._id || ''} 
                            onChange={(e) => {
                                const student = clearanceStudents.find((s: any) => s._id === e.target.value);
                                setClearanceSelectedStudent(student);
                                if (student) checkClearance(student._id);
                            }} 
                            disabled={!clearanceClass}
                            className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm disabled:opacity-50"
                        >
                            <option value="">Dooro Ardeyga (Student)...</option>
                            {clearanceStudents.map((s: any) => <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>)}
                        </select>
                    </div>

                    {isCheckingClearance ? (
                        <div className="glass-dark p-12 rounded-[3.5rem] text-center">
                            <h3 className="text-xl font-bold text-slate-400 animate-pulse">Hubinayaa xogta lacagbixinta...</h3>
                        </div>
                    ) : clearanceData && clearanceSelectedStudent ? (
                        <div className={`glass-dark p-8 sm:p-12 rounded-[3.5rem] border ${clearanceData.totalOwed > 0 ? 'border-red-500/30 bg-red-950/10' : 'border-emerald-500/30 bg-emerald-950/10'} text-center space-y-6 transition-all`}>
                            {clearanceData.totalOwed > 0 ? (
                                <>
                                    <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-red-500/20">⚠️</div>
                                    <h3 className="text-3xl font-black text-white">Lacagaha Iska Xalli</h3>
                                    <p className="text-slate-300 text-lg">Ardeygaan lacag ayaa lagu leeyahay. Fadlan ha iska bixiyo lacagaha hoos ku xusan ka hor inta uusan galin imtixaanka.</p>
                                    <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-3xl p-8 mt-6">
                                        <p className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2">Wadarta Lagu Leeyahay</p>
                                        <p className="text-5xl font-black text-red-500">${clearanceData.totalOwed.toFixed(2)}</p>
                                    </div>
                                    {clearanceData.unpaidInvoices.length > 0 && (
                                        <div className="mt-8 text-left max-w-2xl mx-auto space-y-3 bg-slate-950/50 p-6 rounded-[2rem] border border-white/5">
                                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 px-2">Faahfaahinta Qaansheegta (Invoices)</h4>
                                            {clearanceData.unpaidInvoices.map((inv: any) => (
                                                <div key={inv._id} className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                    <div>
                                                        <p className="text-white font-bold">{inv.invoiceNumber}</p>
                                                        <p className="text-xs text-slate-400 mt-1">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-red-400 font-black text-lg">${(inv.totalAmount - inv.paidAmount).toFixed(2)}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{inv.status.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/20">✅</div>
                                    <h3 className="text-3xl font-black text-white">U Fasaxan Imtixaanka</h3>
                                    <p className="text-emerald-400 text-lg">Ardeygan wax lacag ah laguma laha. Waa u fasaxan yahay inuu imtixaanka galo.</p>
                                </>
                            )}
                        </div>
                    ) : clearanceClass && !clearanceSelectedStudent ? (
                        <div className="glass-dark p-12 rounded-[3.5rem] text-center text-slate-500 font-medium">
                            Fadlan dooro ardeyga si aad u hubiso lacagaha laga rabo.
                        </div>
                    ) : null}
                </div>
            ) : (
                /* Grades Marking Entry View */
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-900/40 p-4 sm:p-6 rounded-[2.5rem] border border-white/5 items-end">
                        <select value={selectedExam?._id || ''} onChange={(e) => setSelectedExam(exams.find((ex: any) => ex._id === e.target.value))} className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm"><option value="">Select Exam...</option>{exams.map((ex: any) => <option key={ex._id} value={ex._id}>{ex.name}</option>)}</select>
                        <select value={selectedClass?._id || ''} onChange={(e) => setSelectedClass(classes.find((cl: any) => cl._id === e.target.value))} className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm"><option value="">Select Class...</option>{classes.map((cl: any) => <option key={cl._id} value={cl._id}>{cl.name} - {cl.section}</option>)}</select>
                        <select value={selectedSubject?._id || ''} onChange={(e) => setSelectedSubject(subjects.find((sub: any) => sub._id === e.target.value))} className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm"><option value="">Select Subject...</option>{subjects.map((sub: any) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}</select>
                        <input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white text-sm text-center" placeholder="Max" />
                        <button onClick={exportMatrix} className="w-full px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Excel Matrix</button>
                    </div>

                    {!selectedExam || !selectedClass || !selectedSubject ? (
                        <div className="glass-dark p-6 sm:p-24 rounded-[3.5rem] text-center"><h3 className="text-xl sm:text-2xl font-black text-white mt-6">Select Exam, Class & Subject to begin.</h3></div>
                    ) : (
                        <div className="glass-dark rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                    <tr><th className="px-10 py-6">Student</th><th className="px-10 py-6">Score</th><th className="px-10 py-6">Stored Grade</th><th className="px-10 py-6">Grade Remarks</th><th className="px-10 py-6">Teacher Remarks</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {students.map((s: any) => (
                                        <tr key={s._id} className="hover:bg-white/5">
                                            <td className="px-10 py-6 font-bold text-white">{s.firstName} {s.lastName}</td>
                                            <td className="px-10 py-6">
                                                <input
                                                    type="number"
                                                    value={marksData[s._id]?.score || ''}
                                                    onChange={(e) => setMarksData({ ...marksData, [s._id]: { ...marksData[s._id], score: e.target.value, grade: null, gpa: null, gradeRemarks: null, isDirty: true } })}
                                                    className="w-24 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none text-center font-black"
                                                />
                                            </td>
                                            <td className="px-10 py-6">
                                                {marksData[s._id]?.score !== '' && (
                                                    <span className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl font-black">
                                                        {marksData[s._id]?.isDirty ? 'Pending save' : marksData[s._id]?.grade || 'N/A'}
                                                        {!marksData[s._id]?.isDirty && marksData[s._id]?.gpa !== null && marksData[s._id]?.gpa !== undefined ? ` / ${Number(marksData[s._id].gpa).toFixed(1)}` : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-10 py-6 text-xs text-slate-400 italic">{marksData[s._id]?.isDirty ? 'Recalculated by backend after save' : marksData[s._id]?.gradeRemarks || 'No stored grade remarks yet'}</td>
                                            <td className="px-10 py-6"><input value={marksData[s._id]?.remarks || ''} onChange={(e) => setMarksData({ ...marksData, [s._id]: { ...marksData[s._id], remarks: e.target.value } })} className="w-full bg-transparent border-b border-white/5 text-slate-500 outline-none italic" placeholder="Feedback..." /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {students.length > 0 && (
                                <div className="p-10 bg-slate-950/50 flex justify-end border-t border-white/5">
                                    <button onClick={handleSaveMarks} disabled={saving} className="px-12 py-5 bg-indigo-600 text-white rounded-[2rem] font-black shadow-lg">
                                        {saving ? 'Saving...' : 'Finalize Gradebook'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {isExamModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                    <form onSubmit={handleCreateExam} className="bg-slate-900 w-full max-w-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-6 my-8">
                        <h2 className="text-xl sm:text-2xl font-bold">New Exam</h2>
                        <input placeholder="Exam Name" className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} required />
                        <select className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.term} onChange={e => setExamForm({ ...examForm, term: e.target.value })}><option value="First_Term">First Term</option><option value="Mid_Term">Mid Term</option><option value="Final_Term">Final Term</option></select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.startDate} onChange={e => setExamForm({ ...examForm, startDate: e.target.value })} />
                            <input type="date" className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.endDate} onChange={e => setExamForm({ ...examForm, endDate: e.target.value })} />
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar p-2 bg-slate-950 border border-white/10 rounded-2xl">
                            <p className="text-xs text-slate-400 font-bold px-2">Select Classes</p>
                            {classes.map((cl: any) => (
                                <label key={cl._id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={examForm.classes.includes(cl._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setExamForm({ ...examForm, classes: [...examForm.classes, cl._id] });
                                            } else {
                                                setExamForm({ ...examForm, classes: examForm.classes.filter(id => id !== cl._id) });
                                            }
                                        }}
                                        className="rounded border-white/10 bg-slate-900 text-indigo-500"
                                    />
                                    <span className="text-sm text-white">{cl.name} - {cl.section}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-4"><button type="button" onClick={() => setIsExamModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold">Cancel</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Create</button></div>
                    </form>
                </div>
            )}

            {/* Edit Exam Modal */}
            {isEditModalOpen && editingExam && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                    <form onSubmit={handleEditExam} className="bg-slate-900 w-full max-w-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 space-y-6 my-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Exam</h2>
                        <input
                            placeholder="Exam Name"
                            className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            required
                        />
                        <select
                            className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white"
                            value={editForm.term}
                            onChange={e => setEditForm({ ...editForm, term: e.target.value })}
                        >
                            <option value="First_Term">First Term</option>
                            <option value="Mid_Term">Mid Term</option>
                            <option value="Final_Term">Final Term</option>
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1 block">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white"
                                    value={editForm.startDate}
                                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wide mb-1 block">End Date</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white"
                                    value={editForm.endDate}
                                    onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-white/10 rounded-2xl">
                            <p className="text-xs text-slate-400 font-bold px-2">Classes</p>
                            {classes.map((cl: any) => (
                                <label key={cl._id} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editForm.classes.includes(cl._id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setEditForm({ ...editForm, classes: [...editForm.classes, cl._id] });
                                            } else {
                                                setEditForm({ ...editForm, classes: editForm.classes.filter(id => id !== cl._id) });
                                            }
                                        }}
                                        className="rounded border-white/10 bg-slate-900 text-indigo-500"
                                    />
                                    <span className="text-sm text-white">{cl.name} - {cl.section}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => { setIsEditModalOpen(false); setEditingExam(null); }}
                                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isEditSaving}
                                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold disabled:opacity-50"
                            >
                                {isEditSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isReportOpen && reportData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-4xl p-6 sm:p-12 rounded-3xl relative my-8 shadow-2xl">
                        <div className="flex flex-col sm:row sm:absolute top-8 right-8 gap-4 mb-8 sm:mb-0">
                            <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold">Print</button>
                            <button onClick={() => setIsReportOpen(false)} className="px-6 py-3 bg-slate-800 text-white rounded-full font-bold">Close</button>
                        </div>
                        <div className="text-center border-b pb-8 mb-8"><h1 className="text-3xl font-black uppercase text-slate-900">{tenant?.schoolName}</h1><p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Official Academic Registry</p></div>
                        <div className="grid grid-cols-2 gap-12 mb-10">
                            <div><p className="text-[10px] font-black uppercase text-slate-400">Student</p><p className="text-xl font-black">{reportData.student?.firstName} {reportData.student?.lastName}</p></div>
                            <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">Exam</p><p className="text-xl font-black">{reportData.exam?.name}</p></div>
                        </div>
                        <table className="w-full mb-10 border-collapse">
                            <thead className="bg-slate-900 text-white"><tr className="text-left text-xs uppercase tracking-widest font-black"><th className="p-4">Subject</th><th className="p-4 text-center">Marks</th><th className="p-4 text-center">Grade</th></tr></thead>
                            <tbody className="divide-y divide-slate-100 italic text-sm">
                                {reportData.marks.map((m: any) => (
                                    <tr key={m._id}><td className="p-4 font-bold">{m.subject?.name}</td><td className="p-4 text-center">{m.marksObtained}/{m.maxMarks}</td><td className="p-4 text-center font-black text-indigo-600">{m.grade}</td></tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="grid grid-cols-3 gap-6 bg-slate-50 p-8 rounded-3xl">
                            <div className="text-center"><p className="text-xs font-black uppercase text-slate-400">Percentage</p><p className="text-2xl font-black">{reportData.summary.percentage.toFixed(1)}%</p></div>
                            <div className="text-center"><p className="text-xs font-black uppercase text-slate-400">GPA</p><p className="text-2xl font-black">{reportData.summary.gpa.toFixed(2)}</p></div>
                            <div className="text-center"><p className="text-xs font-black uppercase text-slate-400">Grade</p><p className="text-2xl font-black text-indigo-700">{reportData.summary.grade}</p></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
