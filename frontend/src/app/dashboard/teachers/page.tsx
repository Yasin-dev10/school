"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search, Plus, FileDown, ChevronDown, MessageSquare,
    UserCheck, RotateCcw, Eye, SlidersHorizontal
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Teacher = {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status?: string;
    password_plain?: string;
    createdAt?: string;
    profile?: {
        designation?: string;
        department?: string;
        phone?: string;
        subjects?: string[];
        photoUrl?: string;
    };
    subjects?: Array<{ _id: string; name: string; code: string }>;
};

const STATUS_LABEL: Record<string, string> = {
    active: 'On Campus',
    inactive: 'Off Campus',
    'in-class': 'In Class',
};
const STATUS_COLOR: Record<string, string> = {
    active:     'bg-emerald-500',
    inactive:   'bg-slate-400',
    'in-class': 'bg-blue-400',
};

/* ─── Dropdown ──────────────────────────────────────────────────────────── */
function ActionMenu({ teacher, onReset }: { teacher: Teacher; onReset: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                Actions <ChevronDown className="w-3 h-3" />
            </button>
            {open && (
                <div className="absolute bottom-full mb-1 right-0 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                    <Link href={`/dashboard/teachers/${teacher._id}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        <Eye className="w-4 h-4 text-slate-400" /> View Profile
                    </Link>
                    <button onClick={() => { setOpen(false); onReset(teacher._id); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        <RotateCcw className="w-4 h-4 text-slate-400" /> Reset Password
                    </button>
                    <a href={`mailto:${teacher.email}`}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                        <MessageSquare className="w-4 h-4 text-slate-400" /> Message
                    </a>
                </div>
            )}
        </div>
    );
}

/* ─── Teacher Card ──────────────────────────────────────────────────────── */
function TeacherCard({ teacher, onReset }: { teacher: Teacher; onReset: (id: string) => void }) {
    const status   = teacher.status || 'active';
    const initials = `${teacher.firstName.charAt(0)}${teacher.lastName.charAt(0)}`.toUpperCase();
    const subjects = teacher.subjects?.map(s => s.name) ||
                     teacher.profile?.subjects || [];
    const designation = teacher.profile?.designation || 'Teacher';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            {/* Photo / Avatar area */}
            <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                {teacher.profile?.photoUrl ? (
                    <img src={teacher.profile.photoUrl} alt={`${teacher.firstName} ${teacher.lastName}`}
                        className="w-full h-full object-cover object-top" />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 border-2 border-indigo-400/30 flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-300">
                        {initials}
                    </div>
                )}
                {/* Status badge */}
                <span className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white ${STATUS_COLOR[status] || 'bg-slate-400'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80 inline-block" />
                    {STATUS_LABEL[status] || status}
                </span>
            </div>

            {/* Info */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="text-center">
                    <p className="font-bold text-slate-800 dark:text-white text-sm leading-tight">
                        {teacher.firstName} {teacher.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{designation}</p>
                </div>

                {/* Subject tags */}
                {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                        {subjects.slice(0, 4).map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium rounded-full">
                                {s}
                            </span>
                        ))}
                        {subjects.length > 4 && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-400 text-[10px] rounded-full">
                                +{subjects.length - 4}
                            </span>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="mt-auto pt-2 flex gap-2">
                    <Link href={`/dashboard/teachers/${teacher._id}`}
                        className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold text-center transition">
                        View Profile
                    </Link>
                    <ActionMenu teacher={teacher} onReset={onReset} />
                </div>
            </div>
        </div>
    );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function TeachersPage() {
    const [teachers, setTeachers]   = useState<Teacher[]>([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [sortBy, setSortBy]       = useState('name');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDept, setFilterDept]     = useState('');
    const [user, setUser]           = useState<any>(null);

    const fetchTeachers = async () => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) setUser(JSON.parse(userStr));
            const { data } = await api.get('/teachers');
            setTeachers(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTeachers(); }, []);

    const handleResetPassword = async (id: string) => {
        if (!confirm("Reset this teacher's password?")) return;
        try {
            const { data } = await api.post(`/teachers/${id}/reset-password`);
            alert(`New password: ${data.password}\n\nShare this with the teacher.`);
            fetchTeachers();
        } catch (err: any) { alert(err.response?.data?.message || 'Reset failed'); }
    };

    const handleExport = () => {
        const csv = "data:text/csv;charset=utf-8,"
            + "Name,Email,Designation,Department\n"
            + teachers.map((t: Teacher) =>
                `"${t.firstName} ${t.lastName}","${t.email}","${t.profile?.designation || ''}","${t.profile?.department || ''}"`
              ).join("\n");
        const a = document.createElement('a');
        a.href = encodeURI(csv);
        a.download = `teachers_${new Date().toLocaleDateString()}.csv`;
        a.click();
    };

    // Unique departments for filter
    const departments = Array.from(new Set(
        teachers.map(t => t.profile?.department).filter(Boolean)
    )) as string[];

    // Filter + sort
    const filtered = teachers
        .filter(t => {
            const q = search.toLowerCase();
            const matchSearch = !search ||
                `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
                t.email.toLowerCase().includes(q) ||
                (t.profile?.designation || '').toLowerCase().includes(q) ||
                (t.profile?.department || '').toLowerCase().includes(q);
            const matchStatus = !filterStatus || t.status === filterStatus;
            const matchDept   = !filterDept   || t.profile?.department === filterDept;
            return matchSearch && matchStatus && matchDept;
        })
        .sort((a, b) => {
            if (sortBy === 'name')        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
            if (sortBy === 'designation') return (a.profile?.designation || '').localeCompare(b.profile?.designation || '');
            if (sortBy === 'department')  return (a.profile?.department  || '').localeCompare(b.profile?.department  || '');
            return 0;
        });

    const canManage = user && ['school-admin', 'super-admin', 'receptionist'].includes(user.role);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Enhanced Professional Teacher Management</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage teachers, departments, and class assignments.</p>
                </div>
                {canManage && (
                    <div className="flex gap-2">
                        <button onClick={handleExport}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold hover:border-slate-400 transition">
                            <FileDown className="w-4 h-4" /> Export
                        </button>
                        <Link href="/dashboard/teachers/add"
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                            <Plus className="w-4 h-4" /> Add Teacher
                        </Link>
                    </div>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500" />
                </div>

                <div className="flex flex-wrap gap-2 items-center text-sm text-slate-500">
                    {/* Sort */}
                    <span className="text-xs font-medium shrink-0">Sort by:</span>
                    <div className="relative">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                            <option value="name">Name</option>
                            <option value="designation">Designation</option>
                            <option value="department">Department</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Filter */}
                    <span className="text-xs font-medium shrink-0">Filter by:</span>
                    <div className="relative">
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            className="pl-3 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500 appearance-none">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Count + Date */}
                <div className="sm:ml-auto flex items-center gap-3 text-xs text-slate-500">
                    <span><strong className="text-slate-800 dark:text-white">{filtered.length}</strong> / {teachers.length} teachers</span>
                    <span className="hidden sm:block">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 h-64 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No teachers found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map(t => (
                        <TeacherCard key={t._id} teacher={t} onReset={handleResetPassword} />
                    ))}
                </div>
            )}
        </div>
    );
}
