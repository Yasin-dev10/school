"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { RESOURCES, ACTIONS } from '../../../hooks/usePermission';

export default function MaterialsPage() {
    const [materials, setMaterials] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'note',
        content: '',
        classId: '',
        subjectId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [matRes, classRes, subRes] = await Promise.all([
                api.get('/materials'),
                api.get('/classes'),
                api.get('/subjects')
            ]);
            setMaterials(matRes.data.data);
            setClasses(classRes.data.data);
            setSubjects(subRes.data.data);
        } catch (error) {
            console.error('Error fetching materials', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: any) => {
        e.preventDefault();
        try {
            await api.post('/materials', formData);
            setIsUploadOpen(false);
            setFormData({ title: '', description: '', type: 'note', content: '', classId: '', subjectId: '' });
            fetchData();
        } catch (error) {
            console.error('Upload failed', error);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Learning Materials</h1>
                    <p className="text-slate-500 mt-1">Manage and share resources with your students.</p>
                </div>
                <PermissionGuard resource={RESOURCES.MATERIALS} action={ACTIONS.CREATE}>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        <span className="text-xl">+</span> Add Resource
                    </button>
                </PermissionGuard>
            </div>

            {isUploadOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-dark border border-white/10 p-8 rounded-[2.5rem] max-w-lg w-full">
                        <h2 className="text-2xl font-bold text-white mb-6">Upload New Resource</h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <input
                                placeholder="Title"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                            <textarea
                                placeholder="Description"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-24"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="note">Lecture Note</option>
                                    <option value="video">Video Link</option>
                                    <option value="link">External Link</option>
                                    <option value="file">File</option>
                                </select>
                                <select
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                    value={formData.subjectId}
                                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                            <select
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                                value={formData.classId}
                                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                required
                            >
                                <option value="">Select Class</option>
                                {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                            </select>
                            {formData.type !== 'file' && (
                                <textarea
                                    placeholder={formData.type === 'note' ? 'Content' : 'URL (YouTube, Drive, etc)'}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-32"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                            )}
                            <div className="flex gap-4 mt-8">
                                <button type="button" onClick={() => setIsUploadOpen(false)} className="flex-1 py-3 text-slate-400 font-bold">Cancel</button>
                                <button type="submit" className="flex-1 bg-indigo-600 py-3 rounded-xl text-white font-bold">Upload</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 animate-pulse rounded-[2rem]" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((m: any) => (
                        <div key={m._id} className="glass-dark border border-white/5 p-6 rounded-[2rem] hover:border-indigo-500/30 transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                                    {m.type === 'video' ? '🎬' : m.type === 'file' ? '📁' : m.type === 'link' ? '🔗' : '📝'}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-1 px-2 bg-white/5 rounded-lg border border-white/5">
                                    {m.type}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition mb-2">{m.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{m.description}</p>
                            <div className="flex items-center gap-3 mt-auto">
                                <div className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded">
                                    {m.subject?.name}
                                </div>
                                <div className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                                    {m.class?.name}
                                </div>
                            </div>
                        </div>
                    ))}
                    {materials.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-slate-600 italic">No materials uploaded yet. Start by adding one!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
