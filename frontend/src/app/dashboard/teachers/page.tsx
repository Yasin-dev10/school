"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search,
    Plus,
    UserPlus,
    FileDown,
    Eye,
    EyeOff,
    RotateCcw,
    Pencil,
    UserCheck,
    Users
} from 'lucide-react';


export default function TeachersListPage() {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    const [user, setUser] = useState<any>(null);

    const togglePasswordVisibility = (teacherId: string) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(teacherId)) {
                newSet.delete(teacherId);
            } else {
                newSet.add(teacherId);
            }
            return newSet;
        });
    };

    const fetchTeachers = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) setUser(JSON.parse(userStr));

            const { data } = await api.get('/teachers');
            setTeachers(data.data);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (teacherId: string) => {
        if (!confirm('Are you sure you want to reset this teacher\'s password? A new password will be generated.')) {
            return;
        }

        try {
            const { data } = await api.post(`/teachers/${teacherId}/reset-password`);
            alert(`Password reset successfully!\n\nNew Password: ${data.password}\n\nPlease save this password and share it with the teacher.`);
            fetchTeachers();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to reset password');
        }
    };

    useEffect(() => {
        fetchTeachers();
    }, []);

    const filteredTeachers = teachers.filter((t: any) =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        t.profile?.designation?.toLowerCase().includes(search.toLowerCase())
    );

    const handleExport = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Name", "Email", "Designation", "Phone"]
                .join(",") + "\n"
            + teachers.map((t: any) => [
                `"${t.firstName} ${t.lastName}"`,
                `"${t.email}"`,
                `"${t.profile?.designation || ''}"`,
                `"${t.profile?.phone || ''}"`
            ].join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `teachers_export_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 sm:mb-10">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Faculty Directory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage institutional staff, teachers, and department heads.</p>
                </div>
                <Link href="/dashboard/teachers/add" className="w-full lg:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    <span>Recruit Faculty</span>
                </Link>

            </div>

            {/* Tool Bar */}
            <div className="bg-slate-900/40 p-5 rounded-3xl border border-white/5 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                        <Search className="w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name, email or designation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition shadow-inner"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleExport} className="px-5 py-3 bg-slate-800 text-slate-300 rounded-2xl border border-white/5 hover:bg-slate-700 transition font-bold text-sm flex items-center gap-2">
                        <FileDown className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>

                </div>
            </div>

            {/* List / Table */}
            <div className="glass-dark rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[900px]">
                        <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">Faculty Member</th>
                                <th className="px-6 py-5">Designation</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5">Joining Date</th>
                                <th className="px-6 py-5">Password</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-600 animate-pulse font-medium italic">Synchronizing faculty records...</td></tr>
                            ) : filteredTeachers.map((teacher: any) => (
                                <tr key={teacher._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold group-hover:scale-110 transition-transform">
                                                {teacher.firstName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold group-hover:text-purple-400 transition">{teacher.firstName} {teacher.lastName}</span>
                                                <span className="text-[10px] text-slate-500 font-medium">{teacher.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs font-bold ring-1 ring-white/10">
                                            {teacher.profile?.designation || 'Teacher'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${teacher.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {teacher.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-medium">
                                        {new Date(teacher.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {teacher.password_plain ? (
                                                <>
                                                    <span className="font-mono text-indigo-400 font-bold">
                                                        {visiblePasswords.has(teacher._id)
                                                            ? teacher.password_plain
                                                            : '••••••••'
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() => togglePasswordVisibility(teacher._id)}
                                                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-400 rounded-lg transition-all active:scale-95"
                                                        title={visiblePasswords.has(teacher._id) ? "Hide password" : "Show password"}
                                                    >
                                                        {visiblePasswords.has(teacher._id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>

                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 italic">Not available</span>
                                                    {user && ['school-admin', 'receptionist'].includes(user.role) && (
                                                        <button
                                                            onClick={() => handleResetPassword(teacher._id)}
                                                            className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white text-xs rounded-lg transition-all active:scale-95 font-bold flex items-center gap-1.5"
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
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <Link href={`/dashboard/teachers/${teacher._id}`} title="View Profile" className="p-2.5 inline-block bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition">
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        <Link href={`/dashboard/teachers/${teacher._id}/edit`} title="Edit Profile" className="p-2.5 inline-block bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-xl transition border border-purple-600/10">
                                            <Pencil className="w-4 h-4" />
                                        </Link>

                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredTeachers.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-600 font-medium">No faculty members found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
