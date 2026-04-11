"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { Save, Search, AlertCircle, FileText, CheckCircle2, TrendingUp, Download, FileBadge } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

// Grade System Configuration
const GRADE_SYSTEM = [
    {
        grade: "A+",
        minPercentage: 90,
        maxPercentage: 100,
        gpa: 4.0,
        remarks: "Excellent"
    },
    {
        grade: "A",
        minPercentage: 80,
        maxPercentage: 89,
        gpa: 3.7,
        remarks: "Very Good"
    },
    {
        grade: "B+",
        minPercentage: 70,
        maxPercentage: 79,
        gpa: 3.3,
        remarks: "Good"
    },
    {
        grade: "B",
        minPercentage: 60,
        maxPercentage: 69,
        gpa: 3.0,
        remarks: "Above Average"
    },
    {
        grade: "C",
        minPercentage: 50,
        maxPercentage: 59,
        gpa: 2.0,
        remarks: "Average"
    },
    {
        grade: "D",
        minPercentage: 40,
        maxPercentage: 49,
        gpa: 1.0,
        remarks: "Below Average"
    },
    {
        grade: "F",
        minPercentage: 0,
        maxPercentage: 39,
        gpa: 0.0,
        remarks: "Fail"
    }
];

// Helper function to calculate grade from percentage
const calculateGrade = (percentage: number) => {
    const gradeInfo = GRADE_SYSTEM.find(
        g => percentage >= g.minPercentage && percentage <= g.maxPercentage
    );
    return gradeInfo || { grade: "N/A", gpa: 0, remarks: "Not Available" };
};

interface Student {
    _id: string;
    firstName: string;
    lastName: string;
    profile: {
        rollNo: string;
        admissionNo: string;
    };
}

interface MarkInput {
    studentId: string;
    score: string | number;
    maxMarks: number;
    remarks: string;
}

