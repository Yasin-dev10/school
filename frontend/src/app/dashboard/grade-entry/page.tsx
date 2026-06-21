"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { Save, Loader2, CheckCircle2, Lock, Unlock, Download, AlertCircle, ChevronDown } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type GradeConfig = { grade: string; minPercentage: number; maxPercentage: number; gpa: number; remarks?: string };
type Student = { _id: string; id?: string; firstName: string; lastName: string; rollNo?: string; admissionNo?: string; profile?: { rollNo?: string; admissionNo?: string } };
type MarkRow = { studentId: string; score: string; remarks: string; grade?: string; gpa?: number; gradeRemarks?: string; isDirty: boolean };
type Exam = { _id: string; name: string; term: string; isApproved?: boolean; classes?: any[] };
type AClass = { _id: string; name: string; section?: string; grade?: string };
type Subject = { _id: string; name: string; code: string };

const DEFAULT_GRADES: GradeConfig[] = [
    { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, remarks: 'Excellent' },
    { grade: 'A',  minPercentage: 80, maxPercentage: 89,  gpa: 3.7, remarks: 'Very Good' },
    { grade: 'B+', minPercentage: 70, maxPercentage: 79,  gpa: 3.3, remarks: 'Good' },
    { grade: 'B',  minPercentage: 60, maxPercentage: 69,  gpa: 3.0, remarks: 'Above Average' },
    { grade: 'C',  minPercentage: 50, maxPercentage: 59,  gpa: 2.0, remarks: 'Average' },
    { grade: 'D',  minPercentage: 40, maxPercentage: 49,  gpa: 1.0, remarks: 'Below Average' },
    { grade: 'F',  minPercentage: 0,  maxPercentage: 39,  gpa: 0.0, remarks: 'Fail' },
];

const GRADE_COLOR: Record<string, string> = {
    'A+': 'text-emerald-600 dark:text-emerald-400',
    'A':  'text-green-600 dark:text-green-400',
    'B+': 'text-blue-600 dark:text-blue-400',
    'B':  'text-cyan-600 dark:text-cyan-400',
    'C':  'text-yellow-600 dark:text-yellow-400',
    'D':  'text-orange-600 dark:text-orange-400',
    'F':  'text-red-600 dark:text-red-400',
};

function calcGrade(score: number, maxMarks: number, configs: GradeConfig[]): GradeConfig | null {
    const pct = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
    return configs.find(g => pct >= g.minPercentage && pct <= g.maxPercentage) || null;
}

