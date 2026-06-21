"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Pencil, Trash2, X, Search, BookOpen, Loader2, Check } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Teacher = { _id?: string; id?: string; firstName?: string; lastName?: string };
type SubjectItem = { _id: string; name: string; code: string };
type ClassSubject = {
    subject: SubjectItem;
    teachers: Teacher[];
    weeklyPeriods?: number;
    room?: string;
};
type AcademicClass = {
    _id: string;
    name: string;
    section?: string;
    grade?: string;
    subjects?: ClassSubject[];
};

const tid = (t: Teacher | string) =>
    typeof t === 'string' ? t : t._id || t.id || '';
const tname = (t: Teacher) =>
    `${t.firstName || ''} ${t.lastName || ''}`.trim();

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function SubjectAllocationPage() {
    const [classes, setClasses] = useState<AcademicClass[]>([]);
    const [subjects, setSubjects] = useState<SubjectItem[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState('');
    const [selectedClass, setSelectedClass] = useState<AcademicClass | null>(null);
    const [userRole, setUserRole] = useState('');

    // Add-row state
    const [addSubjectId, setAddSubjectId] = useState('');
    const [addPrimaryTeacherId, setAddPrimaryTeacherId] = useState('');
    const [addAssistantTeacherId, setAddAssistantTeacherId] = useState('');
    const [addWeeklyPeriods, setAddWeeklyPeriods] = useState('');
    const [addRoom, setAddRoom] = useState('');

    // Edit state
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editSubjectId, setEditSubjectId] = useState('');
    const [editPrimaryTeacherId, setEditPrimaryTeacherId] = useState('');
    const [editAssistantTeacherId, setEditAssistantTeacherId] = useState('');
    const [editWeeklyPeriods, setEditWeeklyPeriods] = useState('');
    const [editRoom, setEditRoom] = useState('');

    /* ── Fetch ─────────────────────────────────────────────────────────── */
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [cRes, sRes, tRes] = await Promise.all([
                api.get('/classes'),
                api.get('/subjects'),
                api.get('/teachers'),
            ]);
            const cls: AcademicClass[] = cRes.data.data || [];
            setClasses(cls);
            setSubjects(sRes.data.data || []);
            setTeachers(tRes.data.data || []);
            // keep selected class fresh
            if (selectedClass) {
                const fresh = cls.find(c => c._id === selectedClass._id);
                setSelectedClass(fresh || cls[0] || null);
            } else {
                setSelectedClass(cls[0] || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role || '');
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isAdmin = ['school-admin', 'super-admin'].includes(userRole);

    /* ── Helpers ────────────────────────────────────────────────────────── */
    const getSubjectName = (id: string) => {
        const s = subjects.find(x => x._id === id);
        return s ? s.name : '—';
    };
    const getTeacherName = (id: string) => {
        const t = teachers.find(x => tid(x) === id);
        return t ? tname(t) : '—';
    };

    const classLabel = (c: AcademicClass) =>
        `${c.grade || c.name}${c.section ? ` - Section ${c.section}` : ''}`;

    const filteredClasses = classes.filter(c =>
        classLabel(c).toLowerCase().includes(search.toLowerCase())
    );

    /* ── Build subjects payload from current allocations + change ───────── */
    const buildPayload = (allocations: ClassSubject[]) =>
        allocations.map(cs => ({
            subject: cs.subject._id,
            teachers: cs.teachers.map(tid),
        }));

    /* ── Save allocation to backend via PUT /classes/:id ───────────────── */
    const saveAllocations = async (newAllocations: ClassSubject[]) => {
        if (!selectedClass) return;
        setSaving(true);
        try {
            await api.put(`/classes/${selectedClass._id}`, {
                subjects: buildPayload(newAllocations),
            });
            await fetchAll();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    /* ── Add allocation ─────────────────────────────────────────────────── */
    const handleAdd = async () => {
        if (!selectedClass || !addSubjectId || !addPrimaryTeacherId) return;
        const existing = selectedClass.subjects || [];

        // prevent duplicate subject
        if (existing.some(cs => cs.subject._id === addSubjectId)) {
            alert('Subject already allocated to this class.');
            return;
        }

        const subjectObj = subjects.find(s => s._id === addSubjectId)!;
        const teacherIds = [addPrimaryTeacherId, addAssistantTeacherId].filter(Boolean);

        const newEntry: ClassSubject = {
            subject: subjectObj,
            teachers: teacherIds.map(id => teachers.find(t => tid(t) === id)!).filter(Boolean),
            weeklyPeriods: addWeeklyPeriods ? Number(addWeeklyPeriods) : undefined,
            room: addRoom || undefined,
        };

        await saveAllocations([...existing, newEntry]);
        setAddSubjectId('');
        setAddPrimaryTeacherId('');
        setAddAssistantTeacherId('');
        setAddWeeklyPeriods('');
        setAddRoom('');
    };

    /* ── Start edit ─────────────────────────────────────────────────────── */
    const startEdit = (idx: number) => {
        const cs = (selectedClass?.subjects || [])[idx];
        if (!cs) return;
        setEditingIdx(idx);
        setEditSubjectId(cs.subject._id);
        const [primary, assistant] = cs.teachers;
        setEditPrimaryTeacherId(primary ? tid(primary) : '');
        setEditAssistantTeacherId(assistant ? tid(assistant) : '');
        setEditWeeklyPeriods(cs.weeklyPeriods ? String(cs.weeklyPeriods) : '');
        setEditRoom(cs.room || '');
    };

    const cancelEdit = () => setEditingIdx(null);

    /* ── Save edit ──────────────────────────────────────────────────────── */
    const handleSaveEdit = async () => {
        if (!selectedClass || editingIdx === null) return;
        const existing = [...(selectedClass.subjects || [])];
        const subjectObj = subjects.find(s => s._id === editSubjectId)!;
        const teacherIds = [editPrimaryTeacherId, editAssistantTeacherId].filter(Boolean);

        existing[editingIdx] = {
            subject: subjectObj,
            teachers: teacherIds.map(id => teachers.find(t => tid(t) === id)!).filter(Boolean),
            weeklyPeriods: editWeeklyPeriods ? Number(editWeeklyPeriods) : undefined,
            room: editRoom || undefined,
        };

        await saveAllocations(existing);
        setEditingIdx(null);
    };

    /* ── Delete allocation ──────────────────────────────────────────────── */
    const handleDelete = async (idx: number) => {
        if (!selectedClass) return;
        if (!confirm('Remove this subject allocation?')) return;
        const updated = (selectedClass.subjects || []).filter((_, i) => i !== idx);
        await saveAllocations(updated);
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    const allocations = selectedClass?.subjects || [];

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-screen flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                    Class Subject Allocation Management
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Assign subjects and teachers to each class section.
                </p>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center py-32 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-4 flex-1">
                    {/* ── Left Panel: Class List ── */}
                    <div className="w-full lg:w-64 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="px-4 pt-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-sm font-bold text-slate-700 dark:text-white mb-2">Classes</h2>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <ul className="flex-1 overflow-y-auto py-2">
                            {filteredClasses.length === 0 && (
                                <li className="px-4 py-6 text-center text-xs text-slate-400">No classes found.</li>
                            )}
                            {filteredClasses.map(c => (
                                <li key={c._id}>
                                    <button
                                        onClick={() => { setSelectedClass(c); setEditingIdx(null); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition ${
                                            selectedClass?._id === c._id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {classLabel(c)}
                                        {selectedClass?._id === c._id && (
                                            <span className="ml-1 text-[10px] opacity-80">(Selected)</span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* ── Right Panel: Allocations ── */}
                    <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                {selectedClass ? `${classLabel(selectedClass)} Allocations` : 'Select a class'}
                            </h2>
                            {saving && (
                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                </span>
                            )}
                        </div>

                        {!selectedClass ? (
                            <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
                                Select a class from the left to manage its subject allocations.
                            </div>
                        ) : (
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                                            <th className="px-5 py-3">Subject</th>
                                            <th className="px-5 py-3">Primary Teacher</th>
                                            <th className="px-5 py-3">Assistant Teacher</th>
                                            <th className="px-5 py-3">Weekly Periods</th>
                                            <th className="px-5 py-3">Room Number</th>
                                            {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {/* ── Add Row ── */}
                                        {isAdmin && (
                                            <tr className="bg-slate-50 dark:bg-slate-700/30">
                                                <td className="px-4 py-2.5">
                                                    <select
                                                        value={addSubjectId}
                                                        onChange={e => setAddSubjectId(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                    >
                                                        <option value="">Select subject…</option>
                                                        {subjects
                                                            .filter(s => !allocations.some(a => a.subject._id === s._id))
                                                            .map(s => (
                                                                <option key={s._id} value={s._id}>{s.name}</option>
                                                            ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <select
                                                        value={addPrimaryTeacherId}
                                                        onChange={e => setAddPrimaryTeacherId(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                    >
                                                        <option value="">Select teacher…</option>
                                                        {teachers.map(t => (
                                                            <option key={tid(t)} value={tid(t)}>{tname(t)}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <select
                                                        value={addAssistantTeacherId}
                                                        onChange={e => setAddAssistantTeacherId(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                    >
                                                        <option value="">Optional…</option>
                                                        {teachers
                                                            .filter(t => tid(t) !== addPrimaryTeacherId)
                                                            .map(t => (
                                                                <option key={tid(t)} value={tid(t)}>{tname(t)}</option>
                                                            ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={addWeeklyPeriods}
                                                        onChange={e => setAddWeeklyPeriods(e.target.value)}
                                                        placeholder="e.g. 5"
                                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <input
                                                        value={addRoom}
                                                        onChange={e => setAddRoom(e.target.value)}
                                                        placeholder="e.g. Room 101"
                                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button
                                                        onClick={handleAdd}
                                                        disabled={!addSubjectId || !addPrimaryTeacherId || saving}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition ml-auto"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Add Subject Allocation
                                                    </button>
                                                </td>
                                            </tr>
                                        )}

                                        {/* ── Existing allocations ── */}
                                        {allocations.length === 0 && (
                                            <tr>
                                                <td colSpan={isAdmin ? 6 : 5} className="px-5 py-14 text-center text-slate-400 text-sm">
                                                    No subjects allocated to this class yet.
                                                </td>
                                            </tr>
                                        )}
                                        {allocations.map((cs, idx) => {
                                            const primaryTeacher = cs.teachers[0];
                                            const assistantTeacher = cs.teachers[1];
                                            const isEditing = editingIdx === idx;

                                            if (isEditing) {
                                                return (
                                                    <tr key={idx} className="bg-blue-50 dark:bg-blue-900/10">
                                                        <td className="px-4 py-2.5">
                                                            <select
                                                                value={editSubjectId}
                                                                onChange={e => setEditSubjectId(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                            >
                                                                {subjects.map(s => (
                                                                    <option key={s._id} value={s._id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <select
                                                                value={editPrimaryTeacherId}
                                                                onChange={e => setEditPrimaryTeacherId(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                            >
                                                                <option value="">Select teacher…</option>
                                                                {teachers.map(t => (
                                                                    <option key={tid(t)} value={tid(t)}>{tname(t)}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <select
                                                                value={editAssistantTeacherId}
                                                                onChange={e => setEditAssistantTeacherId(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                            >
                                                                <option value="">Optional…</option>
                                                                {teachers
                                                                    .filter(t => tid(t) !== editPrimaryTeacherId)
                                                                    .map(t => (
                                                                        <option key={tid(t)} value={tid(t)}>{tname(t)}</option>
                                                                    ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={editWeeklyPeriods}
                                                                onChange={e => setEditWeeklyPeriods(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <input
                                                                value={editRoom}
                                                                onChange={e => setEditRoom(e.target.value)}
                                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={handleSaveEdit}
                                                                    disabled={saving}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={cancelEdit}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr
                                                    key={idx}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                >
                                                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-white">
                                                        {cs.subject.name}
                                                        <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                                                            {cs.subject.code}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {primaryTeacher ? tname(primaryTeacher as Teacher) : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                                                        {assistantTeacher ? tname(assistantTeacher as Teacher) : '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {cs.weeklyPeriods ?? '—'}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">
                                                        {cs.room || '—'}
                                                    </td>
                                                    {isAdmin && (
                                                        <td className="px-5 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => startEdit(idx)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-500 text-slate-400 transition"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(idx)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:border-red-400 hover:text-red-500 text-slate-400 transition"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
