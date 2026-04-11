"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    FileText,
    Plus,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    File,
    Download,
    Trash2,
    Upload
} from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS } from '../../../hooks/usePermission';
import { toast } from 'react-hot-toast';

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'create', 'detail'
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [user, setUser] = useState<any>(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        classId: '',
        subjectId: '',
        dueDate: ''
    });
    const [submissionContent, setSubmissionContent] = useState('');
    const [submissionFile, setSubmissionFile] = useState<File | null>(null);

    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const { hasPermission } = usePermission();

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(u);
        fetchAssignments();

        // Fetch classes and subjects for teachers and admins
        // Check role directly since hasPermission might return false initially
        if (u.role === 'teacher' || u.role === 'school-admin' || u.role === 'super-admin') {
            fetchClassesAndSubjects();
        }
    }, []);

    const fetchAssignments = async () => {
        try {
            const { data } = await api.get('/assignments');
            setAssignments(data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load assignments");
        } finally {
            setLoading(false);
        }
    };

    const fetchClassesAndSubjects = async () => {
        try {
            console.log('Fetching classes and subjects...');
            const [cRes, sRes] = await Promise.all([
                api.get('/classes'),
                api.get('/subjects')
            ]);
            console.log('Classes response:', cRes.data);
            console.log('Subjects response:', sRes.data);
            setClasses(cRes.data.data || []);
            setSubjects(sRes.data.data || []);
            toast.success(`Loaded ${cRes.data.data?.length || 0} classes and ${sRes.data.data?.length || 0} subjects`);
        } catch (error: any) {
            console.error('Error fetching classes/subjects:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to load classes and subjects');
        }
    };

    const handleCreateWrapper = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/assignments', formData);
            toast.success("Assignment created successfully");
            setView('list');
            fetchAssignments();
            setFormData({ title: '', description: '', classId: '', subjectId: '', dueDate: '' });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create assignment");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await api.delete(`/assignments/${id}`);
            toast.success("Assignment deleted");
            fetchAssignments();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    };

    const handleSubmitAssignment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssignment) return;

        const data = new FormData();
        data.append('content', submissionContent);
        if (submissionFile) {
            data.append('file', submissionFile);
        }
        // status defaults to 'submitted' in backend currently, but could be 'draft'

        try {
            await api.post(`/assignments/${selectedAssignment._id}/submit`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Assignment submitted successfully!");
            setView('list');
            // optionally refresh submission status
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to submit");
        }
    };

    const isStudent = user?.role === 'student';

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Assignments</h1>
                    <p className="text-slate-500 mt-1">Manage homework and projects.</p>
                </div>
                {view === 'list' && (
                    <PermissionGuard resource={RESOURCES.ASSIGNMENTS} action={ACTIONS.CREATE}>
                        <button
                            onClick={() => setView('create')}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Create New
                        </button>
                    </PermissionGuard>
                )}
                {view !== 'list' && (
                    <button
                        onClick={() => setView('list')}
                        className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-bold"
                    >
                        Cancel
                    </button>
                )}
            </div>

            {view === 'list' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-20 animate-pulse text-slate-500">Loading assignments...</div>
                    ) : assignments.length === 0 ? (
                        <div className="text-center py-20 glass rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No assignments found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {assignments.map((assignment: any) => (
                                <div key={assignment._id} className="glass dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Delete Action - Only for Drafts typically, but PermissionGuard handles role check. 
                                                Backend checks draft status too. */}
                                            <PermissionGuard resource={RESOURCES.ASSIGNMENTS} action={ACTIONS.DELETE}>
                                                <button
                                                    onClick={() => handleDelete(assignment._id)}
                                                    className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </PermissionGuard>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{assignment.title}</h3>
                                    <p className="text-slate-500 text-sm line-clamp-2 mb-4">{assignment.description}</p>

                                    <div className="flex flex-col gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Status: {assignment.status}
                                        </div>
                                    </div>

                                    {isStudent ? (
                                        <button
                                            onClick={() => { setSelectedAssignment(assignment); setView('submit'); }}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            View & Submit
                                        </button>
                                    ) : (
                                        <button className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold cursor-default">
                                            Teacher View
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {view === 'create' && (
                <div className="max-w-2xl mx-auto glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5">
                    <h2 className="text-2xl font-bold mb-6">Create New Assignment</h2>
                    <form onSubmit={handleCreateWrapper} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Class</label>
                                <select
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.classId}
                                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Class</option>
                                    {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Subject</label>
                                <select
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.subjectId}
                                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Title</label>
                            <input
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Description</label>
                            <textarea
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 h-32"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Due Date</label>
                            <input
                                type="datetime-local"
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all">
                            Publish Assignment
                        </button>
                    </form>
                </div>
            )}

            {view === 'submit' && selectedAssignment && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5">
                        <h2 className="text-3xl font-black mb-2">{selectedAssignment.title}</h2>
                        <div className="flex gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">
                            <span>Due: {new Date(selectedAssignment.dueDate).toLocaleString()}</span>
                            <span>Points: 100</span>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                            {selectedAssignment.description}
                        </div>
                    </div>

                    <form onSubmit={handleSubmitAssignment} className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Upload className="w-6 h-6 text-indigo-500" />
                            Your Submission
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Text Response</label>
                            <textarea
                                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 h-40"
                                placeholder="Type your answer here..."
                                value={submissionContent}
                                onChange={(e) => setSubmissionContent(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Attach File</label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setSubmissionFile(e.target.files ? e.target.files[0] : null)}
                                />
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {submissionFile ? submissionFile.name : "Click to upload or drag and drop"}
                                </p>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Turn In Assignment
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
