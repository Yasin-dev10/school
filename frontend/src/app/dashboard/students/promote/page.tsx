"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { ArrowRight, CheckSquare, Square, Users, GraduationCap } from 'lucide-react';

export default function PromoteStudentsPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [fromClass, setFromClass] = useState('');
    const [toClass, setToClass] = useState('');
    const [toSection, setToSection] = useState('A');
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [promoting, setPromoting] = useState(false);
    const [promotionType, setPromotionType] = useState<'manual' | 'auto'>('manual');
    const [promotionResult, setPromotionResult] = useState<any>(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (fromClass) {
            fetchStudents();
        } else {
            setStudents([]);
            setSelectedStudents([]);
            setPromotionResult(null);
        }
    }, [fromClass]);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/students?class=${fromClass}`);
            setStudents(res.data.data);
            // Default select all for manual, but for auto we don't really use this selection for logic
            setSelectedStudents(res.data.data.map((s: any) => s._id));
        } catch (error) {
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedStudents.length === students.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(students.map(s => s._id));
        }
    };

    const toggleStudent = (id: string) => {
        if (selectedStudents.includes(id)) {
            setSelectedStudents(selectedStudents.filter(s => s !== id));
        } else {
            setSelectedStudents([...selectedStudents, id]);
        }
    };

    const handlePromote = async () => {
        if (!toClass) {
            toast.error('Please select a destination class');
            return;
        }

        if (promotionType === 'manual' && selectedStudents.length === 0) {
            toast.error('Please select students to promote');
            return;
        }

        const fromClassName = classes.find(c => c._id === fromClass)?.name;
        const toClassName = classes.find(c => c._id === toClass)?.name;

        if (!confirm(`Are you sure you want to ${promotionType === 'auto' ? 'AUTO ' : ''}promote students from ${fromClassName} to ${toClassName}?`)) {
            return;
        }

        setPromoting(true);
        setPromotionResult(null); // Clear previous results

        try {
            const targetClassObj = classes.find(c => c._id === toClass);

            const payload: any = {
                currentClass: fromClassName, // Required for auto
                nextClass: targetClassObj?.name,
                nextSection: toSection,
                type: promotionType
            };

            if (promotionType === 'manual') {
                payload.studentIds = selectedStudents;
            }

            const res = await api.post('/students/promote', payload);

            if (res.data.success) {
                toast.success(res.data.message);
                if (promotionType === 'auto') {
                    setPromotionResult(res.data);
                } else {
                    // Manual success usually just clears
                    setStudents([]);
                    setSelectedStudents([]);
                    setFromClass('');
                    setToClass('');
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to promote students');
        } finally {
            setPromoting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Promotion</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Orchestrate student advancement to the next academic tier.</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="bg-slate-900/50 p-1 rounded-xl border border-white/5 flex gap-1">
                    <button
                        onClick={() => { setPromotionType('manual'); setPromotionResult(null); }}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${promotionType === 'manual'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Manual Select
                    </button>
                    <button
                        onClick={() => { setPromotionType('auto'); setPromotionResult(null); }}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${promotionType === 'auto'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Auto (Exam Based)
                    </button>
                </div>
            </div>

            {/* Results Display for Auto Promotion */}
            {promotionResult && (
                <div className="p-6 sm:p-8 glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-3 text-emerald-400">
                        <CheckSquare className="w-6 h-6" />
                        <h3 className="font-bold text-lg text-white">Promotion Results</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-xs font-black text-emerald-500 uppercase tracking-widest">Promoted</div>
                            <div className="text-2xl font-black text-white mt-1">{promotionResult.promotedCount}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                            <div className="text-xs font-black text-rose-500 uppercase tracking-widest">Retained</div>
                            <div className="text-2xl font-black text-white mt-1">{promotionResult.retainedCount}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="text-xs font-black text-indigo-500 uppercase tracking-widest">Total Processed</div>
                            <div className="text-2xl font-black text-white mt-1">
                                {(promotionResult.promotedCount || 0) + (promotionResult.retainedCount || 0)}
                            </div>
                        </div>
                    </div>

                    {promotionResult.failures && promotionResult.failures.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest">Retention Details</h4>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                {promotionResult.failures.map((fail: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                                        <span className="font-bold text-white">{fail.student}</span>
                                        <span className="text-rose-400 font-mono">{fail.reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Selection */}
                <div className="p-6 sm:p-8 glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs">A</span>
                        Source Context
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Class Group</label>
                            <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                                <select
                                    value={fromClass}
                                    onChange={(e) => setFromClass(e.target.value)}
                                    className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900">Select Source...</option>
                                    {classes.map((c) => (
                                        <option key={c._id} value={c._id} className="bg-slate-900">{c.name} {c.section && `(${c.section})`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Destination Selection */}
                <div className="p-6 sm:p-8 glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-xs text-indigo-400">B</span>
                        Destination Target
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Tier</label>
                            <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                                <select
                                    value={toClass}
                                    onChange={(e) => setToClass(e.target.value)}
                                    className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900">Select Target...</option>
                                    {classes.map((c) => (
                                        <option key={c._id} value={c._id} className="bg-slate-900">{c.name} {c.section && `(${c.section})`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Section</label>
                            <input
                                type="text"
                                value={toSection}
                                onChange={(e) => setToSection(e.target.value)}
                                className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-black text-xs"
                                placeholder="e.g. A"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Student List (Only show in Manual Mode or for reference) */}
            {fromClass && promotionType === 'manual' && (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Enrollment Register</h3>
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{selectedStudents.length} / {students.length} Selected</div>
                            </div>
                        </div>
                        <button
                            onClick={toggleSelectAll}
                            className="w-full sm:w-auto px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                        >
                            {selectedStudents.length === students.length ? 'Deselect Global' : 'Select All Personnel'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading students...</div>
                    ) : students.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No students found in selected class.</div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 w-16">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.length === students.length && students.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded-lg bg-slate-900 border-white/10 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
                                            />
                                        </th>
                                        <th className="px-8 py-5">Register #</th>
                                        <th className="px-8 py-5 font-black uppercase tracking-widest">Student Personnel</th>
                                        <th className="px-8 py-5 text-center">Reference Roll</th>
                                        <th className="px-8 py-5 text-right">Condition</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {students.map((student) => (
                                        <tr key={student._id} className={`${selectedStudents.includes(student._id) ? 'bg-indigo-600/5' : ''} hover:bg-white/5 transition-colors group`}>
                                            <td className="px-8 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudents.includes(student._id)}
                                                    onChange={() => toggleStudent(student._id)}
                                                    className="w-4 h-4 rounded-lg bg-slate-900 border-white/10 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
                                                />
                                            </td>
                                            <td className="px-8 py-4 font-mono text-indigo-400 text-xs font-black uppercase tracking-widest">{student.profile.admissionNo}</td>
                                            <td className="px-8 py-4">
                                                <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{student.firstName} {student.lastName}</div>
                                            </td>
                                            <td className="px-8 py-4 text-center text-slate-500 font-black">{student.profile.rollNo}</td>
                                            <td className="px-8 py-4 text-right">
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black uppercase tracking-widest">Verified</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Action Bar */}
            <div className="p-6 sm:p-8 glass-dark rounded-[2.5rem] border border-white/5 shadow-2xl flex justify-between items-center bg-slate-950/40">
                <div className="text-xs text-slate-500 font-medium">
                    {promotionType === 'auto'
                        ? 'System will evaluate exam scores to determine eligibility.'
                        : 'Manually select students to bypass exam criteria.'}
                </div>
                <button
                    onClick={handlePromote}
                    disabled={promoting || (promotionType === 'manual' && selectedStudents.length === 0) || !toClass || !fromClass}
                    className={`flex items-center justify-center gap-3 px-10 py-4 text-white rounded-[2rem] font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xl ${promotionType === 'auto'
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/40'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/40'
                        }`}
                >
                    {promoting ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>{promotionType === 'auto' ? 'Execute Auto-Promotion' : 'Initiate Manual Promotion'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