export default function GradesPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [students, setStudents] = useState<Student[]>([]);
    const [marksData, setMarksData] = useState<Record<string, MarkInput>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [maxMarksGlobal, setMaxMarksGlobal] = useState(100);

    const [user, setUser] = useState<any>(null);
    const [studentGrades, setStudentGrades] = useState<any>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState<string>('');

    // Initial Data Fetch
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            if (userData.role === 'student') {
                fetchStudentGrades();
            } else if (userData.role === 'parent') {
                fetchChildren();
            } else {
                fetchInitialData();
            }
        }
    }, []);

    const fetchChildren = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/students/my-children');
            const fetchedChildren = data.data || [];
            setChildren(fetchedChildren);
            if (fetchedChildren.length > 0) {
                setSelectedChild(fetchedChildren[0]._id);
            }
        } catch (error) {
            console.error("Failed to fetch children", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedChild && user?.role === 'parent') {
            fetchStudentGrades(selectedChild);
        }
    }, [selectedChild]);

    const fetchInitialData = async () => {
        try {
            const [examsRes, classesRes, subjectsRes] = await Promise.all([
                api.get('/exams'),
                api.get('/classes'),
                api.get('/subjects')
            ]);
            setExams(examsRes.data.data);
            setClasses(classesRes.data.data);
            setSubjects(subjectsRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load initial data');
        }
    };

    const fetchStudentGrades = async (studentId?: string) => {
        setLoading(true);
        try {
            const url = studentId ? `/exams/student-grades/${studentId}` : '/exams/student-grades';
            const { data } = await api.get(url);
            setStudentGrades(data.data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load grades');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTranscript = async () => {
        const element = document.getElementById('transcript-area');
        if (!element) return;

        setLoading(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);

            let filename = 'transcript.pdf';
            if (user?.role === 'student') {
                filename = `transcript-${user.firstName}.pdf`;
            } else if (user?.role === 'parent' && selectedChild) {
                const child = children.find(c => c._id === selectedChild);
                filename = `transcript-${child?.firstName || 'student'}.pdf`;
            }

            pdf.save(filename);
            toast.success('Transcript downloaded');
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate PDF');
        } finally {
            setLoading(false);
        }
    };

    // Load Students & Marks when filters change (Teachers ONLY)
    useEffect(() => {
        if (user && !['student', 'parent'].includes(user.role) && selectedExam && selectedClass && selectedSubject) {
            fetchStudentsAndMarks();
        } else {
            setStudents([]);
            setMarksData({});
        }
    }, [selectedExam, selectedClass, selectedSubject, user]);

    const fetchStudentsAndMarks = async () => {
        setLoading(true);
        try {
            const studentsRes = await api.get(`/students?class=${selectedClass}`);
            const fetchedStudents = studentsRes.data.data;

            const marksRes = await api.get('/exams/marks', {
                params: {
                    examId: selectedExam,
                    classId: selectedClass,
                    subjectId: selectedSubject
                }
            });
            const existingMarks = marksRes.data.data;

            const initialMarks: Record<string, MarkInput> = {};

            fetchedStudents.forEach((s: Student) => {
                const foundMark = existingMarks.find((m: any) => m.student._id === s._id);
                initialMarks[s._id] = {
                    studentId: s._id,
                    score: foundMark ? foundMark.marksObtained : '',
                    maxMarks: foundMark ? foundMark.maxMarks : maxMarksGlobal,
                    remarks: foundMark ? foundMark.remarks : ''
                };
            });

            setStudents(fetchedStudents);
            setMarksData(initialMarks);

        } catch (error) {
            console.error(error);
            toast.error('Failed to load grade book');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId: string, field: keyof MarkInput, value: any) => {
        setMarksData(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Filter out marks with empty scores and prepare payload
            const marksPayload = Object.values(marksData)
                .filter(m => m.score !== '' && m.score !== null && m.score !== undefined)
                .map(m => ({
                    studentId: m.studentId,
                    score: Number(m.score),
                    maxMarks: Number(m.maxMarks || maxMarksGlobal),
                    remarks: m.remarks || ''
                }));

            if (marksPayload.length === 0) {
                toast.error('Please enter at least one mark before saving');
                setSaving(false);
                return;
            }

            await api.post('/exams/marks/bulk', {
                examId: selectedExam,
                classId: selectedClass,
                subjectId: selectedSubject,
                marks: marksPayload,
                maxMarks: maxMarksGlobal
            });

            toast.success('Grades saved successfully');
            fetchStudentsAndMarks();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to save grades');
        } finally {
            setSaving(false);
        }
    };

    if (user?.role === 'student' || (user?.role === 'parent' && selectedChild)) {
        const activeChild = user?.role === 'parent' ? children.find(c => c._id === selectedChild) : null;
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-500">
                                <TrendingUp className="w-8 h-8" />
                            </div>
                            {user?.role === 'student' ? 'My Academic Progress' : `Progress: ${activeChild?.firstName} ${activeChild?.lastName}`}
                        </h1>
                        <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">Academic Transcript & Analytics</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {user?.role === 'parent' && children.length > 1 && (
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student:</label>
                                <select
                                    value={selectedChild}
                                    onChange={(e) => setSelectedChild(e.target.value)}
                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    {children.map(child => (
                                        <option key={child._id} value={child._id}>{child.firstName} {child.lastName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            onClick={handleDownloadTranscript}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF Transcript
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-bold animate-pulse">Syncing academic records...</p>
                    </div>
                ) : studentGrades?.terms?.length > 0 ? (
                    <div className="space-y-12" id="transcript-area">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="glass-dark p-10 rounded-[3rem] border border-white/5 bg-indigo-600 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4 font-mono">Cumulative GPA</p>
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-6xl font-black tracking-tighter">{studentGrades.cumulativeGpa}</span>
                                    <span className="text-sm font-bold opacity-60">/ 4.00</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${(Number(studentGrades.cumulativeGpa) / 4) * 100}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span>Progress</span>
                                        <span>Rank: Excellent</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 glass dark:bg-slate-950/50 p-10 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-around gap-8">
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 font-mono">Academic Status</p>
                                    <div className="flex items-center gap-3 justify-center sm:justify-start">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-3xl font-black text-emerald-500 tracking-tight">Active / Clear</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Eligible for merit scholarships</p>
                                </div>
                                <div className="h-16 w-px bg-slate-200 dark:bg-white/10 hidden sm:block" />
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2 font-mono">Credits Earned</p>
                                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{studentGrades.totalCredits || 0}</p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Out of required curriculum</p>
                                </div>
                            </div>
                        </div>

                        <div className="hidden pdf-only py-12 px-10 border-b-4 border-slate-900 mb-12 bg-slate-50 rounded-t-[3rem]">
                            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-6 text-center">Official Academic Registry</h1>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {user?.role === 'parent' ? `${activeChild?.firstName} ${activeChild?.lastName}` : `${user?.firstName} ${user?.lastName}`}
                                    </p>
                                    <p className="text-sm font-bold text-indigo-600 font-mono">ADMISSION: {user?.role === 'parent' ? activeChild?.profile?.admissionNo : user?.profile?.admissionNo}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Status</p>
                                    <p className="text-2xl font-black text-emerald-600">Verified Transcript</p>
                                    <p className="text-sm font-bold text-slate-500">Date: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {studentGrades.terms.map((term: any, tIdx: number) => (
                            <div key={tIdx} className="space-y-8 animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${tIdx * 150}ms` }}>
                                <div className="flex items-center gap-6">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{term.name} <span className="text-indigo-500">{term.term}</span></h2>
                                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/5" />
                                    <div className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">Term GPA: {term.gpa}</div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {term.courses.map((course: any, cIdx: number) => (
                                        <div key={cIdx} className="glass dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-all duration-500 group relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="w-14 h-14 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6 shadow-inner">
                                                    <FileText className="w-7 h-7" />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-black text-indigo-500 group-hover:scale-110 transition-transform">{course.grade}</p>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 opacity-60">{course.percentage}% Score</p>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{course.subjectName}</h3>
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 rounded uppercase tracking-tighter">{course.subjectCode}</span>
                                                <span className="px-2 py-0.5 bg-indigo-500/10 text-[9px] font-black text-indigo-500 rounded uppercase tracking-tighter">{course.credits} Credits</span>
                                            </div>

                                            <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-white/5">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Marks</span>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{course.marksObtained} / {course.maxMarks}</span>
                                                </div>
                                                <button className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:text-indigo-500 transition-colors">
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center glass-dark rounded-[3.5rem] border border-white/5 bg-slate-900/20">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <AlertCircle className="w-12 h-12 text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3">No Records Released</h3>
                        <p className="text-slate-500 max-w-sm mx-auto font-medium">Academic reports are currently being processed by the registry and will be published shortly.</p>
                    </div>
                )}

                {studentGrades?.terms?.length > 0 && (
                    <div className="mt-12 p-8 glass dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 bg-slate-900/40 flex flex-col md:flex-row items-center justify-between gap-8 mt-16 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-600 opacity-0 group-hover:opacity-[0.03] transition-opacity" />
                        <div className="flex items-center gap-8 relative z-10 text-center md:text-left">
                            <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                                <FileBadge className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Export Official Record</h3>
                                <p className="text-slate-400 mt-1 font-medium italic">Generate a high-fidelity PDF transcript for your personal records.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadTranscript}
                            disabled={loading}
                            className="w-full md:w-auto px-12 py-5 bg-white text-indigo-900 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-100 transition-all shadow-2xl active:scale-95 z-10"
                        >
                            {loading ? (
                                <span className="w-6 h-6 border-4 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin" />
                            ) : 'Export as PDF'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Grade Book
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Enter and manage student marks.</p>
                </div>
                {selectedExam && selectedClass && selectedSubject && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Grade System Reference Card */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-600 rounded-lg">
                        <FileBadge className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Grading System Reference</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">A+ to F scale with GPA equivalents</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {GRADE_SYSTEM.map((grade) => (
                        <div
                            key={grade.grade}
                            className={`p-3 rounded-lg border-2 ${grade.grade === 'A+' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                grade.grade === 'A' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                                    grade.grade === 'B+' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                                        grade.grade === 'B' ? 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800' :
                                            grade.grade === 'C' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' :
                                                grade.grade === 'D' ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' :
                                                    'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                }`}
                        >
                            <div className={`text-2xl font-black mb-1 ${grade.grade === 'A+' ? 'text-emerald-700 dark:text-emerald-400' :
                                grade.grade === 'A' ? 'text-green-700 dark:text-green-400' :
                                    grade.grade === 'B+' ? 'text-blue-700 dark:text-blue-400' :
                                        grade.grade === 'B' ? 'text-cyan-700 dark:text-cyan-400' :
                                            grade.grade === 'C' ? 'text-yellow-700 dark:text-yellow-400' :
                                                grade.grade === 'D' ? 'text-orange-700 dark:text-orange-400' :
                                                    'text-red-700 dark:text-red-400'
                                }`}>
                                {grade.grade}
                            </div>
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                {grade.minPercentage}-{grade.maxPercentage}%
                            </div>
                            <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-1">
                                GPA: {grade.gpa.toFixed(1)}
                            </div>
                            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {grade.remarks}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Exam</label>
                    <select
                        value={selectedExam}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Exam...</option>
                        {exams.map(e => (
                            <option key={e._id} value={e._id}>{e.name} ({e.term})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Class</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Class...</option>
                        {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.name} {c.section && `(${c.section})`}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Subject...</option>
                        {subjects.map(s => (
                            <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Max Marks</label>
                    <input
                        type="number"
                        value={maxMarksGlobal}
                        onChange={(e) => setMaxMarksGlobal(Number(e.target.value))}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full p-12">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500">Loading student list...</p>
                    </div>
                ) : !selectedExam || !selectedClass || !selectedSubject ? (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-slate-400">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select Exam, Class, and Subject to start grading.</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500">
                        <AlertCircle className="w-12 h-12 mb-4 text-amber-500 opacity-50" />
                        <p>No students found in this class.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="p-4 w-16">#</th>
                                    <th className="p-4">Student</th>
                                    <th className="p-4 w-32">Marks Obtained</th>
                                    <th className="p-4 w-24">Max</th>
                                    <th className="p-4 w-20">%</th>
                                    <th className="p-4 w-20">Grade</th>
                                    <th className="p-4 w-20">GPA</th>
                                    <th className="p-4">Remarks</th>
                                    <th className="p-4 w-16">State</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {students.map((student, index) => {
                                    const score = marksData[student._id]?.score || '';
                                    const percentage = score !== '' ? (Number(score) / Number(maxMarksGlobal)) * 100 : 0;
                                    const gradeInfo = score !== '' ? calculateGrade(percentage) : null;
                                    const isPass = Number(score) >= (Number(maxMarksGlobal) * 0.4); // Assuming 40% pass

                                    return (
                                        <tr key={student._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="p-4 text-slate-500">{index + 1}</td>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{student.firstName} {student.lastName}</div>
                                                <div className="text-xs text-slate-500">Roll: {student.profile.rollNo}</div>
                                            </td>
                                            <td className="p-4">
                                                <input
                                                    type="number"
                                                    value={score}
                                                    onChange={(e) => handleMarkChange(student._id, 'score', e.target.value)}
                                                    className={`w-full p-2 rounded border focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 ${score !== '' && !isPass
                                                        ? 'border-red-300 text-red-600 bg-red-50 dark:bg-red-900/10'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                        }`}
                                                    placeholder="0"
                                                    min="0"
                                                    max={maxMarksGlobal}
                                                />
                                            </td>
                                            <td className="p-4 text-slate-500">{maxMarksGlobal}</td>
                                            <td className="p-4">
                                                {score !== '' && (
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {gradeInfo && (
                                                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${gradeInfo.grade === 'A+' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                        gradeInfo.grade === 'A' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            gradeInfo.grade === 'B+' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                gradeInfo.grade === 'B' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' :
                                                                    gradeInfo.grade === 'C' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                        gradeInfo.grade === 'D' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }`}>
                                                        {gradeInfo.grade}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {gradeInfo && (
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {gradeInfo.gpa.toFixed(1)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {gradeInfo ? (
                                                    <span className={`text-sm font-medium ${gradeInfo.grade === 'F' ? 'text-red-600 dark:text-red-400' :
                                                        gradeInfo.grade === 'D' ? 'text-orange-600 dark:text-orange-400' :
                                                            gradeInfo.grade.startsWith('A') ? 'text-emerald-600 dark:text-emerald-400' :
                                                                'text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                        {gradeInfo.remarks}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={marksData[student._id]?.remarks || ''}
                                                        onChange={(e) => handleMarkChange(student._id, 'remarks', e.target.value)}
                                                        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                                                        placeholder="Optional..."
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {score !== '' && (
                                                    <CheckCircle2 className={`w-5 h-5 ${isPass ? 'text-green-500' : 'text-red-500'}`} />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
