"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import { GRADE_LEVELS } from '../../utils/gradeLevels';
import { Plus, Pencil, Trash2, X, Search, Filter, GraduationCap, ChevronLeft } from 'lucide-react';

const PAGE_SIZE = 8;

const CATEGORIES = ['STEM', 'Arts & Humanities', 'Social Sciences', 'Languages', 'Physical Education', 'Other'];

type Teacher = {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
};

type Resource = {
    _id: string;
    title: string;
    url: string;
    type: string;
};

type Subject = {
    _id: string;
    name: string;
    code: string;
    type: string;
    category?: string;
    status?: string;
    gradeLevel?: string[];
    gradeLevels?: string[];
    teachers?: Array<Teacher | string>;
    resources?: Resource[];
};

type User = {
    role?: string;
};

type TenantSettings = {
    config?: {
        gradeLevels?: string[];
    };
};

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const getTeacherId = (teacher: Teacher | string) => (
    typeof teacher === 'string' ? teacher : teacher._id || teacher.id || ''
);

const getErrorMessage = (err: unknown, fallback: string) => {
    const apiError = err as ApiError;
    return apiError.response?.data?.message || fallback;
};

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null);

    // Table filters & pagination
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);

    // Add/Edit modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '', code: '', type: 'theory',
        category: '',
        gradeLevels: ['elementary', 'middle', 'high'] as string[],
        teachers: [] as string[]
    });

    // Resource modal
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [resourceForm, setResourceForm] = useState({ title: '', url: '', type: 'link' });

    const fetchData = async () => {
        try {
            const [subjectRes, teacherRes, tenantRes] = await Promise.all([
                api.get('/subjects'), api.get('/teachers'),
                api.get('/tenants/me')
            ]);
            setSubjects(subjectRes.data.data || []);
            setAllTeachers(teacherRes.data.data || []);
            setTenantSettings(tenantRes.data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUser(JSON.parse(userStr));
        fetchData();
    }, []);

    const isAdmin = user && ['school-admin', 'super-admin'].includes(user.role ?? '');
    const canManageResources = user && ['school-admin', 'super-admin', 'teacher'].includes(user.role ?? '');

    // Derived teachers string for a subject
    const getTeacherNames = (s: Subject) =>
        s.teachers
            ?.filter((t): t is Teacher => typeof t !== 'string')
            .map(t => `${t.firstName || ''} ${t.lastName || ''}`.trim())
            .filter(Boolean)
            .join(', ') || '—';

    // Filtered & paginated data
    const filtered = useMemo(() => {
        return subjects.filter(s => {
            const matchSearch = !search ||
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.code.toLowerCase().includes(search.toLowerCase());
            const matchCat = !filterCategory || (s.category || 'Other') === filterCategory;
            const matchStatus = !filterStatus ||
                (filterStatus === 'active' ? s.status !== 'inactive' : s.status === 'inactive');
            return matchSearch && matchCat && matchStatus;
        });
    }, [subjects, search, filterCategory, filterStatus]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Reset page on filter change
    useEffect(() => { setPage(1); }, [search, filterCategory, filterStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                teachers: formData.teachers.filter(Boolean)
            };

            if (editId) await api.put(`/subjects/${editId}`, payload);
            else await api.post('/subjects', payload);
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (err: unknown) { alert(getErrorMessage(err, 'Operation failed')); }
    };

    const resetForm = () => {
        setFormData({ name: '', code: '', type: 'theory', category: '', gradeLevels: ['elementary', 'middle', 'high'], teachers: [] });
        setEditId(null);
    };

    const handleEdit = (s: Subject) => {
        setEditId(s._id);
        setFormData({
            name: s.name, code: s.code, type: s.type,
            category: s.category || '',
            gradeLevels: s.gradeLevels || s.gradeLevel || ['elementary', 'middle', 'high'],
            teachers: s.teachers?.map(getTeacherId).filter(Boolean) || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this subject?')) return;
        try { await api.delete(`/subjects/${id}`); fetchData(); }
        catch { alert('Delete failed'); }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubject) return;
        try {
            await api.post(`/subjects/${selectedSubject._id}/resources`, resourceForm);
            setResourceForm({ title: '', url: '', type: 'link' });
            const { data } = await api.get('/subjects');
            setSubjects(data.data || []);
            const updated = (data.data || []).find((s: Subject) => s._id === selectedSubject._id);
            if (updated) setSelectedSubject(updated);
        } catch { alert('Failed to add resource'); }
    };

    const handleRemoveResource = async (resourceId: string) => {
        if (!selectedSubject) return;
        try {
            await api.delete(`/subjects/${selectedSubject._id}/resources/${resourceId}`);
            const { data } = await api.get('/subjects');
            setSubjects(data.data || []);
            const updated = (data.data || []).find((s: Subject) => s._id === selectedSubject._id);
            if (updated) setSelectedSubject(updated);
        } catch { alert('Failed to remove resource'); }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-screen flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Subject Management Directory</h1>
                {isAdmin && (
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> New Subject
                    </button>
                )}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search subjects..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                            className="pl-8 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                            <option value="">Category</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="pl-8 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                            <option value="">Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                <th className="px-5 py-4">Subject Name</th>
                                <th className="px-5 py-4">Subject Code</th>
                                <th className="px-5 py-4">Category</th>
                                <th className="px-5 py-4">Assigned Teachers</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-slate-400 animate-pulse">Loading subjects...</td></tr>
                            ) : paginated.length === 0 ? (
                                <tr><td colSpan={5} className="px-5 py-16 text-center text-slate-400">No subjects found.</td></tr>
                            ) : paginated.map((s) => (
                                <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors group">
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => { setSelectedSubject(s); setIsResourceModalOpen(true); }}
                                            className="font-semibold text-slate-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition text-left"
                                        >
                                            {s.name}
                                        </button>
                                        {s.resources && s.resources.length > 0 && (
                                            <span className="ml-2 text-[10px] text-blue-500">({s.resources.length} resource{s.resources.length !== 1 ? 's' : ''})</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">{s.code}</td>
                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{s.category || '—'}</td>
                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">{getTeacherNames(s)}</td>
                                    <td className="px-5 py-4 text-right">
                                        {isAdmin ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleEdit(s)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-500 text-slate-400 transition">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(s._id)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 hover:border-red-400 hover:text-red-500 text-slate-400 transition">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-3 mt-4 text-sm text-slate-600 dark:text-slate-400">
                <span>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:border-blue-400 hover:text-blue-500 transition">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:border-blue-400 hover:text-blue-500 transition font-medium">
                    Next
                </button>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editId ? 'Edit Subject' : 'New Subject'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subject Name</label>
                                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                    placeholder="e.g. Mathematics" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subject Code</label>
                                    <input required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                        placeholder="e.g. MATH101" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white">
                                        <option value="">Select...</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                                <div className="flex gap-2">
                                    {['theory', 'practical', 'both'].map(t => (
                                        <button key={t} type="button" onClick={() => setFormData({ ...formData, type: t })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition ${formData.type === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 hover:border-blue-400'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5" /> Grade Levels
                                </label>
                                <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                    {GRADE_LEVELS.filter(l => !tenantSettings?.config?.gradeLevels || tenantSettings.config.gradeLevels.includes(l.id)).map(l => (
                                        <label key={l.id} className="flex items-center gap-2.5 cursor-pointer">
                                            <input type="checkbox" checked={formData.gradeLevels.includes(l.id)}
                                                onChange={e => setFormData({ ...formData, gradeLevels: e.target.checked ? [...formData.gradeLevels, l.id] : formData.gradeLevels.filter(id => id !== l.id) })}
                                                className="w-4 h-4 rounded accent-blue-500" />
                                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{l.name}</span>
                                            <span className="text-[10px] text-slate-400">{l.grades.join(', ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Qualified Teachers</label>
                                <div className="space-y-1.5 max-h-36 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                    {allTeachers.map((t) => {
                                        const teacherId = getTeacherId(t);

                                        return (
                                            <label key={teacherId} className="flex items-center gap-2.5 cursor-pointer">
                                                <input type="checkbox" checked={formData.teachers.includes(teacherId)}
                                                    onChange={e => setFormData({ ...formData, teachers: e.target.checked ? [...formData.teachers, teacherId] : formData.teachers.filter(id => id !== teacherId) })}
                                                    className="w-4 h-4 rounded accent-blue-500" />
                                                <span className="text-xs text-slate-700 dark:text-slate-300">{t.firstName} {t.lastName}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
                                    {editId ? 'Save Changes' : 'Create Subject'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resources Modal */}
            {isResourceModalOpen && selectedSubject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedSubject.name} — Resources</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Learning materials and external references</p>
                            </div>
                            <button onClick={() => setIsResourceModalOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Resource list */}
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                {(selectedSubject.resources?.length ?? 0) === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-sm italic">No resources added yet.</div>
                                ) : selectedSubject.resources?.map((r) => (
                                    <div key={r._id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3">
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{r.title}</p>
                                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{r.url}</a>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5 block">{r.type}</span>
                                        </div>
                                        {canManageResources && (
                                            <button onClick={() => handleRemoveResource(r._id)} className="shrink-0 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Add resource form */}
                            {canManageResources && (
                                <form onSubmit={handleAddResource} className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-white mb-1">Add Resource</h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Title</label>
                                        <input required value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                            placeholder="e.g. Chapter 1 PDF" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">URL</label>
                                        <input required value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                                            placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type</label>
                                        <select value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white">
                                            <option value="link">Link</option>
                                            <option value="pdf">PDF</option>
                                            <option value="video">Video</option>
                                            <option value="image">Image</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition">
                                        Add Resource
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
