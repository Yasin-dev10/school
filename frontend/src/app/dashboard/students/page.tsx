"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search, Plus, UserPlus, FileDown, Eye, EyeOff,
    RotateCcw, Pencil, Trash2, X, ChevronDown,
    ChevronLeft, ChevronRight, MessageSquare, Users
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface SchoolClass { _id: string; name: string; section?: string }
interface Student {
    _id: string; firstName: string; lastName: string; email: string;
    status?: string; password_plain?: string; createdAt?: string;
    profile?: {
        admissionNo?: string; studentId?: string; rollNo?: string;
        class?: string; section?: string; parentName?: string;
        parentPhone?: string; parentEmail?: string; phone?: string;
        dateOfBirth?: string; gender?: string; bloodGroup?: string; address?: string;
    };
}

const PAGE_SIZE = 10;

/* ─── Class Filter Dropdown ─────────────────────────────────────────────── */
function ClassFilterDropdown({ classes, value, onChange }: {
    classes: SchoolClass[]; value: string; onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ]       = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const uniqueNames = useMemo(() =>
        Array.from(new Set(classes.map(c => `${c.name}${c.section ? ` ${c.section}` : ''}`)))
            .filter(n => !q || n.toLowerCase().includes(q.toLowerCase()))
            .sort()
    , [classes, q]);

    const label = value === '' ? 'Filter by Class' : value;

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium hover:border-slate-400 transition min-w-[160px] justify-between">
                {label} <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {open && (
                <div className="absolute top-full mt-1 right-0 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none text-slate-700 dark:text-white" />
                        </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        <button onClick={() => { onChange(''); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition ${value === '' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            All Classes
                        </button>
                        {uniqueNames.map(n => (
                            <button key={n} onClick={() => { onChange(n); setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm transition ${value === n ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Quick-View Panel ──────────────────────────────────────────────────── */
function QuickView({ student, classes, onClose }: { student: Student; classes: SchoolClass[]; onClose: () => void }) {
    const initials = `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
    const cls = student.profile?.class;
    const sec = student.profile?.section;
    // student's classes: find all sections for their class name
    const studentClasses = classes.filter(c => c.name === cls).map(c => `${c.name}${c.section ? ` ${c.section}` : ''}`);

    return (
        <div className="w-72 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-lg">
            {/* Close */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick View</span>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center pt-6 pb-4 px-4 gap-2">
                <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-300 dark:border-indigo-600 flex items-center justify-center text-2xl font-black text-indigo-600 dark:text-indigo-300">
                    {initials}
                </div>
                <p className="font-bold text-slate-800 dark:text-white text-base">{student.firstName} {student.lastName}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${student.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {student.status === 'active' ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Details */}
            <div className="px-4 space-y-3 text-sm pb-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Contact</p>
                    <p className="text-slate-700 dark:text-slate-300">{student.profile?.phone || '—'}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{student.email}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Parent</p>
                    <p className="text-slate-700 dark:text-slate-300">{student.profile?.parentName || '—'}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{student.profile?.parentPhone || student.profile?.parentEmail || ''}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Class</p>
                    <div className="flex flex-wrap gap-1">
                        {cls ? (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
                                {cls}{sec ? ` ${sec}` : ''}
                            </span>
                        ) : <span className="text-slate-400 text-xs">Not assigned</span>}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Admission No</p>
                    <p className="text-slate-700 dark:text-slate-300 font-mono text-xs">{student.profile?.admissionNo || '—'}</p>
                </div>
            </div>

            <div className="px-4 pb-4 mt-auto">
                <Link href={`/dashboard/students/${student._id}`}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold text-center block transition">
                    Full Profile
                </Link>
            </div>
        </div>
    );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function StudentsListPage() {
    const [students, setStudents]   = useState<Student[]>([]);
    const [classes,  setClasses]    = useState<SchoolClass[]>([]);
    const [loading,  setLoading]    = useState(true);
    const [search,   setSearch]     = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [page, setPage]           = useState(1);
    const [selected, setSelected]   = useState<string[]>([]);
    const [quickView, setQuickView] = useState<Student | null>(null);
    const [visiblePw, setVisiblePw] = useState<Set<string>>(new Set());
    const [user, setUser]           = useState<any>(null);

    // Modals
    const [isPromoteOpen,   setIsPromoteOpen]   = useState(false);
    const [isImportOpen,    setIsImportOpen]     = useState(false);
    const [isEditOpen,      setIsEditOpen]       = useState(false);
    const [promoteData,     setPromoteData]      = useState({ class: '', section: 'A' });
    const [bulkCsv,         setBulkCsv]         = useState('');
    const [editData,        setEditData]         = useState<any>(null);

    /* ── Fetch ──────────────────────────────────────────────────────────── */
    const fetchData = async () => {
        setLoading(true);
        try {
            const u = localStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
            const [sRes, cRes] = await Promise.all([api.get('/students'), api.get('/classes')]);
            setStudents(sRes.data.data || []);
            setClasses(cRes.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const isAdmin = user && ['school-admin', 'super-admin', 'receptionist'].includes(user.role);

    /* ── Derived: per-class counts ──────────────────────────────────────── */
    const classCounts = useMemo(() => {
        const map: Record<string, number> = {};
        students.forEach(s => {
            const key = `${s.profile?.class || ''}${s.profile?.section ? ` ${s.profile.section}` : ''}`.trim();
            if (key) map[key] = (map[key] || 0) + 1;
        });
        return map;
    }, [students]);

    /* ── Filtered + paginated ───────────────────────────────────────────── */
    const filtered = useMemo(() => students.filter(s => {
        const q = search.toLowerCase();
        const matchQ = !search ||
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            (s.profile?.admissionNo || '').toLowerCase().includes(q) ||
            (s.profile?.studentId || '').toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q);
        const matchCls = !filterClass ||
            `${s.profile?.class || ''}${s.profile?.section ? ` ${s.profile.section}` : ''}`.trim() === filterClass ||
            s.profile?.class === filterClass;
        return matchQ && matchCls;
    }), [students, search, filterClass]);

    useEffect(() => setPage(1), [search, filterClass]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* ── Selection ──────────────────────────────────────────────────────── */
    const allSelected = paginated.length > 0 && paginated.every(s => selected.includes(s._id));
    const toggleAll   = () => allSelected
        ? setSelected(prev => prev.filter(id => !paginated.find(s => s._id === id)))
        : setSelected(prev => Array.from(new Set([...prev, ...paginated.map(s => s._id)])));
    const toggle      = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    /* ── Helpers ────────────────────────────────────────────────────────── */
    const sectionsForClass = (name: string) => classes.filter(c => c.name === name);

    const handleExport = () => {
        const rows = (selected.length ? students.filter(s => selected.includes(s._id)) : students)
            .map(s => `"${s.firstName} ${s.lastName}","${s.email}","${s.profile?.admissionNo || ''}","${s.profile?.class || ''}","${s.profile?.section || ''}"`);
        const a = document.createElement('a');
        a.href = encodeURI('data:text/csv;charset=utf-8,Name,Email,Admission No,Class,Section\n' + rows.join('\n'));
        a.download = `students_${Date.now()}.csv`; a.click();
    };

    const handleResetPw = async (id: string) => {
        if (!confirm("Reset this student's password?")) return;
        try {
            const { data } = await api.post(`/students/${id}/reset-password`);
            alert(`New password: ${data.password}`);
            fetchData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this student?')) return;
        try { await api.delete(`/students/${id}`); fetchData(); }
        catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const handlePromote = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/students/promote', { studentIds: selected, nextClass: promoteData.class, nextSection: promoteData.section });
            alert(`${selected.length} students moved to ${promoteData.class} - ${promoteData.section}`);
            setIsPromoteOpen(false); setSelected([]); fetchData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const rows = bulkCsv.split('\n').filter(r => r.trim()).map(row => {
                const [firstName, lastName, email, cls, section] = row.split(',').map(s => s.trim());
                return { firstName, lastName, email, class: cls, section: section || 'A' };
            });
            const { data } = await api.post('/students/bulk-import', { students: rows });
            alert(`Imported: ${data.summary.success} success, ${data.summary.failed} failed`);
            setIsImportOpen(false); setBulkCsv(''); fetchData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const openEdit = (s: Student) => {
        setEditData({
            _id: s._id, firstName: s.firstName, lastName: s.lastName, email: s.email,
            class: s.profile?.class || '', section: s.profile?.section || 'A',
            admissionNo: s.profile?.admissionNo || '', studentId: s.profile?.studentId || '',
            rollNo: s.profile?.rollNo || '', dateOfBirth: s.profile?.dateOfBirth ? new Date(s.profile.dateOfBirth).toISOString().split('T')[0] : '',
            gender: s.profile?.gender || '', bloodGroup: s.profile?.bloodGroup || '',
            address: s.profile?.address || '', phone: s.profile?.phone || '',
            parentName: s.profile?.parentName || '', parentPhone: s.profile?.parentPhone || '', parentEmail: s.profile?.parentEmail || ''
        });
        setIsEditOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/students/${editData._id}`, {
                firstName: editData.firstName, lastName: editData.lastName, email: editData.email,
                profile: { class: editData.class, section: editData.section, admissionNo: editData.admissionNo, studentId: editData.studentId, rollNo: editData.rollNo, dateOfBirth: editData.dateOfBirth, gender: editData.gender, bloodGroup: editData.bloodGroup, address: editData.address, phone: editData.phone, parentName: editData.parentName, parentPhone: editData.parentPhone, parentEmail: editData.parentEmail }
            });
            setIsEditOpen(false); setEditData(null); fetchData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
    };

    const iw = 'w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500';

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">

            {/* ── Bulk Actions Bar ────────────────────────────────────────── */}
            {selected.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-sm font-bold text-slate-700 dark:text-white">Bulk Actions</span>
                    <div className="flex flex-wrap gap-2 ml-2">
                        <button onClick={handleExport}
                            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                            Export Selected
                        </button>
                        {isAdmin && (
                            <>
                                <button onClick={() => setIsPromoteOpen(true)}
                                    className="px-4 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                    Assign Class
                                </button>
                                <button onClick={async () => { if (!confirm(`Delete ${selected.length} students?`)) return; for (const id of selected) await api.delete(`/students/${id}`).catch(() => {}); setSelected([]); fetchData(); }}
                                    className="px-4 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                                    Delete Selected
                                </button>
                            </>
                        )}
                    </div>
                    <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-indigo-500 w-4 h-4 rounded" />
                        Select All
                    </label>
                </div>
            )}

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Students Directory</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage enrollments, profiles, and academic records.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {isAdmin && (
                        <button onClick={() => setIsImportOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold hover:border-slate-400 transition">
                            <UserPlus className="w-4 h-4" /> Bulk Import
                        </button>
                    )}
                    <button onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold hover:border-slate-400 transition">
                        <FileDown className="w-4 h-4" /> Export
                    </button>
                    {isAdmin && (
                        <Link href="/dashboard/students/add"
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                            <Plus className="w-4 h-4" /> Add Student
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Stats Row ───────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-6 px-5 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Total Students: <strong className="text-slate-800 dark:text-white ml-1">{students.length}</strong>
                </span>
                {Object.entries(classCounts).slice(0, 5).map(([cls, cnt]) => (
                    <button key={cls} onClick={() => setFilterClass(filterClass === cls ? '' : cls)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${filterClass === cls ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                        {cls} <span className="opacity-75">({cnt})</span>
                    </button>
                ))}
                {Object.keys(classCounts).length > 5 && (
                    <span className="text-xs text-slate-400">+{Object.keys(classCounts).length - 5} more</span>
                )}
            </div>

            {/* ── Search + Filter + Table area ────────────────────────────── */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search students..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <ClassFilterDropdown classes={classes} value={filterClass} onChange={setFilterClass} />
            </div>

            {/* ── Main content: table + quick-view ────────────────────────── */}
            <div className="flex gap-4 items-start">
                {/* Table */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                                    <th className="px-4 py-3 w-10">
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-indigo-500 w-4 h-4 rounded" />
                                    </th>
                                    <th className="px-4 py-3">Student Name</th>
                                    <th className="px-4 py-3">Student ID</th>
                                    <th className="px-4 py-3">Class</th>
                                    <th className="px-4 py-3">Parent Name</th>
                                    <th className="px-4 py-3">Contact</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 w-20 text-right">View</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 animate-pulse">Loading students...</td></tr>
                                ) : paginated.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-10">
                                        <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                                                <Users className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No students found</p>
                                            <p className="text-xs text-slate-400 max-w-xs">Try another filter, or add a new student to get started.</p>
                                            <Link href="/dashboard/students/add"
                                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500">
                                                <Plus className="w-3.5 h-3.5" /> Add student
                                            </Link>
                                        </div>
                                    </td></tr>
                                ) : paginated.map(s => {
                                    const isSelected = selected.includes(s._id);
                                    const isViewed   = quickView?._id === s._id;
                                    const initials   = `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();
                                    return (
                                        <tr key={s._id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : isViewed ? 'bg-slate-50 dark:bg-slate-700/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={isSelected} onChange={() => toggle(s._id)} className="accent-indigo-500 w-4 h-4 rounded" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-white leading-tight">{s.firstName} {s.lastName}</p>
                                                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{s.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {s.profile?.admissionNo || s.profile?.studentId || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-full">
                                                    {s.profile?.class ? `${s.profile.class}${s.profile.section ? ` ${s.profile.section}` : ''}` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{s.profile?.parentName || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                                {s.profile?.parentPhone || s.profile?.parentEmail || s.profile?.phone || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {s.status === 'active' ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => setQuickView(isViewed ? null : s)}
                                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${isViewed ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-500 hover:border-indigo-400'}`}>
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {isAdmin && (
                                                        <button onClick={() => openEdit(s)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-blue-500 hover:border-blue-400 transition">
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button onClick={() => handleDelete(s._id)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-red-500 hover:border-red-400 transition">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
                        <span>Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} entries</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:border-slate-400 transition">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const p = totalPages <= 5 ? i+1 : page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition ${page===p ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-600 hover:border-slate-400 text-slate-600 dark:text-slate-300'}`}>
                                        {p}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="px-1">…</span>}
                            {totalPages > 5 && (
                                <button onClick={() => setPage(totalPages)}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition ${page===totalPages ? 'bg-indigo-600 text-white' : 'border border-slate-200 dark:border-slate-600 hover:border-slate-400 text-slate-600 dark:text-slate-300'}`}>
                                    {totalPages}
                                </button>
                            )}
                            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 disabled:opacity-40 hover:border-slate-400 transition">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick View Panel */}
                {quickView && (
                    <QuickView student={quickView} classes={classes} onClose={() => setQuickView(null)} />
                )}
            </div>

            {/* ── Assign Class Modal ───────────────────────────────────────── */}
            {isPromoteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Assign Class ({selected.length} students)</h2>
                        <form onSubmit={handlePromote} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Target Class</label>
                                <select required value={promoteData.class} onChange={e => setPromoteData({ class: e.target.value, section: sectionsForClass(e.target.value)[0]?.section || 'A' })}
                                    className={iw}>
                                    <option value="">Select Class</option>
                                    {Array.from(new Set(classes.map(c => c.name))).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Section</label>
                                <select required value={promoteData.section} onChange={e => setPromoteData({ ...promoteData, section: e.target.value })} className={iw}>
                                    {sectionsForClass(promoteData.class).length > 0
                                        ? sectionsForClass(promoteData.class).map(c => <option key={c._id} value={c.section}>{c.section}</option>)
                                        : <option value="A">A</option>}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition">Confirm</button>
                                <button type="button" onClick={() => setIsPromoteOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Bulk Import Modal ────────────────────────────────────────── */}
            {isImportOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Bulk Student Import</h2>
                        <p className="text-xs text-slate-500 mb-4">Format: <span className="font-mono text-indigo-500">FirstName, LastName, Email, Class, Section</span></p>
                        <form onSubmit={handleImport} className="space-y-4">
                            <textarea required value={bulkCsv} onChange={e => setBulkCsv(e.target.value)}
                                rows={8} placeholder="John, Doe, john@school.com, Grade 10, A&#10;Jane, Smith, jane@school.com, Grade 9, B"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-mono text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            <div className="flex gap-3">
                                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition">Import</button>
                                <button type="button" onClick={() => setIsImportOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Student Modal ───────────────────────────────────────── */}
            {isEditOpen && editData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 my-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Edit Student</h2>
                        <form onSubmit={handleUpdate} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[['First Name','firstName','text'],['Last Name','lastName','text'],['Email','email','email'],['Phone','phone','tel']].map(([label, key, type]) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                                        <input type={type} value={editData[key]} onChange={e => setEditData({ ...editData, [key]: e.target.value })} className={iw} />
                                    </div>
                                ))}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Class</label>
                                    <select value={editData.class} onChange={e => setEditData({ ...editData, class: e.target.value, section: sectionsForClass(e.target.value)[0]?.section || 'A' })} className={iw}>
                                        <option value="">Select Class</option>
                                        {Array.from(new Set(classes.map(c => c.name))).map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Section</label>
                                    <select value={editData.section} onChange={e => setEditData({ ...editData, section: e.target.value })} className={iw}>
                                        {sectionsForClass(editData.class).length > 0
                                            ? sectionsForClass(editData.class).map(c => <option key={c._id} value={c.section}>{c.section}</option>)
                                            : <option value="A">A</option>}
                                    </select>
                                </div>
                                {[['Admission No','admissionNo'],['Student ID','studentId'],['Roll No','rollNo'],['Date of Birth','dateOfBirth','date'],['Gender','gender'],['Blood Group','bloodGroup'],['Parent Name','parentName'],['Parent Phone','parentPhone'],['Parent Email','parentEmail']].map(([label, key, type='text']) => (
                                    <div key={key} className={label === 'Parent Email' ? 'sm:col-span-2' : ''}>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
                                        <input type={type} value={editData[key]} onChange={e => setEditData({ ...editData, [key]: e.target.value })} className={iw} />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition">Save Changes</button>
                                <button type="button" onClick={() => { setIsEditOpen(false); setEditData(null); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
