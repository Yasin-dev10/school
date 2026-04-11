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
    const [view, setView] = useState('board'); // 'board', 'grades', 'grade-config', 'complaints', 'my-results', 'analytics'
    const [maxMarks, setMaxMarks] = useState('100');
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Board State
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [examForm, setExamForm] = useState({ name: '', term: 'First Term', startDate: '', endDate: '', classes: [] });

    // Grades State
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState<any>({}); // { studentId: { score, remarks } }
    const [studentMarks, setStudentMarks] = useState([]); // For student view
    const [saving, setSaving] = useState(false);

    // Grade Configuration State
    const [gradeSystem, setGradeSystem] = useState<any>(null);
    const [isConfigSaving, setIsConfigSaving] = useState(false);

    // Complaints State
    const [complaints, setComplaints] = useState<any[]>([]);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [complaintForm, setComplaintForm] = useState({ examId: '', subjectId: '', currentMark: 0, reason: '' });

    // Report Card State
    const [reportData, setReportData] = useState<any>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);

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

                const [exRes, clRes, subRes, tenRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes'),
                    api.get(subjectQuery),
                    api.get('/tenants/me')
                ]);
                setExams(exRes.data.data);
                setClasses(clRes.data.data);
                setSubjects(subRes.data.data);
                setTenant(tenRes.data.data);
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

    // When filters change for grades view (Admin/Teacher)
    useEffect(() => {
        if (view !== 'grades' || !selectedExam || !selectedClass || !selectedSubject) return;

        const fetchMarksAndStudents = async () => {
            setLoading(true);
            try {
                const { data: stuRes } = await api.get(`/students?class=${selectedClass._id}`);
                const classStudents = stuRes.data;
                setStudents(classStudents);

                const { data: markRes } = await api.get(`/exams/marks?examId=${selectedExam._id}&subjectId=${selectedSubject._id}&classId=${selectedClass._id}`);

                const existing: any = {};
                classStudents.forEach((s: any) => {
                    existing[s._id] = { score: '', remarks: '' };
                });
                markRes.data.forEach((m: any) => {
                    if (existing[m.student?._id]) {
                        existing[m.student._id] = { score: m.marksObtained, remarks: m.remarks || '' };
                    }
                });
                setMarksData(existing);
            } catch (err) {
                console.error("Marks/Students fetch failed");
            } finally {
                setLoading(false);
            }
        };
        fetchMarksAndStudents();
    }, [view, selectedExam, selectedClass, selectedSubject]);

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
            await api.put('/exams/grade-system', gradeSystem);
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

    const isStaff = user && ['school-admin', 'teacher', 'receptionist'].includes(user.role);
    const isActualAdmin = user && user.role === 'school-admin';
    const isAdmin = isStaff;

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
                        <button onClick={() => setView('grades')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'grades' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Grades</button>
                        {isActualAdmin && <button onClick={() => setView('grade-config')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'grade-config' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Grading</button>}
                        <button onClick={() => setView('complaints')} className={`flex-1 lg:flex-none px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${view === 'complaints' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Complaints</button>
                    </div>
                )}
                {!isAdmin && user?.role === 'student' && (
                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner w-full lg:w-auto">
                        <button onClick={() => setView('my-results')} className={`flex-1 lg:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'my-results' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Results</button>
                        <button onClick={() => setView('complaints')} className={`flex-1 lg:flex-none px-6 py-2 rounded-xl text-xs font-bold transition-all ${view === 'complaints' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Complaints</button>
                    </div>
                )}
            </div>

            {view === 'my-results' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl">📈</span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Overall GPA</p>
                            <p className="text-4xl font-black text-white">
                                {studentMarks.length > 0 ? (studentMarks.reduce((acc: number, m: any) => acc + (m.marksObtained / m.maxMarks * 4), 0) / studentMarks.length).toFixed(2) : '0.00'}
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
                                            <span className={`px-4 py-1.5 rounded-xl font-black text-xs border ${((m.marksObtained / m.maxMarks) * 100) >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10'}`}>
                                                {((m.marksObtained / m.maxMarks) * 100) >= 90 ? 'A+' : ((m.marksObtained / m.maxMarks) * 100) >= 80 ? 'A' : ((m.marksObtained / m.maxMarks) * 100) >= 70 ? 'B' : 'F'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-slate-400 italic text-xs leading-relaxed max-w-xs">{m.remarks || 'No specific remarks shared.'}</td>
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
                                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-6">{exam.term}</p>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black uppercase">Starts</p><p className="text-xs font-bold text-slate-300">{new Date(exam.startDate).toLocaleDateString()}</p></div>
                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 font-black uppercase">Classes</p><p className="text-xs font-bold text-slate-300">{exam.classes?.length || 0}</p></div>
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    <button onClick={() => { setSelectedExam(exam); setView('grades'); }} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Mark Entry</button>
                                    {!exam.isApproved && user?.role === 'school-admin' && (
                                        <button onClick={() => handleApprove(exam._id)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">Finalize</button>
                                    )}
                                    {exam.isApproved && user?.role === 'school-admin' && (
                                        <button onClick={() => handleUnapprove(exam._id)} className="flex-1 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all">🔓 Unlock</button>
                                    )}
                                    <button onClick={() => fetchAnalytics(exam._id)} className="w-full py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/10">Academic Analytics</button>
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
                                <input value={g.remarks} onChange={(e) => { const n = [...gradeSystem.grades]; n[i].remarks = e.target.value; setGradeSystem({ ...gradeSystem, grades: n }); }} className="bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-800" placeholder="Default remark..." />
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
                                    <tr><th className="px-10 py-6">Student</th><th className="px-10 py-6">Score</th><th className="px-10 py-6">Grade</th><th className="px-10 py-6">Remarks</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {students.map((s: any) => (
                                        <tr key={s._id} className="hover:bg-white/5">
                                            <td className="px-10 py-6 font-bold text-white">{s.firstName} {s.lastName}</td>
                                            <td className="px-10 py-6">
                                                <input
                                                    type="number"
                                                    value={marksData[s._id]?.score || ''}
                                                    onChange={(e) => setMarksData({ ...marksData, [s._id]: { ...marksData[s._id], score: e.target.value } })}
                                                    className="w-24 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none text-center font-black"
                                                />
                                            </td>
                                            <td className="px-10 py-6">
                                                {marksData[s._id]?.score !== '' && (
                                                    <span className="px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-xl font-black">
                                                        {(Number(marksData[s._id]?.score) / Number(maxMarks) * 100) >= 90 ? 'A+' : (Number(marksData[s._id]?.score) / Number(maxMarks) * 100) >= 80 ? 'A' : 'F'}
                                                    </span>
                                                )}
                                            </td>
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
                        <select className="w-full p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.term} onChange={e => setExamForm({ ...examForm, term: e.target.value })}><option>First Term</option><option>Mid Term</option><option>Final Term</option></select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="date" className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.startDate} onChange={e => setExamForm({ ...examForm, startDate: e.target.value })} />
                            <input type="date" className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-white" value={examForm.endDate} onChange={e => setExamForm({ ...examForm, endDate: e.target.value })} />
                        </div>
                        <div className="flex gap-4"><button type="button" onClick={() => setIsExamModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-bold">Cancel</button><button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Create</button></div>
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
