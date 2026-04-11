"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { GRADE_LEVELS } from '../../utils/gradeLevels';
import {
    Plus,
    Pencil,
    Trash2,
    BookOpen,
    X,
    ExternalLink,
    FileText,
    Video,
    Image as ImageIcon,
    Link as LinkIcon,
    GraduationCap
} from 'lucide-react';


export default function SubjectsPage() {
    const [subjects, setSubjects] = useState([]);
    const [allTeachers, setAllTeachers] = useState([]);
    const [allClasses, setAllClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '', type: 'theory', gradeLevel: ['elementary', 'middle', 'high'] as string[], teachers: [] as string[] });
    const [editId, setEditId] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [resourceForm, setResourceForm] = useState({ title: '', url: '', type: 'link' });
    const [tenantSettings, setTenantSettings] = useState<any>(null);

    const [user, setUser] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [subjectRes, teacherRes, classRes, tenantRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/teachers'),
                api.get('/classes'),
                api.get('/tenants/me')
            ]);
            setSubjects(subjectRes.data.data);
            setAllTeachers(teacherRes.data.data);
            setAllClasses(classRes.data.data);
            setTenantSettings(tenantRes.data.data);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUser(JSON.parse(userStr));
        fetchData();
    }, []);

    const isAdmin = user && ['school-admin', 'super-admin'].includes(user.role);
    const canManageSubject = isAdmin; // Only admins can create/edit/delete subjects
    const canManageResources = user && ['school-admin', 'super-admin', 'teacher'].includes(user.role); // Teachers might need to manage resources

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                await api.put(`/subjects/${editId}`, formData);
            } else {
                await api.post('/subjects', formData);
            }
            setIsModalOpen(false);
            setFormData({ name: '', code: '', type: 'theory', gradeLevel: ['elementary', 'middle', 'high'], teachers: [] });
            setEditId(null);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Operation failed");
        }
    };

    const handleEdit = (s: any) => {
        setEditId(s._id);
        setFormData({
            name: s.name,
            code: s.code,
            type: s.type,
            gradeLevel: s.gradeLevel || ['elementary', 'middle', 'high'],
            teachers: s.teachers?.map((t: any) => t._id || t) || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Delete this subject?")) {
            try {
                await api.delete(`/subjects/${id}`);
                fetchData();
            } catch (err) {
                alert("Delete failed");
            }
        }
    };

    const handleAddResource = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/subjects/${selectedSubject._id}/resources`, resourceForm);
            setResourceForm({ title: '', url: '', type: 'link' });
            fetchData();
            // Refresh selected subject to show new resource
            const { data } = await api.get('/subjects');
            const updated = data.data.find((s: any) => s._id === selectedSubject._id);
            setSelectedSubject(updated);
        } catch (err) {
            alert("Failed to add resource");
        }
    };

    const handleRemoveResource = async (resourceId: string) => {
        try {
            await api.delete(`/subjects/${selectedSubject._id}/resources/${resourceId}`);
            fetchData();
            const { data } = await api.get('/subjects');
            const updated = data.data.find((s: any) => s._id === selectedSubject._id);
            setSelectedSubject(updated);
        } catch (err) {
            alert("Failed to remove resource");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:row justify-between items-start sm:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Subjects</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure theory and practical subjects for curriculum management.</p>
                </div>
                {canManageSubject && (
                    <button
                        onClick={() => { setIsModalOpen(true); setEditId(null); setFormData({ name: '', code: '', type: 'theory', gradeLevel: ['elementary', 'middle', 'high'], teachers: [] }); }}
                        className="w-full sm:w-auto px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-bold transition shadow-lg shadow-fuchsia-500/20 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add New</span>
                    </button>

                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 animate-pulse font-medium italic">Synchronizing curriculum...</div>
                ) : subjects.map((s: any) => {
                    const assignedClasses = allClasses.filter((c: any) =>
                        c.subjects?.some((sub: any) => sub.subject?._id === s._id || sub.subject === s._id)
                    );

                    return (
                        <div key={s._id} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-fuchsia-500/30 transition-all group relative">
                            <div className="flex items-start justify-between mb-2">
                                <span className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold mb-4">
                                    {s.name.charAt(0)}
                                </span>
                                {canManageSubject && (
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEdit(s)} className="p-1.5 text-slate-500 hover:text-white transition">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(s._id)} className="p-1.5 text-slate-500 hover:text-red-400 transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                )}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{s.name}</h3>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">{s.code}</p>

                            {/* Relationship: Classes */}
                            <div className="space-y-2 mb-4">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Assigned To</p>
                                <div className="flex flex-wrap gap-1">
                                    {assignedClasses.length > 0 ? assignedClasses.map((c: any) => (
                                        <span key={c._id} className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] text-slate-400">
                                            {c.name}-{c.section}
                                        </span>
                                    )) : <span className="text-[9px] text-slate-700 italic">No classes yet</span>}
                                </div>
                            </div>

                            {/* Relationship: Qualified Teachers */}
                            <div className="space-y-2 mb-6">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Qualified Teachers</p>
                                <div className="flex flex-wrap gap-1">
                                    {s.teachers?.length > 0 ? s.teachers.map((t: any) => (
                                        <span key={t._id} className="px-1.5 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded text-[9px] text-indigo-400">
                                            {t.firstName} {t.lastName}
                                        </span>
                                    )) : <span className="text-[9px] text-slate-700 italic">None assigned</span>}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${s.type === 'theory' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    s.type === 'practical' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                        'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                    }`}>
                                    {s.type}
                                </span>
                                <span className="text-[9px] text-slate-600">ID: {s._id.slice(-5)}</span>
                            </div>
                            <button
                                onClick={() => { setSelectedSubject(s); setIsResourceModalOpen(true); }}
                                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 rounded-2xl text-xs font-bold transition border border-white/5 flex items-center justify-center gap-2"
                            >
                                <BookOpen className="w-4 h-4" />
                                <span>View Resources ({s.resources?.length || 0})</span>
                            </button>

                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="glass-dark w-full max-w-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6">
                            {editId ? 'Edit Subject' : 'New Subject'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subject Name</label>
                                <input
                                    required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-fuchsia-500/50"
                                    placeholder="e.g. Mathematics"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subject Code</label>
                                <input
                                    required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-fuchsia-500/50"
                                    placeholder="e.g. MATH-101"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subject Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['theory', 'practical', 'both'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: t })}
                                            className={`py-2 rounded-xl text-xs font-bold capitalize transition border ${formData.type === t ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <GraduationCap className="w-3 h-3" />
                                    Grade Levels
                                </label>
                                <div className="p-3 bg-slate-900 border border-white/10 rounded-2xl">
                                    <div className="grid grid-cols-1 gap-2">
                                        {GRADE_LEVELS
                                            .filter(level => !tenantSettings?.config?.gradeLevels || tenantSettings.config.gradeLevels.includes(level.id))
                                            .map(level => (
                                                <label key={level.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.gradeLevel.includes(level.id)}
                                                        onChange={(e) => {
                                                            const newLevels = e.target.checked
                                                                ? [...formData.gradeLevel, level.id]
                                                                : formData.gradeLevel.filter(id => id !== level.id);
                                                            setFormData({ ...formData, gradeLevel: newLevels });
                                                        }}
                                                        className="w-4 h-4 rounded border-white/10 bg-slate-800 accent-fuchsia-500"
                                                    />
                                                    <div>
                                                        <span className="text-xs text-white font-semibold group-hover:text-fuchsia-400 transition block">{level.name}</span>
                                                        <span className="text-[10px] text-slate-500">{level.grades.join(', ')}</span>
                                                    </div>
                                                </label>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Qualified Teachers</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto p-3 bg-slate-900 border border-white/10 rounded-2xl">
                                    {allTeachers.map((t: any) => (
                                        <label key={t._id} className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.teachers.includes(t._id)}
                                                onChange={(e) => {
                                                    const newTeachers = e.target.checked
                                                        ? [...formData.teachers, t._id]
                                                        : formData.teachers.filter(id => id !== t._id);
                                                    setFormData({ ...formData, teachers: newTeachers });
                                                }}
                                                className="w-4 h-4 rounded border-white/10 bg-slate-800 accent-fuchsia-500"
                                            />
                                            <span className="text-xs text-slate-400 group-hover:text-white transition">{t.firstName} {t.lastName}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-2xl font-bold transition">
                                    {editId ? 'Update' : 'Create'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Resource Modal */}
            {isResourceModalOpen && selectedSubject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
                    <div className="glass-dark w-full max-w-2xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 my-8">
                        <div className="flex justify-between items-start mb-8 gap-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-black text-white truncate max-w-xs sm:max-w-none">{selectedSubject.name} Resources</h2>
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">Manage learning materials and external references.</p>
                            </div>
                            <button onClick={() => setIsResourceModalOpen(false)} className="text-slate-500 hover:text-white transition">
                                <X className="w-6 h-6" />
                            </button>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* List */}
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {selectedSubject.resources?.length > 0 ? selectedSubject.resources.map((r: any) => (
                                    <div key={r._id} className="p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold text-white truncate">{r.title}</p>
                                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:underline truncate block">{r.url}</a>
                                            </div>
                                            {canManageResources && (
                                                <button onClick={() => handleRemoveResource(r._id)} className="text-slate-600 hover:text-red-500 transition ml-2">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                        </div>
                                        <span className="mt-2 inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-[9px] text-indigo-400 font-bold uppercase">{r.type}</span>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center text-slate-600 italic">No resources added yet.</div>
                                )}
                            </div>

                            {canManageResources && (
                                <div className="glass-dark p-6 rounded-3xl border border-white/5 bg-white/5">
                                    <h3 className="text-lg font-bold text-white mb-4">Add New Resource</h3>
                                    <form onSubmit={handleAddResource} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                                            <input
                                                required value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                                placeholder="e.g. Chapter 1 PDF"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">URL / Link</label>
                                            <input
                                                required value={resourceForm.url} onChange={e => setResourceForm({ ...resourceForm, url: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                                            <select
                                                value={resourceForm.type} onChange={e => setResourceForm({ ...resourceForm, type: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                            >
                                                <option value="link">Link</option>
                                                <option value="pdf">PDF</option>
                                                <option value="video">Video</option>
                                                <option value="image">Image</option>
                                            </select>
                                        </div>
                                        <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition mt-2 shadow-lg shadow-indigo-500/20">
                                            Add Resource
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
