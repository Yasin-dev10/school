"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../utils/api';
import { GRADE_LEVELS, getGradesForLevel } from '../../utils/gradeLevels';
import {
    Plus, Pencil, Trash2, User, DoorOpen, BookOpen,
    X, GraduationCap, Users, CalendarDays
} from 'lucide-react';

export default function ClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tenantSettings, setTenantSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeGrade, setActiveGrade] = useState<string>('all');

    const [selectedClassForStudents, setSelectedClassForStudents] = useState<any>(null);
    const [classStudents, setClassStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: '', section: '', gradeLevel: '', grade: '',
        room: '', classTeacher: '',
        subjects: [] as { subject: string; teachers: string[] }[]
    });
    const [editId, setEditId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    const [currentSubjectIds, setCurrentSubjectIds] = useState<string[]>([]);
    const [tempSubjectId, setTempSubjectId] = useState('');
    const [currentSubjectTeachers, setCurrentSubjectTeachers] = useState<string[]>([]);
    const [tempTeacherId, setTempTeacherId] = useState('');

    const fetchData = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) setUserRole(JSON.parse(userStr).role);
            const [classRes, teacherRes, subjectRes, tenantRes] = await Promise.all([
                api.get('/classes'), api.get('/teachers'),
                api.get('/subjects'), api.get('/tenants/me')
            ]);
            setClasses(classRes.data.data);
            setTeachers(teacherRes.data.data);
            setSubjects(subjectRes.data.data);
            setTenantSettings(tenantRes.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleViewStudents = async (c: any) => {
        setSelectedClassForStudents(c);
        setIsStudentsModalOpen(true);
        setLoadingStudents(true);
        try {
            const res = await api.get(`/students?class=${c._id}`);
            setClassStudents(res.data.data);
        } catch { setClassStudents([]); }
        finally { setLoadingStudents(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalSubjects = [...formData.subjects];
        if (currentSubjectIds.length > 0 && currentSubjectTeachers.length > 0) {
            currentSubjectIds.forEach(subId => {
                const i = finalSubjects.findIndex(s => s.subject === subId);
                if (i > -1) finalSubjects[i].teachers = Array.from(new Set([...finalSubjects[i].teachers, ...currentSubjectTeachers]));
                else finalSubjects.push({ subject: subId, teachers: [...currentSubjectTeachers] });
            });
        }
        const dataToSave = { ...formData, subjects: finalSubjects, classTeacher: formData.classTeacher || null };
        try {
            if (editId) await api.put(`/classes/${editId}`, dataToSave);
            else await api.post('/classes', dataToSave);
            setIsModalOpen(false); resetForm(); setEditId(null); fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Operation failed');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', section: '', gradeLevel: '', grade: '', room: '', classTeacher: '', subjects: [] });
        setCurrentSubjectIds([]); setTempSubjectId('');
        setCurrentSubjectTeachers([]); setTempTeacherId('');
    };

    const handleEdit = (c: any) => {
        setEditId(c._id);
        setFormData({
            name: c.name, section: c.section, gradeLevel: c.gradeLevel || '',
            grade: c.grade || '', room: c.room || '',
            classTeacher: c.classTeacher?._id || '',
            subjects: c.subjects?.filter((s: any) => s.subject).map((s: any) => ({
                subject: s.subject?._id || s.subject,
                teachers: s.teachers?.map((t: any) => t._id || t) || []
            })) || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this class?')) return;
        try { await api.delete(`/classes/${id}`); fetchData(); }
        catch { alert('Delete failed'); }
    };

    const addSubjectToList = () => {
        if (!tempSubjectId || currentSubjectIds.includes(tempSubjectId)) return;
        setCurrentSubjectIds([...currentSubjectIds, tempSubjectId]); setTempSubjectId('');
    };
    const removeSubjectFromList = (id: string) => setCurrentSubjectIds(currentSubjectIds.filter(i => i !== id));
    const addTeacherToCurrentSubject = () => {
        if (!tempTeacherId || currentSubjectTeachers.includes(tempTeacherId)) return;
        setCurrentSubjectTeachers([...currentSubjectTeachers, tempTeacherId]); setTempTeacherId('');
    };
    const removeTeacherFromCurrentSubject = (id: string) => setCurrentSubjectTeachers(currentSubjectTeachers.filter(i => i !== id));

    const addSubjectToForm = () => {
        if (currentSubjectIds.length === 0 || currentSubjectTeachers.length === 0) {
            alert('Please select at least one subject and one teacher.'); return;
        }
        const newSubjects = [...formData.subjects];
        currentSubjectIds.forEach(subId => {
            const i = newSubjects.findIndex(s => s.subject === subId);
            if (i > -1) newSubjects[i] = { ...newSubjects[i], teachers: Array.from(new Set([...newSubjects[i].teachers, ...currentSubjectTeachers])) };
            else newSubjects.push({ subject: subId, teachers: [...currentSubjectTeachers] });
        });
        setFormData({ ...formData, subjects: newSubjects });
        setCurrentSubjectIds([]); setCurrentSubjectTeachers([]); setTempSubjectId(''); setTempTeacherId('');
    };
    const removeSubjectFromForm = (idx: number) => {
        const s = [...formData.subjects]; s.splice(idx, 1); setFormData({ ...formData, subjects: s });
    };

    const getSubjectName = (id: string) => {
        const s: any = subjects.find((sub: any) => sub._id === id);
        return s ? `${s.name} (${s.code})` : 'Unknown';
    };
    const getTeacherName = (id: string) => {
        const t: any = teachers.find((tea: any) => tea._id === id);
        return t ? `${t.firstName} ${t.lastName}` : 'Unknown';
    };

    const canManage = ['school-admin', 'super-admin'].includes(userRole);

    // Derive unique grade names for tabs
    const gradeNames = Array.from(new Set(
        classes.map((c: any) => c.grade || c.name).filter(Boolean)
    )).sort();

    const filteredClasses = activeGrade === 'all'
        ? classes
        : classes.filter((c: any) => (c.grade || c.name) === activeGrade);

    // Group by grade
    const grouped: Record<string, any[]> = {};
    filteredClasses.forEach((c: any) => {
        const key = c.grade || c.name || 'Other';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
    });
    const groupKeys = Object.keys(grouped).sort();

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Academic Classes Overview</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage grade levels, sections, and class teachers.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setIsModalOpen(true); setEditId(null); resetForm(); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Class
                    </button>
                )}
            </div>

            {/* Grade Tabs */}
            <div className="flex flex-wrap gap-1 mb-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 overflow-x-auto">
                <button
                    onClick={() => setActiveGrade('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                        activeGrade === 'all'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                    All Grades
                </button>
                {gradeNames.map(g => (
                    <button
                        key={g}
                        onClick={() => setActiveGrade(g)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                            activeGrade === g
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="py-20 text-center text-slate-400 animate-pulse">Loading classes...</div>
            )}

            {/* Grouped Classes — 3-column grid */}
            {!loading && groupKeys.map(grade => (
                <div key={grade} className="mb-6">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white mb-3">{grade}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {grouped[grade].map((c: any) => (
                            <div key={c._id} className="bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-3">
                                {/* Title row */}
                                <div className="flex items-start justify-between">
                                    <h3 className="text-sm font-bold text-white leading-tight">
                                        {c.name}{c.section ? ` - Class ${c.section}` : ''}
                                    </h3>
                                    {canManage && (
                                        <div className="flex gap-1 shrink-0 ml-2">
                                            <button onClick={() => handleEdit(c)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleDelete(c._id)} className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 transition">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="space-y-1.5 text-sm flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Class Teacher:</span>
                                        <span className="text-white font-semibold text-right truncate max-w-[55%]">
                                            {c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Students:</span>
                                        <span className="text-white font-semibold">{c.studentCount ?? 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Room Number:</span>
                                        <span className="text-white font-semibold">{c.room || '—'}</span>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2 mt-1">
                                    <button
                                        onClick={() => router.push(`/dashboard/timetable?class=${c._id}`)}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition text-center"
                                    >
                                        View Timetable
                                    </button>
                                    <button
                                        onClick={() => handleViewStudents(c)}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition text-center"
                                    >
                                        Manage Students
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {!loading && classes.length === 0 && (
                <div className="py-20 text-center text-slate-400">No classes found. Add your first class.</div>
            )}

            {/* Add/Edit Class Modal */}
            {isModalOpen && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editId ? 'Edit Class' : 'Add New Class'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Class Name</label>
                                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Grade 10" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Section</label>
                                    <input required value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. A" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Grade Level</label>
                                    <select required value={formData.gradeLevel} onChange={e => setFormData({ ...formData, gradeLevel: e.target.value, grade: '' })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select Grade Level</option>
                                        {GRADE_LEVELS.filter(l => !tenantSettings?.config?.gradeLevels || tenantSettings.config.gradeLevels.includes(l.id))
                                            .map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Specific Grade</label>
                                    <select required value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })} disabled={!formData.gradeLevel}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
                                        <option value="">Select Grade</option>
                                        {formData.gradeLevel && getGradesForLevel(formData.gradeLevel).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Class Teacher</label>
                                    <select value={formData.classTeacher} onChange={e => setFormData({ ...formData, classTeacher: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">Select Teacher</option>
                                        {teachers.map((t: any) => <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Room Number</label>
                                    <input value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Optional" />
                                </div>
                            </div>

                            {/* Subject Allocations */}
                            <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <BookOpen className="w-4 h-4 text-blue-500" /> Subject Allocations
                                </label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">1. Select Subjects</p>
                                        <div className="flex gap-2">
                                            <select value={tempSubjectId} onChange={e => setTempSubjectId(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none">
                                                <option value="">Choose subject...</option>
                                                {subjects.map((s: any) => <option key={s._id} value={s._id} disabled={currentSubjectIds.includes(s._id)}>{s.name} ({s.code})</option>)}
                                            </select>
                                            <button type="button" onClick={addSubjectToList} disabled={!tempSubjectId}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-blue-500 transition">+ Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2 min-h-[32px]">
                                            {currentSubjectIds.length === 0 && <span className="text-xs text-slate-400 italic">None selected</span>}
                                            {currentSubjectIds.map(id => (
                                                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium">
                                                    {getSubjectName(id)}
                                                    <button type="button" onClick={() => removeSubjectFromList(id)}><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={currentSubjectIds.length === 0 ? 'opacity-40 pointer-events-none' : ''}>
                                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">2. Assign Teachers</p>
                                        <div className="flex gap-2">
                                            <select value={tempTeacherId} onChange={e => setTempTeacherId(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none">
                                                <option value="">Choose teacher...</option>
                                                {teachers.map((t: any) => <option key={t._id} value={t._id} disabled={currentSubjectTeachers.includes(t._id)}>{t.firstName} {t.lastName}</option>)}
                                            </select>
                                            <button type="button" onClick={addTeacherToCurrentSubject} disabled={!tempTeacherId}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-blue-500 transition">+ Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-2 min-h-[32px]">
                                            {currentSubjectTeachers.length === 0 && <span className="text-xs text-slate-400 italic">None selected</span>}
                                            {currentSubjectTeachers.map(id => (
                                                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">
                                                    {getTeacherName(id)}
                                                    <button type="button" onClick={() => removeTeacherFromCurrentSubject(id)}><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="button" onClick={addSubjectToForm} disabled={currentSubjectIds.length === 0 || currentSubjectTeachers.length === 0}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition">
                                        Confirm Allocation
                                    </button>
                                    <div className="space-y-2">
                                        {formData.subjects.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">No subjects allocated yet.</p>}
                                        {formData.subjects.map((sub, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{getSubjectName(sub.subject)}</p>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {sub.teachers.map((tId: string) => (
                                                            <span key={tId} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{getTeacherName(tId)}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => removeSubjectFromForm(idx)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><X className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
                                    {editId ? 'Save Changes' : 'Create Class'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Students Modal */}
            {isStudentsModalOpen && selectedClassForStudents && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                {selectedClassForStudents.name}{selectedClassForStudents.section ? ` — Section ${selectedClassForStudents.section}` : ''}
                            </h2>
                            <button onClick={() => setIsStudentsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[500px] overflow-y-auto">
                            {loadingStudents ? (
                                <div className="py-16 text-center text-slate-400 animate-pulse">Loading students...</div>
                            ) : classStudents.length === 0 ? (
                                <div className="py-16 text-center text-slate-400">No students in this class.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 text-xs uppercase tracking-wide text-left">
                                            <th className="pb-3 px-2">Roll No</th>
                                            <th className="pb-3 px-2">Name</th>
                                            <th className="pb-3 px-2">Admission No</th>
                                            <th className="pb-3 px-2">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {classStudents.map((s: any) => (
                                            <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-3 px-2 font-mono text-xs text-blue-600">{s.profile?.rollNo || '—'}</td>
                                                <td className="py-3 px-2 font-semibold text-slate-800 dark:text-white">{s.firstName} {s.lastName}</td>
                                                <td className="py-3 px-2 text-slate-500 text-xs">{s.profile?.admissionNo || '—'}</td>
                                                <td className="py-3 px-2 text-slate-500 text-xs">{s.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
