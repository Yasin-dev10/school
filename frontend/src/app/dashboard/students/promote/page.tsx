"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
        <div className="min-h-screen bg-[#0f172a] text-white p-6">
            <h1 className="text-2xl font-bold mb-6">Student Promotion Management</h1>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left panel */}
                <div className="w-full lg:w-64 shrink-0 space-y-4">
                    {/* Academic Year */}
                    <div className="bg-[#1e293b] rounded-xl p-4 space-y-2">
                        <label className="text-sm text-slate-400 font-medium">Current Academic Year:</label>
                        <div className="relative">
                            <select
                                value={academicYear}
                                onChange={e => setAcademicYear(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div className="bg-[#1e293b] rounded-xl p-4 space-y-2">
                        <label className="text-sm text-slate-400 font-medium">Select Current Class:</label>
                        <div className="relative">
                            <select
                                value={fromClassId}
                                onChange={e => setFromClassId(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div className="bg-[#1e293b] rounded-xl overflow-hidden">
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
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-400 text-left text-xs uppercase tracking-wide">
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
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500 cursor-pointer"
                                                />
                                                Promote to Next Level
                                            </label>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {students.map(student => (
                                        <tr key={student._id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">
                                                {student.firstName} {student.lastName}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 font-mono text-xs">
                                                {student.profile?.studentId ||
                                                    student.profile?.admissionNo ||
                                                    student._id.slice(-8).toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3 text-white font-semibold">
                                                {student.finalGrade !== null
                                                    ? student.finalGrade
                                                    : <span className="text-slate-500 font-normal italic text-xs">N/A</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3">
                                                {student.eligible ? (
                                                    <span className="inline-flex items-center gap-1.5 text-green-400 font-medium">
                                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                        Eligible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex flex-col gap-1 text-red-400 font-medium">
                                                        <span className="inline-flex items-center gap-1.5"><XCircle className="w-4 h-4 shrink-0" />Not Eligible</span>
                                                        {student.reason && <span className="max-w-56 text-xs font-normal text-red-300">{student.reason}</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.includes(student._id)}
                                                    onChange={() => toggleStudent(student._id)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-blue-500 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Destination + Confirm */}
                    {fromClassId && students.length > 0 && (
                        <div className="bg-[#1e293b] rounded-xl p-4 space-y-3">
                            <label className="text-sm text-slate-400 font-medium">Destination Class:</label>
                            <div className="relative">
                                <select
                                    value={toClassId}
                                    onChange={e => setToClassId(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-700 text-white rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
