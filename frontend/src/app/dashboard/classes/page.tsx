"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../utils/api';
import { GRADE_LEVELS, getGradesForLevel } from '../../utils/gradeLevels';
import {
    Plus, Pencil, Trash2, User, BookOpen, Building2,
    X, Users, Search, ChevronLeft,
    ChevronRight, BookOpenCheck, ArrowUpRight, SlidersHorizontal
} from 'lucide-react';

export default function ClassesPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tenantSettings, setTenantSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeGrade, setActiveGrade] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

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
        setLoading(true);
        setLoadError('');
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
        } catch (e) { console.error(e); setLoadError('Could not load classes. Check your connection and try again.'); }
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
        const finalSubjects = [...formData.subjects];
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

    const filteredClasses = useMemo(() => {
        const query = search.trim().toLowerCase();
        return classes.filter((c: any) => {
            const matchesGrade = activeGrade === 'all' || (c.grade || c.name) === activeGrade;
            const teacherName = c.classTeacher ? `${c.classTeacher.firstName || ''} ${c.classTeacher.lastName || ''}` : '';
            const matchesSearch = !query || [c.name, c.grade, c.section, c.room, teacherName]
                .some((value) => String(value || '').toLowerCase().includes(query));
            return matchesGrade && matchesSearch;
        }).sort((a: any, b: any) => `${a.grade || a.name} ${a.section || ''}`.localeCompare(`${b.grade || b.name} ${b.section || ''}`));
    }, [classes, activeGrade, search]);
    const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
    const pagedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);
    useEffect(() => { setPage(1); }, [activeGrade, search]);

    return (
        <div className="mx-auto max-w-7xl space-y-5 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"><Building2 className="h-3 w-3" /> Academic setup</span>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Classes</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage class sections, teachers, subjects, and enrolled students.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setIsModalOpen(true); setEditId(null); resetForm(); }}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900"
                    >
                        <Plus className="w-4 h-4" /> Add Class
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                    { label: 'Class sections', value: classes.length, icon: <Building2 className="h-4 w-4" />, tone: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200' },
                    { label: 'Enrolled students', value: classes.reduce((sum: number, item: any) => sum + (Number(item.studentCount) || 0), 0), icon: <Users className="h-4 w-4" />, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200' },
                    { label: 'Class teachers assigned', value: classes.filter((item: any) => item.classTeacher).length, icon: <User className="h-4 w-4" />, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' },
                ].map(metric => (
                    <div key={metric.label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.tone}`}>{metric.icon}</span>
                        <span><span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{metric.label}</span><strong className="mt-0.5 block text-xl font-black text-slate-900 dark:text-white">{metric.value}</strong></span>
                    </div>
                ))}
            </div>

            {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><span>{loadError}</span><button onClick={() => void fetchData()} className="font-semibold underline">Try again</button></div>}

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                    <div><h2 className="text-base font-bold text-slate-900 dark:text-white">Class sections</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Search, filter, and manage your school classes.</p></div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative min-w-0 sm:min-w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search class, teacher, room..." aria-label="Search classes" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-cyan-900/40" /></label>
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800"><SlidersHorizontal className="h-4 w-4 text-slate-400" /><span className="sr-only">Filter by grade</span><select value={activeGrade} onChange={(e) => setActiveGrade(e.target.value)} className="min-w-32 bg-transparent py-2.5 text-sm font-medium text-slate-700 outline-none dark:text-slate-200"><option value="all">All grades</option>{gradeNames.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
                    </div>
                </div>

                {loading ? <div className="space-y-3 p-4" aria-label="Loading classes">{[1, 2, 3, 4].map((row) => <div key={row} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div> : filteredClasses.length === 0 ? <div className="px-5 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/40 dark:text-cyan-300"><Building2 className="h-6 w-6" /></div><h3 className="mt-4 font-bold text-slate-900 dark:text-white">{classes.length ? 'No matching classes' : 'No classes yet'}</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{classes.length ? 'Try changing your search or grade filter.' : 'Create your first class to start organizing students and lessons.'}</p>{canManage && classes.length === 0 && <button onClick={() => { setIsModalOpen(true); setEditId(null); resetForm(); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"><Plus className="h-4 w-4" />Add class</button>}</div> : <>
                    <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {pagedClasses.map((c: any) => (
                            <article key={c._id} className="flex min-h-60 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-cyan-700">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/50 dark:text-cyan-300"><Building2 className="h-5 w-5" /></span>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-bold text-slate-900 dark:text-white">{c.name}{c.section ? ' · ' + c.section : ''}</h3>
                                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{c.grade || c.gradeLevel || 'Class'}{c.room ? ' · Room ' + c.room : ''}</p>
                                        </div>
                                    </div>
                                    {canManage && <div className="flex shrink-0 gap-1">
                                        <button aria-label={'Edit ' + c.name} onClick={() => handleEdit(c)} className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-[#1E3A8A] dark:hover:bg-slate-800"><Pencil className="h-4 w-4" /></button>
                                        <button aria-label={'Delete ' + c.name} onClick={() => handleDelete(c._id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button>
                                    </div>}
                                </div>
                                <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                                    <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Students</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white"><Users className="h-3.5 w-3.5 text-slate-400" />{c.studentCount ?? 0}</p></div>
                                    <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Subjects</p><p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800 dark:text-white"><BookOpenCheck className="h-3.5 w-3.5 text-slate-400" />{c.subjects?.length || 0}</p></div>
                                    <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Room</p><p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-white">{c.room || '—'}</p></div>
                                </div>
                                <div className="mt-4 min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Class teacher</p>
                                    <p className="mt-1 flex items-center gap-2 truncate text-sm font-medium text-slate-700 dark:text-slate-200"><User className="h-4 w-4 shrink-0 text-slate-400" />{c.classTeacher ? c.classTeacher.firstName + ' ' + c.classTeacher.lastName : 'Not assigned'}</p>
                                </div>
                                <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                                    <button onClick={() => router.push('/dashboard/timetable?class=' + encodeURIComponent(c._id))} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1E3A8A] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-900">Timetable<ArrowUpRight className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => handleViewStudents(c)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Manage students</button>
                                </div>
                            </article>
                        ))}
                    </div>                    <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><span>Showing {Math.min((page - 1) * pageSize + 1, filteredClasses.length)}–{Math.min(page * pageSize, filteredClasses.length)} of {filteredClasses.length} classes</span><div className="flex items-center gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"><ChevronLeft className="h-4 w-4" />Previous</button><span className="min-w-16 text-center">Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200">Next<ChevronRight className="h-4 w-4" /></button></div></footer>
                </>}
            </section>

            {/* Add/Edit Class Modal */}
            {isModalOpen && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsModalOpen(false); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="class-form-title" className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 id="class-form-title" className="text-lg font-bold text-slate-800 dark:text-white">{editId ? 'Edit Class' : 'Add New Class'}</h2>
                            <button aria-label="Close class form" onClick={() => setIsModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-5 overflow-y-auto p-4 sm:p-6">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsStudentsModalOpen(false); }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="class-students-title" className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 id="class-students-title" className="text-lg font-bold text-slate-800 dark:text-white">
                                {selectedClassForStudents.name}{selectedClassForStudents.section ? ` — Section ${selectedClassForStudents.section}` : ''}
                            </h2>
                            <button aria-label="Close student list" onClick={() => setIsStudentsModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">
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