function gradeColor(grade?: string) {
    if (!grade) return 'text-slate-500';
    return GRADE_COLOR[grade] || 'text-slate-600 dark:text-slate-300';
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function GradeEntryPage() {
    const [exams, setExams]       = useState<Exam[]>([]);
    const [classes, setClasses]   = useState<AClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>(DEFAULT_GRADES);

    const [selExam, setSelExam]       = useState('');
    const [selClass, setSelClass]     = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [maxMarks, setMaxMarks]     = useState(100);

    const [students, setStudents] = useState<Student[]>([]);
    const [marks, setMarks]       = useState<Record<string, MarkRow>>({});

    const [loading, setLoading]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [approving, setApproving] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    /* ── Initial data ─────────────────────────────────────────────────── */
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role || '');
        (async () => {
            try {
                const [eRes, cRes, sRes, gRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes'),
                    api.get('/subjects'),
                    api.get('/grades/active').catch(() => null),
                ]);
                setExams(eRes.data.data || []);
                setClasses(cRes.data.data || []);
                setSubjects(sRes.data.data || []);
                if (gRes?.data?.data?.grades?.length) setGradeConfigs(gRes.data.data.grades);
            } catch (e) { console.error(e); }
        })();
    }, []);

    /* ── Load students + existing marks ──────────────────────────────────── */
    useEffect(() => {
        if (!selExam || !selClass || !selSubject) {
            setStudents([]); setMarks({}); return;
        }
        (async () => {
            setLoading(true);
            try {
                const [stuRes, mrkRes] = await Promise.all([
                    api.get(`/students?class=${selClass}`),
                    api.get('/exams/marks', { params: { examId: selExam, classId: selClass, subjectId: selSubject } }),
                ]);
                const stus: Student[] = stuRes.data.data || [];
                const existing: any[] = mrkRes.data.data || [];

                const init: Record<string, MarkRow> = {};
                stus.forEach(s => {
                    const sid = s._id || s.id || '';
                    const found = existing.find(m => (m.student?._id || m.student?.id || m.studentId) === sid);
                    init[sid] = {
                        studentId: sid,
                        score: found ? String(found.marksObtained) : '',
                        remarks: found?.remarks || '',
                        grade: found?.grade || undefined,
                        gpa: found?.gpa ?? undefined,
                        gradeRemarks: found?.gradeRemarks || undefined,
                        isDirty: false,
                    };
                });
                setStudents(stus);
                setMarks(init);
            } catch (e) { console.error(e); showToast('Failed to load data', false); }
            finally { setLoading(false); }
        })();
    }, [selExam, selClass, selSubject]);

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const currentExam = useMemo(() => exams.find(e => e._id === selExam), [exams, selExam]);
    const isLocked    = currentExam?.isApproved === true;
    const isAdmin     = ['school-admin', 'super-admin'].includes(userRole);
    const canEdit     = !isLocked || isAdmin;

    const stats = useMemo(() => {
        const rows = Object.values(marks).filter(m => m.score !== '');
        const total = rows.length;
        const scores = rows.map(m => Number(m.score));
        const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
        const passed = rows.filter(m => {
            const g = calcGrade(Number(m.score), maxMarks, gradeConfigs);
            return g ? g.grade !== 'F' : Number(m.score) / maxMarks >= 0.5;
        }).length;
        return { total, avg: avg.toFixed(1), passed, failed: total - passed };
    }, [marks, maxMarks, gradeConfigs]);

    /* ── Handlers ────────────────────────────────────────────────────────── */
    const handleChange = (sid: string, field: 'score' | 'remarks', val: string) => {
        setMarks(prev => ({
            ...prev,
            [sid]: {
                ...prev[sid],
                [field]: val,
                ...(field === 'score' ? { isDirty: true, grade: undefined, gpa: undefined, gradeRemarks: undefined } : {}),
            },
        }));
    };

    const handleSave = async (finalize = false) => {
        const payload = Object.values(marks)
            .filter(m => m.score !== '' && m.score !== null)
            .map(m => ({ studentId: m.studentId, score: Number(m.score), maxMarks, remarks: m.remarks || '' }));
        if (!payload.length) { showToast('Enter at least one mark', false); return; }
        setSaving(true);
        try {
            await api.post('/exams/marks/bulk', { examId: selExam, classId: selClass, subjectId: selSubject, maxMarks, marks: payload });
            if (finalize && isAdmin) {
                await api.put(`/exams/${selExam}/approve`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: true } : e));
                showToast('Results finalized & published');
            } else {
                showToast('Draft saved successfully');
            }
            // Refresh marks from server so grades/gpa populate
            const mrkRes = await api.get('/exams/marks', { params: { examId: selExam, classId: selClass, subjectId: selSubject } });
            const existing: any[] = mrkRes.data.data || [];
            setMarks(prev => {
                const updated = { ...prev };
                existing.forEach(m => {
                    const sid = m.student?._id || m.student?.id || m.studentId;
                    if (updated[sid]) {
                        updated[sid] = { ...updated[sid], grade: m.grade, gpa: m.gpa, gradeRemarks: m.gradeRemarks, isDirty: false };
                    }
                });
                return updated;
            });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Save failed', false);
        } finally { setSaving(false); }
    };

    const handleToggleApproval = async () => {
        if (!selExam || !isAdmin) return;
        setApproving(true);
        try {
            if (isLocked) {
                await api.put(`/exams/${selExam}/unapprove`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: false } : e));
                showToast('Exam unlocked for editing');
            } else {
                await api.put(`/exams/${selExam}/approve`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: true } : e));
                showToast('Results approved & published');
            }
        } catch (err: any) { showToast(err.response?.data?.message || 'Failed', false); }
        finally { setApproving(false); }
    };

    const handleExportExcel = async () => {
        if (!selExam || !selClass) return;
        try {
            const res = await api.get('/exams/export-matrix', {
                params: { examId: selExam, classId: selClass },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = 'grades-matrix.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch { showToast('Export failed', false); }
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exam Marks Entry and Results</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Enter student marks — grades are calculated automatically.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {selExam && selClass && (
                        <button onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:border-slate-400 transition">
                            <Download className="w-4 h-4" /> Excel
                        </button>
                    )}
                    {isAdmin && selExam && (
                        <button onClick={handleToggleApproval} disabled={approving}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${isLocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}>
                            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? <><Unlock className="w-4 h-4" /> Unlock</> : <><Lock className="w-4 h-4" /> Approve</>}
                        </button>
                    )}
                    {canEdit && selExam && selClass && selSubject && (
                        <>
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                            </button>
                            {isAdmin && (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Finalize & Publish
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Locked Banner */}
            {isLocked && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
                    <Lock className="w-4 h-4 shrink-0" />
                    Results are approved and locked. {isAdmin ? 'Click "Unlock" to allow edits.' : 'Contact admin to unlock.'}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Class</label>
                    <div className="relative">
                        <select value={selClass} onChange={e => setSelClass(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">Class 10A</option>
                            {classes.map(c => <option key={c._id} value={c._id}>{c.grade || c.name}{c.section ? ` ${c.section}` : ''}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Subject</label>
                    <div className="relative">
                        <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">Mathematics</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Exam Type</label>
                    <div className="relative">
                        <select value={selExam} onChange={e => setSelExam(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">Final Exam 2024</option>
                            {exams.map(e => <option key={e._id} value={e._id}>{e.name} — {e.term}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Marks</label>
                    <input type="number" min={1} value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading students...
                    </div>
                ) : !selExam || !selClass || !selSubject ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-sm gap-2">
                        <AlertCircle className="w-10 h-10 opacity-30" />
                        Select a Class, Subject, and Exam to begin entering marks.
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm">No students found in this class.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                                    <th className="px-4 py-3 w-24">Student ID</th>
                                    <th className="px-4 py-3">Student Name</th>
                                    <th className="px-4 py-3 w-36">Obtained Marks</th>
                                    <th className="px-4 py-3 w-24">Max Marks</th>
                                    <th className="px-4 py-3 w-28">Percentage (%)</th>
                                    <th className="px-4 py-3 w-20">Grade</th>
                                    <th className="px-4 py-3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {students.map((s, idx) => {
                                    const sid = s._id || s.id || '';
                                    const row = marks[sid] || { studentId: sid, score: '', remarks: '', isDirty: false };
                                    const numScore = row.score !== '' ? Number(row.score) : null;
                                    const pct = numScore !== null ? (numScore / maxMarks) * 100 : null;
                                    const gc = numScore !== null ? calcGrade(numScore, maxMarks, gradeConfigs) : null;
                                    const grade = row.isDirty ? gc?.grade : (row.grade || gc?.grade);
                                    const isFail = grade === 'F';
                                    const rollNo = s.rollNo || s.profile?.rollNo || `S${String(idx + 1).padStart(4, '0')}`;

                                    return (
                                        <tr key={sid} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isFail && numScore !== null ? 'bg-red-50/40 dark:bg-red-900/5' : ''}`}>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{rollNo}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{s.firstName} {s.lastName}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number" min={0} max={maxMarks}
                                                        value={row.score}
                                                        onChange={e => handleChange(sid, 'score', e.target.value)}
                                                        disabled={!canEdit}
                                                        className={`w-20 px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-white ${isFail && numScore !== null ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'}`}
                                                        placeholder="—"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{maxMarks}</td>
                                            <td className={`px-4 py-3 font-semibold ${isFail && numScore !== null ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                                            </td>
                                            <td className={`px-4 py-3 font-bold text-base ${gradeColor(grade)}`}>
                                                {grade || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={row.remarks}
                                                    onChange={e => handleChange(sid, 'remarks', e.target.value)}
                                                    disabled={!canEdit}
                                                    placeholder="e.g. Excellent performance"
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-white placeholder-slate-400"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {students.length > 0 && selExam && selClass && selSubject && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-wrap gap-4">
                        <span>Total Students: <strong className="text-slate-800 dark:text-white">{students.length}</strong></span>
                        <span>Average: <strong className="text-blue-600 dark:text-blue-400">{stats.avg}%</strong></span>
                        <span>Passed: <strong className="text-emerald-600 dark:text-emerald-400">{stats.passed}</strong></span>
                        <span>Failed: <strong className="text-red-500">{stats.failed}</strong></span>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                            </button>
                            {isAdmin && (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Finalize & Publish
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
