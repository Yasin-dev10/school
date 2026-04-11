"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search,
    Plus,
    UserPlus,
    FileDown,
    ChevronUp,
    ChevronDown,
    Eye,
    EyeOff,
    RotateCcw,
    Pencil,
    Trash2,
    Users,
    GraduationCap,
    Info,
    CheckCircle2
} from 'lucide-react';


export default function StudentsListPage() {
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [bulkData, setBulkData] = useState("");
    const [modalData, setModalData] = useState({ class: '', section: 'A' });
    const [editStudentData, setEditStudentData] = useState<any>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const [user, setUser] = useState<any>(null);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [selectedClass, setSelectedClass] = useState('All Classes');

    const togglePasswordVisibility = (studentId: string) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) setUser(JSON.parse(userStr));

            const [studentRes, classRes] = await Promise.all([
                api.get(`/students?sortBy=${sortBy}&order=${sortOrder}`),
                api.get('/classes')
            ]);
            setStudents(studentRes.data.data);
            setClasses(classRes.data.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [sortBy, sortOrder]);

    const isAdmin = user && ['school-admin', 'receptionist'].includes(user.role);

    const filteredStudents = students.filter((s: any) => {
        const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.profile?.admissionNo?.toLowerCase().includes(search.toLowerCase());
        const matchesClass = selectedClass === 'All Classes' || s.profile?.class === selectedClass;
        return matchesSearch && matchesClass;
    });

    const toggleSelectAll = () => {
        if (selectedStudents.length === filteredStudents.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents.map((s: any) => s._id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleResetPassword = async (studentId: string) => {
        if (!confirm('Are you sure you want to reset this student\'s password? A new password will be generated.')) {
            return;
        }

        try {
            const { data } = await api.post(`/students/${studentId}/reset-password`);
            alert(`Password reset successfully!\n\nNew Password: ${data.password}\n\nPlease save this password and share it with the student.`);
            // Refresh the student list to show the new password
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reset password');
        }
    };

    const handleBulkPromote = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/students/promote', {
                studentIds: selectedStudents,
                nextClass: modalData.class,
                nextSection: modalData.section
            });
            alert(`Successfully assigned ${selectedStudents.length} students to ${modalData.class} - ${modalData.section}`);
            setIsModalOpen(false);
            setSelectedStudents([]);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to promote students");
        }
    };

    const handleBulkImport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Simple comma-separated parsing
            const rows = bulkData.split('\n').filter(r => r.trim());
            const students = rows.map(row => {
                const [firstName, lastName, email, className, section] = row.split(',').map(s => s.trim());
                return { firstName, lastName, email, class: className, section: section || 'A' };
            });

            const { data } = await api.post('/students/bulk-import', { students });
            alert(`Import Complete!\nSuccess: ${data.summary.success}\nFailed: ${data.summary.failed}`);
            setIsBulkImportOpen(false);
            setBulkData("");
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Import failed");
        }
    };

    const handleEditStudent = (student: any) => {
        setEditStudentData({
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            class: student.profile?.class || '',
            section: student.profile?.section || 'A',
            admissionNo: student.profile?.admissionNo || '',
            studentId: student.profile?.studentId || '',
            rollNo: student.profile?.rollNo || '',
            dateOfBirth: student.profile?.dateOfBirth ? new Date(student.profile.dateOfBirth).toISOString().split('T')[0] : '',
            gender: student.profile?.gender || '',
            bloodGroup: student.profile?.bloodGroup || '',
            address: student.profile?.address || '',
            phone: student.profile?.phone || '',
            parentName: student.profile?.parentName || '',
            parentPhone: student.profile?.parentPhone || '',
            parentEmail: student.profile?.parentEmail || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/students/${editStudentData._id}`, {
                firstName: editStudentData.firstName,
                lastName: editStudentData.lastName,
                email: editStudentData.email,
                profile: {
                    class: editStudentData.class,
                    section: editStudentData.section,
                    admissionNo: editStudentData.admissionNo,
                    studentId: editStudentData.studentId,
                    rollNo: editStudentData.rollNo,
                    dateOfBirth: editStudentData.dateOfBirth,
                    gender: editStudentData.gender,
                    bloodGroup: editStudentData.bloodGroup,
                    address: editStudentData.address,
                    phone: editStudentData.phone,
                    parentName: editStudentData.parentName,
                    parentPhone: editStudentData.parentPhone,
                    parentEmail: editStudentData.parentEmail
                }
            });
            alert('Student updated successfully!');
            setIsEditModalOpen(false);
            setEditStudentData(null);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update student");
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            return;
        }

        try {
            await api.delete(`/students/${id}`);
            alert('Student deleted successfully!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete student");
        }
    };

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Name", "Email", "Admission No", "Class", "Section", "Roll No"]
                .join(",") + "\n"
            + students.map((s: any) => [
                `"${s.firstName} ${s.lastName}"`,
                `"${s.email}"`,
                `"${s.profile?.admissionNo || ''}"`,
                `"${s.profile?.class || ''}"`,
                `"${s.profile?.section || ''}"`,
                `"${s.profile?.rollNo || ''}"`
            ].join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `students_export_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 sm:mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student Directory</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage enrollments, profiles, and academic records.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {isAdmin && selectedStudents.length > 0 && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 px-4 sm:px-6 py-3.5 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 rounded-2xl font-bold transition hover:bg-indigo-600 hover:text-white"
                        >
                            Assign ({selectedStudents.length})
                        </button>
                    )}
                    {isAdmin && (
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <button
                                onClick={() => setIsBulkImportOpen(true)}
                                className="flex-1 px-4 sm:px-6 py-3.5 bg-slate-800 text-slate-300 rounded-2xl font-bold transition hover:bg-slate-700 flex items-center justify-center gap-2"
                            >
                                <UserPlus className="w-5 h-5" />
                                <span>Bulk</span>
                            </button>
                            <Link href="/dashboard/students/add" className="flex-1 px-4 sm:px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" />
                                <span className="whitespace-nowrap">Admit New</span>
                            </Link>
                        </div>
                    )}

                </div>
            </div>

            {/* Tool Bar */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200 dark:border-white/5 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <Search className="w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name, ID or admission number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition shadow-inner"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3 text-slate-600 dark:text-slate-400 text-sm focus:outline-none font-medium appearance-none"
                    >
                        <option value="All Classes">All Classes</option>
                        {Array.from(new Set(students.map((s: any) => s.profile?.class))).filter(Boolean).sort().map(c => (
                            <option key={c as string} value={c as string}>{c as string}</option>
                        ))}
                    </select>
                    <button onClick={handleExport} className="px-5 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-bold text-sm shadow-sm flex items-center gap-2">
                        <FileDown className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* List / Table */}
            <div className="glass dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="text-[10px] uppercase bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-500"
                                        checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-5">
                                    <button onClick={() => toggleSort('name')} className="flex items-center gap-2 hover:text-indigo-400 transition uppercase">
                                        Student {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </button>
                                </th>
                                <th className="px-6 py-5">
                                    <button onClick={() => toggleSort('class')} className="flex items-center gap-2 hover:text-indigo-400 transition uppercase">
                                        Class / Sec {sortBy === 'class' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                                    </button>
                                </th>
                                <th className="px-6 py-5">Student ID</th>
                                <th className="px-6 py-5">Admission No</th>
                                <th className="px-6 py-5">Password</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-600 animate-pulse font-medium italic">Synchronizing student records...</td></tr>
                            ) : filteredStudents.map((student: any) => (
                                <tr key={student._id} className={`hover:bg-white/5 transition-colors group ${selectedStudents.includes(student._id) ? 'bg-indigo-500/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-500"
                                            checked={selectedStudents.includes(student._id)}
                                            onChange={() => toggleSelect(student._id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold group-hover:scale-110 transition-transform">
                                                {student.firstName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold group-hover:text-indigo-400 transition">{student.firstName} {student.lastName}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{student.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-indigo-600/10 text-indigo-400 px-2 py-1 rounded text-xs font-bold ring-1 ring-indigo-500/20">
                                            {student.profile?.class || 'N/A'} - {student.profile?.section || '?'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-400 italic">
                                        {student.profile?.studentId || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-400">
                                        {student.profile?.admissionNo}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {student.password_plain ? (
                                                <>
                                                    <span className="font-mono text-indigo-400 font-bold">
                                                        {visiblePasswords.has(student._id)
                                                            ? student.password_plain
                                                            : '••••••••'
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() => togglePasswordVisibility(student._id)}
                                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg transition-all active:scale-95"
                                                        title={visiblePasswords.has(student._id) ? "Hide password" : "Show password"}
                                                    >
                                                        {visiblePasswords.has(student._id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>

                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 italic">Not available</span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleResetPassword(student._id)}
                                                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-xs rounded-lg transition-all active:scale-95 font-bold flex items-center gap-1.5"
                                                            title="Generate new password"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            <span>Reset</span>
                                                        </button>

                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2 flex">
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleEditStudent(student)}
                                                className="p-2.5 inline-block bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition active:scale-95"
                                                title="Edit student"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>

                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDeleteStudent(student._id)}
                                                className="p-2.5 inline-block bg-red-600/20 hover:bg-red-600 text-red-100 hover:text-white rounded-xl transition active:scale-95"
                                                title="Delete student"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                        )}
                                        <Link href={`/dashboard/students/${student._id}`} className="p-2.5 inline-block bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 rounded-xl transition">
                                            <Eye className="w-4 h-4" />
                                        </Link>

                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredStudents.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-600 font-medium">No students found in the current directory.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Promote/Assign Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6">Assign Class</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Assigning {selectedStudents.length} selected students to a new academic level.</p>

                        <form onSubmit={handleBulkPromote} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Class</label>
                                <select
                                    required
                                    value={modalData.class}
                                    onChange={e => setModalData({ ...modalData, class: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                >
                                    <option value="">Select a Class</option>
                                    {Array.from(new Set(classes.map((c: any) => c.name))).map(name => (
                                        <option key={name as string} value={name as string}>{name as string}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section</label>
                                <select
                                    required
                                    value={modalData.section}
                                    onChange={e => setModalData({ ...modalData, section: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                >
                                    {classes.filter((c: any) => c.name === modalData.class).map((c: any) => (
                                        <option key={c._id} value={c.section}>{c.section}</option>
                                    )) || <option value="A">A</option>}
                                    {classes.filter((c: any) => c.name === modalData.class).length === 0 && <option value="A">A</option>}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition shadow-lg shadow-indigo-500/25">
                                    Confirm Assignment
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {isBulkImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl p-6 sm:p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-6">Bulk Student Onboarding</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm italic">
                            Enter student details as comma-separated rows. <br />
                            Format: <span className="text-indigo-600 dark:text-indigo-400 font-mono">FirstName, LastName, Email, Class, Section</span>
                        </p>

                        <form onSubmit={handleBulkImport} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Batch Data (CSV Style)</label>
                                <textarea
                                    required
                                    value={bulkData}
                                    onChange={e => setBulkData(e.target.value)}
                                    placeholder="John, Doe, john@school.com, 10, A&#10;Jane, Smith, jane@school.com, 9, B"
                                    className="w-full h-64 px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-none"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">
                                    Initiate Import
                                </button>
                                <button type="button" onClick={() => setIsBulkImportOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {isEditModalOpen && editStudentData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all overflow-y-auto">
                    <div className="glass-dark w-full max-w-4xl p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl my-8 animate-in zoom-in-95">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6">Edit Student Information</h2>
                        <p className="text-slate-400 mb-6 text-sm">Update student details and academic information.</p>

                        <form onSubmit={handleUpdateStudent} className="space-y-6">
                            {/* Personal Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-indigo-400 border-b border-white/10 pb-2">Personal Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editStudentData.firstName}
                                            onChange={e => setEditStudentData({ ...editStudentData, firstName: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={editStudentData.lastName}
                                            onChange={e => setEditStudentData({ ...editStudentData, lastName: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={editStudentData.email}
                                            onChange={e => setEditStudentData({ ...editStudentData, email: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={editStudentData.phone}
                                            onChange={e => setEditStudentData({ ...editStudentData, phone: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={editStudentData.dateOfBirth}
                                            onChange={e => setEditStudentData({ ...editStudentData, dateOfBirth: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                                        <select
                                            value={editStudentData.gender}
                                            onChange={e => setEditStudentData({ ...editStudentData, gender: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Blood Group</label>
                                        <select
                                            value={editStudentData.bloodGroup}
                                            onChange={e => setEditStudentData({ ...editStudentData, bloodGroup: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        >
                                            <option value="">Select Blood Group</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Address</label>
                                        <textarea
                                            value={editStudentData.address}
                                            onChange={e => setEditStudentData({ ...editStudentData, address: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition resize-none"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Academic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-indigo-400 border-b border-white/10 pb-2">Academic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Class</label>
                                        <select
                                            required
                                            value={editStudentData.class}
                                            onChange={e => setEditStudentData({ ...editStudentData, class: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        >
                                            <option value="">Select a Class</option>
                                            {Array.from(new Set(classes.map((c: any) => c.name))).map(name => (
                                                <option key={name as string} value={name as string}>{name as string}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section</label>
                                        <select
                                            required
                                            value={editStudentData.section}
                                            onChange={e => setEditStudentData({ ...editStudentData, section: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        >
                                            {classes.filter((c: any) => c.name === editStudentData.class).map((c: any) => (
                                                <option key={c._id} value={c.section}>{c.section}</option>
                                            )) || <option value="A">A</option>}
                                            {classes.filter((c: any) => c.name === editStudentData.class).length === 0 && <option value="A">A</option>}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admission Number</label>
                                        <input
                                            type="text"
                                            value={editStudentData.admissionNo}
                                            onChange={e => setEditStudentData({ ...editStudentData, admissionNo: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student ID</label>
                                        <input
                                            type="text"
                                            value={editStudentData.studentId}
                                            onChange={e => setEditStudentData({ ...editStudentData, studentId: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Roll Number</label>
                                        <input
                                            type="text"
                                            value={editStudentData.rollNo}
                                            onChange={e => setEditStudentData({ ...editStudentData, rollNo: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Parent Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-indigo-400 border-b border-white/10 pb-2">Parent/Guardian Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Parent Name</label>
                                        <input
                                            type="text"
                                            value={editStudentData.parentName}
                                            onChange={e => setEditStudentData({ ...editStudentData, parentName: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Parent Phone</label>
                                        <input
                                            type="tel"
                                            value={editStudentData.parentPhone}
                                            onChange={e => setEditStudentData({ ...editStudentData, parentPhone: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Parent Email</label>
                                        <input
                                            type="email"
                                            value={editStudentData.parentEmail}
                                            onChange={e => setEditStudentData({ ...editStudentData, parentEmail: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">
                                    Save Changes
                                </button>
                                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditStudentData(null); }} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
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
