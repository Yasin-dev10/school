"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2, ArrowUpCircle, GraduationCap, Users } from 'lucide-react';

interface RawStudent {
    _id: string;
    firstName: string;
    lastName: string;
    profile: { studentId?: string; admissionNo?: string; class?: string; section?: string };
}

interface StudentRow extends RawStudent {
    finalGrade: number | null;
    eligible: boolean;
    reason: string;
}

interface ClassOption {
    _id: string;
    name: string;
    section?: string;
}

export default function PromoteStudentsPage() {
    const [academicYear, setAcademicYear] = useState<string>('');
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [fromClassId, setFromClassId] = useState('');
    const [toClassId, setToClassId] = useState('');
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [promoting, setPromoting] = useState(false);

    useEffect(() => {
        fetchClasses();
        fetchAcademicYear();
    }, []);

    useEffect(() => {
        if (fromClassId) {
            loadStudentsWithEligibility(fromClassId);
        } else {
            setStudents([]);
            setSelectedStudents([]);
        }
    }, [fromClassId]);

    const fetchAcademicYear = async () => {
        try {
            const res = await api.get('/tenants/me');
            setAcademicYear(
                res.data.data?.config?.academicYear ||
                res.data.data?.academicYear || ''
            );
        } catch { /* silent */ }
    };

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data.data || []);
        } catch {
            toast.error('Failed to load classes');
        }
    };

    const loadStudentsWithEligibility = async (classId: string) => {
        setLoadingStudents(true);
        setStudents([]);
        setSelectedStudents([]);
        try {
            // The backend is the single source of truth for completed exams,
            // missing marks, and the school's active passing threshold.
            const response = await api.get('/students/promotion-eligibility', { params: { classId } });
            const rows: StudentRow[] = response.data.data || [];

            if (rows.length === 0) {
                toast('No students found in this class', { icon: 'ℹ️' });
                return;
            }
            setStudents(rows);
            // Pre-select all eligible students
            setSelectedStudents(rows.filter(s => s.eligible).map(s => s._id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load students');
        } finally {
            setLoadingStudents(false);
        }
    };

    const toggleStudent = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(students.map(s => s._id));
        }
    };

    const handleConfirmPromotion = async () => {
        if (!fromClassId) { toast.error('Please select a current class'); return; }
        if (!toClassId) { toast.error('Please select a destination class'); return; }
        if (selectedStudents.length === 0) { toast.error('No students selected for promotion'); return; }

        const srcClass = classes.find(c => c._id === fromClassId);
        const dstClass = classes.find(c => c._id === toClassId);

        if (!window.confirm(
            `Promote ${selectedStudents.length} student(s) from ${classLabel(srcClass!)} to ${classLabel(dstClass!)}?`
        )) return;

        setPromoting(true);
        try {
            const res = await api.post('/students/promote', {
                studentIds: selectedStudents,
                currentClass: srcClass?._id,
                currentSection: srcClass?.section,
                nextClass: dstClass?._id,
                nextSection: dstClass?.section,
                type: 'manual'
            });
            if (res.data.success) {
                toast.success(res.data.message || `Promoted ${selectedStudents.length} student(s) successfully`);
                setFromClassId('');
                setToClassId('');
                setStudents([]);
                setSelectedStudents([]);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Promotion failed');
        } finally {
            setPromoting(false);
        }
    };

    const classLabel = (c: ClassOption) =>
        c.section ? `${c.name} - ${c.section}` : c.name;

    const allSelected = students.length > 0 && selectedStudents.length === students.length;

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 text-slate-900 dark:text-white sm:p-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"><ArrowUpCircle className="h-3 w-3" /> Student progression</span>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Promote students</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review eligibility and move selected students into their next class.</p>
                </div>
                {academicYear && <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300"><GraduationCap className="h-4 w-4 text-cyan-600 dark:text-cyan-300" /> Academic year {academicYear}</span>}
            </header>

            {fromClassId && !loadingStudents && students.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Students in class', value: students.length, icon: <Users className="h-4 w-4" />, tone: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200' },
                        { label: 'Eligible to promote', value: students.filter(student => student.eligible).length, icon: <CheckCircle2 className="h-4 w-4" />, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200' },
                        { label: 'Needs review', value: students.filter(student => !student.eligible).length, icon: <XCircle className="h-4 w-4" />, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200' },
                    ].map(metric => <div key={metric.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>{metric.icon}</span><span><span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</span><strong className="mt-0.5 block text-xl font-black text-slate-900 dark:text-white">{metric.value}</strong></span></div>)}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left panel */}
                <div className="w-full lg:w-64 shrink-0 space-y-4">
                    {/* Academic Year */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Current academic year</label>
                        <div className="relative">
                            <select
                                value={academicYear}
                                onChange={e => setAcademicYear(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                {academicYear
                                    ? <option value={academicYear}>{academicYear}</option>
                                    : <option value="">No year configured</option>
                                }
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                        </div>
                    </div>

                    {/* Current Class */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-2">
                        <label className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Current class</label>
                        <div className="relative">
                            <select
                                value={fromClassId}
                                onChange={e => setFromClassId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="">-- Select Class --</option>
                                {classes.map(c => (
                                    <option key={c._id} value={c._id}>{classLabel(c)}</option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                        </div>
                    </div>
                </div>

                {/* Right panel */}
                <div className="flex-1 space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                        {loadingStudents ? (
                            <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Loading students...</span>
                            </div>
                        ) : !fromClassId ? (
                            <div className="py-16 text-center text-slate-500 text-sm">
                                Select a class to view students and their promotion eligibility.
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-16 text-center text-slate-500 text-sm">
                                No students found in this class.
                            </div>
                        ) : (
                            <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                                        <th className="px-4 py-3 font-medium">Student Name</th>
                                        <th className="px-4 py-3 font-medium">Student ID</th>
                                        <th className="px-4 py-3 font-medium">Final Grade</th>
                                        <th className="px-4 py-3 font-medium">Promotion Eligibility</th>
                                        <th className="px-4 py-3 font-medium text-center">
                                            <label className="flex items-center justify-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleAll}
                                                    className="h-4 w-4 cursor-pointer rounded accent-cyan-600"
                                                />
                                                Promote to Next Level
                                            </label>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {students.map(student => (
                                        <tr key={student._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                                                {student.firstName} {student.lastName}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-300">
                                                {student.profile?.studentId ||
                                                    student.profile?.admissionNo ||
                                                    student._id.slice(-8).toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                                                {student.finalGrade !== null
                                                    ? student.finalGrade
                                                    : <span className="text-slate-400 font-normal italic text-xs">N/A</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                {student.eligible ? (
                                                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                        Eligible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex flex-col gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                                                        <span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4 shrink-0" />Not Eligible</span>
                                                        {student.reason && <span className="max-w-56 text-xs font-normal text-rose-500 dark:text-rose-300">{student.reason}</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.includes(student._id)}
                                                    onChange={() => toggleStudent(student._id)}
                                                    className="h-4 w-4 cursor-pointer rounded accent-cyan-600"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        )}
                    </div>

                    {/* Destination + Confirm */}
                    {fromClassId && students.length > 0 && (
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-3">
                            <label className="text-sm text-slate-600 dark:text-slate-400 font-semibold">Destination class</label>
                            <div className="relative">
                                <select
                                    value={toClassId}
                                    onChange={e => setToClassId(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-8 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    <option value="">-- Select Destination Class --</option>
                                    {classes
                                        .filter(c => c._id !== fromClassId)
                                        .map(c => (
                                            <option key={c._id} value={c._id}>{classLabel(c)}</option>
                                        ))}
                                </select>
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                            </div>

                            <button
                                onClick={handleConfirmPromotion}
                                disabled={promoting || !toClassId || selectedStudents.length === 0}
                                className="w-full rounded-xl bg-[#1e3a8a] py-3 font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {promoting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Promoting...
                                    </>
                                ) : (
                                    `Confirm Promotion (${selectedStudents.length} student${selectedStudents.length !== 1 ? 's' : ''})`
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
