"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { GRADE_LEVELS, getGradesForLevel } from '../../utils/gradeLevels';
import {
    School,
    Plus,
    Pencil,
    Trash2,
    User,
    DoorOpen,
    BookOpen,
    X,
    CheckCircle2,
    GraduationCap
} from 'lucide-react';


export default function ClassesPage() {
    const [classes, setClasses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tenantSettings, setTenantSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        section: '',
        gradeLevel: '',
        grade: '',
        room: '',
        classTeacher: '',
        subjects: [] as { subject: string, teachers: string[] }[]
    });
    const [editId, setEditId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    // Temporary state for adding a new subject-teacher pair in the modal
    const [currentSubjectIds, setCurrentSubjectIds] = useState<string[]>([]);
    const [tempSubjectId, setTempSubjectId] = useState('');
    const [currentSubjectTeachers, setCurrentSubjectTeachers] = useState<string[]>([]);
    const [tempTeacherId, setTempTeacherId] = useState('');

    const fetchData = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                setUserRole(user.role);
            }

            const [classRes, teacherRes, subjectRes, tenantRes] = await Promise.all([
                api.get('/classes'),
                api.get('/teachers'),
                api.get('/subjects'),
                api.get('/tenants/me')
            ]);
            setClasses(classRes.data.data);
            setTeachers(teacherRes.data.data);
            setSubjects(subjectRes.data.data);
            setTenantSettings(tenantRes.data.data);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare final subjects array including any pending selections
        let finalSubjects = [...formData.subjects];
        if (currentSubjectIds.length > 0 && currentSubjectTeachers.length > 0) {
            currentSubjectIds.forEach(subId => {
                const existingIndex = finalSubjects.findIndex(s => s.subject === subId);
                if (existingIndex > -1) {
                    const combinedTeachers = Array.from(new Set([...finalSubjects[existingIndex].teachers, ...currentSubjectTeachers]));
                    finalSubjects[existingIndex] = { ...finalSubjects[existingIndex], teachers: combinedTeachers };
                } else {
                    finalSubjects.push({ subject: subId, teachers: [...currentSubjectTeachers] });
                }
            });
        }

        const dataToSave = {
            ...formData,
            subjects: finalSubjects,
            classTeacher: formData.classTeacher || null // Handle empty string
        };

        try {
            if (editId) {
                await api.put(`/classes/${editId}`, dataToSave);
            } else {
                await api.post('/classes', dataToSave);
            }
            setIsModalOpen(false);
            resetForm();
            setEditId(null);
            fetchData();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.response?.data?.error || "Operation failed";
            const errorDetails = err.response?.data?.errors;

            if (errorDetails && Array.isArray(errorDetails)) {
                alert(`${errorMessage}\n\nDetails:\n${errorDetails.map((e: any) => `- ${e.field}: ${e.message}`).join('\n')}`);
            } else {
                alert(errorMessage);
            }
        }
    };

    const resetForm = () => {
        setFormData({ name: '', section: '', gradeLevel: '', grade: '', room: '', classTeacher: '', subjects: [] });
        setCurrentSubjectIds([]);
        setTempSubjectId('');
        setCurrentSubjectTeachers([]);
        setTempTeacherId('');
    };

    const handleEdit = (c: any) => {
        setEditId(c._id);
        setFormData({
            name: c.name,
            section: c.section,
            gradeLevel: c.gradeLevel || '',
            grade: c.grade || '',
            room: c.room || '',
            classTeacher: c.classTeacher?._id || '',
            subjects: c.subjects ? c.subjects.filter((s: any) => s.subject).map((s: any) => ({
                subject: s.subject?._id || s.subject,
                teachers: s.teachers ? s.teachers.map((t: any) => t._id || t) : []
            })) : []
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure?")) {
            try {
                await api.delete(`/classes/${id}`);
                fetchData();
            } catch (err) {
                alert("Delete failed");
            }
        }
    };

    const addSubjectToList = () => {
        if (!tempSubjectId) return;
        if (currentSubjectIds.includes(tempSubjectId)) return;
        setCurrentSubjectIds([...currentSubjectIds, tempSubjectId]);
        setTempSubjectId('');
    };

    const removeSubjectFromList = (sId: string) => {
        setCurrentSubjectIds(currentSubjectIds.filter(id => id !== sId));
    };

    const addTeacherToCurrentSubject = () => {
        if (!tempTeacherId) return;
        if (currentSubjectTeachers.includes(tempTeacherId)) return;
        setCurrentSubjectTeachers([...currentSubjectTeachers, tempTeacherId]);
        setTempTeacherId('');
    };

    const removeTeacherFromCurrentSubject = (tId: string) => {
        setCurrentSubjectTeachers(currentSubjectTeachers.filter(id => id !== tId));
    };

    const addSubjectToForm = () => {
        if (currentSubjectIds.length === 0 || currentSubjectTeachers.length === 0) {
            alert("Please select at least one subject and one teacher.");
            return;
        }

        const newSubjects = [...formData.subjects];

        currentSubjectIds.forEach(subId => {
            const existingIndex = newSubjects.findIndex(s => s.subject === subId);
            if (existingIndex > -1) {
                // Merge teachers, ensuring no duplicates
                const combinedTeachers = Array.from(new Set([...newSubjects[existingIndex].teachers, ...currentSubjectTeachers]));
                newSubjects[existingIndex] = {
                    ...newSubjects[existingIndex],
                    teachers: combinedTeachers
                };
            } else {
                newSubjects.push({
                    subject: subId,
                    teachers: [...currentSubjectTeachers]
                });
            }
        });

        setFormData({
            ...formData,
            subjects: newSubjects
        });

        // Clear temporary selections
        setCurrentSubjectIds([]);
        setCurrentSubjectTeachers([]);
        setTempSubjectId('');
        setTempTeacherId('');
    };

    const removeSubjectFromForm = (index: number) => {
        const newSubjects = [...formData.subjects];
        newSubjects.splice(index, 1);
        setFormData({ ...formData, subjects: newSubjects });
    };

    const getSubjectName = (id: string) => {
        const s: any = subjects.find((sub: any) => sub._id === id);
        return s ? `${s.name} (${s.code})` : 'Unknown Subject';
    };

    const getTeacherName = (id: string) => {
        const t: any = teachers.find((tea: any) => tea._id === id);
        return t ? `${t.firstName} ${t.lastName}` : 'Unknown Teacher';
    };

    const canManage = ['school-admin', 'super-admin'].includes(userRole);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:row justify-between items-start sm:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Classes</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage grade levels, sections, and class teachers.</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setIsModalOpen(true); setEditId(null); resetForm(); }}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Class</span>
                    </button>

                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 animate-pulse font-medium italic">Loading academic structure...</div>
                ) : classes.map((c: any) => (
                    <div key={c._id} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <School className="w-12 h-12" />
                        </div>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-2xl font-black text-white">{c.name}</h3>
                                <p className="text-indigo-400 font-bold text-sm tracking-widest uppercase mt-1">Section {c.section}</p>
                                {c.grade && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <GraduationCap className="w-3 h-3 text-teal-400" />
                                        <span className="text-xs text-teal-400 font-semibold">{c.grade}</span>
                                    </div>
                                )}
                            </div>
                            {canManage && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(c)} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition">
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(c._id)} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-100 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                            )}
                        </div>
                        <div className="space-y-3 mt-6">
                            <div className="flex items-center gap-3 text-slate-400 text-sm">
                                <span className="w-6 flex justify-center text-indigo-400"><User className="w-4 h-4" /></span>
                                <span>{c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : 'No Class Teacher'}</span>
                            </div>

                            <div className="flex items-center gap-3 text-slate-400 text-sm">
                                <span className="w-6 flex justify-center text-indigo-400"><DoorOpen className="w-4 h-4" /></span>
                                <span>Room: {c.room || 'N/A'}</span>
                            </div>

                            <div className="flex items-start gap-3 text-slate-400 text-sm">
                                <span className="w-6 flex justify-center text-indigo-400 mt-1"><BookOpen className="w-4 h-4" /></span>
                                <div>
                                    <span className="block mb-1">Subjects: {c.subjects?.length || 0}</span>
                                    <div className="flex flex-wrap gap-1">
                                        {c.subjects?.slice(0, 3).map((s: any, idx: number) => (
                                            <span
                                                key={idx}
                                                className="text-xs bg-white/5 px-1.5 py-0.5 rounded text-slate-300 cursor-help"
                                                title={`Teachers: ${s.teachers?.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ') || 'None'}`}
                                            >
                                                {s.subject?.code || 'Sub'}
                                            </span>
                                        ))}
                                        {(c.subjects?.length || 0) > 3 && <span className="text-xs text-slate-500">+{c.subjects.length - 3} more</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && canManage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="glass-dark w-full max-w-2xl p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6 underline decoration-indigo-500 decoration-4 underline-offset-8">
                            {editId ? 'Modify Class' : 'Define New Class'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Class Name</label>
                                    <input
                                        required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="e.g. Grade 10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section</label>
                                    <input
                                        required value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="e.g. A"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <GraduationCap className="w-3 h-3" />
                                        Grade Level
                                    </label>
                                    <select
                                        required
                                        value={formData.gradeLevel}
                                        onChange={e => {
                                            setFormData({ ...formData, gradeLevel: e.target.value, grade: '' });
                                        }}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="">Select Grade Level</option>
                                        {GRADE_LEVELS
                                            .filter(level => !tenantSettings?.config?.gradeLevels || tenantSettings.config.gradeLevels.includes(level.id))
                                            .map(level => (
                                                <option key={level.id} value={level.id}>{level.name}</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Specific Grade</label>
                                    <select
                                        required
                                        value={formData.grade}
                                        onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                        disabled={!formData.gradeLevel}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
                                    >
                                        <option value="">Select Grade</option>
                                        {formData.gradeLevel && getGradesForLevel(formData.gradeLevel).map(grade => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Assign Class Teacher</label>
                                    <select
                                        value={formData.classTeacher} onChange={e => setFormData({ ...formData, classTeacher: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="">Select a Teacher</option>
                                        {teachers.map((t: any) => (
                                            <option key={t._id} value={t._id}>{t.firstName} {t.lastName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Room Number</label>
                                    <input
                                        value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            {/* Subject Allocations */}
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <label className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-indigo-400" />
                                    <span>Subject Allocations</span>
                                </label>

                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5 space-y-4">
                                    {/* Multi-Subject Selection */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">1. Select Subjects</label>
                                        <div className="flex flex-col sm:row gap-2">
                                            <select
                                                value={tempSubjectId} onChange={e => setTempSubjectId(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="">Choose a Subject...</option>
                                                {subjects.map((s: any) => (
                                                    <option key={s._id} value={s._id} disabled={currentSubjectIds.includes(s._id)}>
                                                        {s.name} ({s.code})
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={addSubjectToList}
                                                disabled={!tempSubjectId}
                                                className="w-full sm:w-auto px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-bold rounded-xl transition disabled:opacity-50"
                                            >
                                                + Add Subject
                                            </button>
                                        </div>
                                        {/* Selected Subjects Pills */}
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-950/30 rounded-xl border border-white/5">
                                            {currentSubjectIds.length === 0 && <span className="text-xs text-slate-400 italic px-2 py-1">No subjects selected yet</span>}
                                            {currentSubjectIds.map(sId => (
                                                <span key={sId} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white text-xs rounded-full font-bold">
                                                    {getSubjectName(sId)}
                                                    <button type="button" onClick={() => removeSubjectFromList(sId)} className="hover:text-emerald-200">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Teacher Multi-Select */}
                                    <div className={`space-y-2 transition-all ${currentSubjectIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <label className="text-[10px] uppercase text-slate-500 font-bold">2. Assign Teachers</label>
                                        <div className="flex flex-col sm:row gap-2">
                                            <select
                                                value={tempTeacherId} onChange={e => setTempTeacherId(e.target.value)}
                                                className="flex-1 px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                <option value="">Select Teacher to Add</option>
                                                {teachers.map((t: any) => (
                                                    <option key={t._id} value={t._id} disabled={currentSubjectTeachers.includes(t._id)}>
                                                        {t.firstName} {t.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={addTeacherToCurrentSubject}
                                                disabled={!tempTeacherId}
                                                className="w-full sm:w-auto px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-bold rounded-xl transition disabled:opacity-50"
                                            >
                                                + Add Teacher
                                            </button>
                                        </div>

                                        {/* Selected Teachers Pills */}
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-950/30 rounded-xl border border-white/5">
                                            {currentSubjectTeachers.length === 0 && <span className="text-xs text-slate-400 italic px-2 py-1">No teachers selected yet</span>}
                                            {currentSubjectTeachers.map(tId => (
                                                <span key={tId} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500 text-white text-xs rounded-full font-bold">
                                                    {getTeacherName(tId)}
                                                    <button type="button" onClick={() => removeTeacherFromCurrentSubject(tId)} className="hover:text-red-200">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addSubjectToForm}
                                        disabled={currentSubjectIds.length === 0 || currentSubjectTeachers.length === 0}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition"
                                    >
                                        Confirm Bulk Allocation
                                    </button>

                                    {/* List of assignments */}
                                    <div className="space-y-2 pt-2">
                                        {formData.subjects.length === 0 && (
                                            <p className="text-center text-slate-400 text-sm italic py-4">No subjects allocated yet.</p>
                                        )}
                                        {formData.subjects.map((sub, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-sm font-bold">{getSubjectName(sub.subject)}</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {sub.teachers.map((tId: string) => (
                                                                <span key={tId} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                                                    {getTeacherName(tId)}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSubjectFromForm(idx)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>

                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-white/10">
                                <button type="submit" className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20">
                                    {editId ? 'Save Changes' : 'Create Class'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
