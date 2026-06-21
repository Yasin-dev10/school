"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';
import {
    GraduationCap, DollarSign, Users, CalendarCheck,
    TrendingUp, Bell, UserPlus, CalendarDays, FileText,
    FileBadge, BarChart3, Loader2, MoreHorizontal,
    ChevronRight, BookOpen, ArrowUpRight
} from 'lucide-react';

/* ─── tiny SVG sparkline ──────────────────────────────────────────────────── */
function Sparkline({ color, up }: { color: string; up?: boolean }) {
    const points = up
        ? "0,28 8,22 16,25 24,18 32,20 40,12 48,15 56,8 64,10 72,4"
        : "0,4 8,10 16,8 24,15 32,12 40,18 48,15 56,20 64,18 72,24";
    return (
        <svg viewBox="0 0 72 32" className="w-full h-8" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function DashboardPage() {
    const [user,      setUser]      = useState<any>(null);
    const [adminData, setAdminData] = useState<any>(null);
    const [exams,     setExams]     = useState<any[]>([]);
    const [marks,     setMarks]     = useState<any[]>([]);
    const [loading,   setLoading]   = useState(true);
    const [stats, setStats] = useState({
        totalStudents: 0, totalStaff: 0,
        monthlyRevenue: 0, attendanceRate: '0%',
        newStudents: 0, newStaff: 0, revenueChange: 0, attChange: 0,
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const userData = JSON.parse(userStr);
        setUser(userData);

        (async () => {
            try {
                if (['school-admin', 'super-admin', 'receptionist'].includes(userData.role)) {
                    const [analytics, examsRes, marksRes] = await Promise.all([
                        api.get('/analytics/admin/overview').catch(() => null),
                        api.get('/exams').catch(() => ({ data: { data: [] } })),
                        api.get('/exams/marks').catch(() => ({ data: { data: [] } })),
                    ]);
                    const d = analytics?.data?.data;
                    if (d) {
                        setAdminData(d);
                        setStats({
                            totalStudents:   d.counts?.students   || 0,
                            totalStaff:      d.counts?.teachers   || 0,
                            monthlyRevenue:  d.finance?.collected || 0,
                            attendanceRate:  `${d.attendance?.rate || 0}%`,
                            newStudents: 5, newStaff: 2,
                            revenueChange: 12, attChange: 1,
                        });
                    }
                    setExams(examsRes.data.data || []);
                    setMarks(marksRes.data.data || []);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();

        if (userData?.tenantId) {
            const socket = initSocket(userData.tenantId);
            return () => { disconnectSocket(); };
        }
    }, []);

    /* ── Derived: upcoming events from exams ─────────────────────────── */
    const upcomingEvents = exams
        .filter(e => new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 6)
        .map(e => ({
            label: e.name,
            date: new Date(e.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
            color: 'bg-indigo-500/20 text-indigo-400',
        }));

    /* ── Derived: recent academic performance ─────────────────────────── */
    const subjectPerf: Record<string, { total: number; count: number }> = {};
    marks.forEach((m: any) => {
        const name = m.subject?.name || 'Unknown';
        if (!subjectPerf[name]) subjectPerf[name] = { total: 0, count: 0 };
        subjectPerf[name].total += (m.marksObtained / m.maxMarks) * 100;
        subjectPerf[name].count++;
    });
    const perfRows = Object.entries(subjectPerf)
        .map(([name, { total, count }]) => ({ name, avg: (total / count).toFixed(0) }))
        .slice(0, 5);

    const statCards = [
        { label: 'Total Students', value: stats.totalStudents, change: `+${stats.newStudents}%`, up: true,  icon: <Users className="w-5 h-5" />,        color: '#818cf8', bg: 'bg-indigo-500/20' },
        { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, change: `+${stats.revenueChange}%`, up: true,  icon: <DollarSign className="w-5 h-5" />,   color: '#34d399', bg: 'bg-emerald-500/20' },
        { label: 'Total Staff',     value: stats.totalStaff,     change: `+${stats.newStaff}`,    up: true,  icon: <GraduationCap className="w-5 h-5" />, color: '#c084fc', bg: 'bg-purple-500/20' },
        { label: 'Avg Attendance',  value: stats.attendanceRate, change: `+${stats.attChange}%`, up: true,  icon: <CalendarCheck className="w-5 h-5" />, color: '#f472b6', bg: 'bg-pink-500/20' },
    ];

    const quickActions = [
        { label: 'Add Student',       href: '/dashboard/students/add',  bg: 'border-indigo-500/40 hover:bg-indigo-600' },
        { label: 'Post Announcement', href: '/dashboard/notifications',  bg: 'border-teal-500/40 hover:bg-teal-600 bg-teal-600' },
        { label: 'Create Event',      href: '/dashboard/exams',          bg: 'border-slate-500/40 hover:bg-slate-600' },
        { label: 'Generate Report',   href: '/dashboard/reports',        bg: 'border-pink-500/40 hover:bg-pink-600' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Welcome back, <span className="font-semibold text-indigo-500">{user?.firstName}</span>
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            {/* ── Stat Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2 overflow-hidden relative">
                        <div className="flex items-start justify-between">
                            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`} style={{ color: s.color }}>
                                {s.icon}
                            </div>
                            <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                                {s.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">{s.value}</p>
                        </div>
                        <div className="mt-1 opacity-60">
                            <Sparkline color={s.color} up={s.up} />
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Middle row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Recent Academic Performance */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-500" /> Recent Academic Performance
                        </h2>
                        <Link href="/dashboard/grade-entry" className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5">
                            View all <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {perfRows.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-sm">No marks data yet.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                                    <th className="pb-2 text-left">Subject</th>
                                    <th className="pb-2 text-left">Average Score</th>
                                    <th className="pb-2 text-left">Trend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {perfRows.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{r.name}</td>
                                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.avg}%</td>
                                        <td className="py-2.5">
                                            <span className="text-emerald-500 font-bold text-base leading-none">+</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Quick stats row */}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total Students', val: stats.totalStudents, href: '/dashboard/students' },
                            { label: 'Active Classes',  val: adminData?.counts?.classes || 0, href: '/dashboard/classes' },
                            { label: 'Total Teachers',  val: stats.totalStaff, href: '/dashboard/teachers' },
                        ].map((item, i) => (
                            <Link key={i} href={item.href}
                                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition group">
                                <p className="text-lg font-black text-slate-800 dark:text-white group-hover:text-indigo-500 transition">{item.val}</p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">{item.label}</p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Upcoming Events & Deadlines */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Bell className="w-4 h-4 text-amber-500" /> Upcoming Events & Deadlines
                        </h2>
                        <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2 flex-1">
                        {upcomingEvents.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No upcoming events.</p>
                        ) : upcomingEvents.map((ev, i) => {
                            const colors = [
                                'bg-indigo-500/15 text-indigo-400',
                                'bg-amber-500/15 text-amber-400',
                                'bg-blue-500/15 text-blue-400',
                                'bg-pink-500/15 text-pink-400',
                                'bg-teal-500/15 text-teal-400',
                                'bg-purple-500/15 text-purple-400',
                            ];
                            return (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors[i % colors.length]}`}>
                                        <CalendarCheck className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{ev.label}</p>
                                        <p className="text-[10px] text-slate-400">{ev.date}</p>
                                    </div>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                </div>
                            );
                        })}
                    </div>

                    <Link href="/dashboard/exams"
                        className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-center text-indigo-500 hover:underline font-semibold">
                        View all exams →
                    </Link>
                </div>
            </div>

            {/* ── Quick Actions Bar ────────────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span className="text-sm font-bold text-slate-700 dark:text-white shrink-0">Quick Action</span>
                <div className="flex flex-wrap gap-2">
                    {quickActions.map((a, i) => (
                        <Link key={i} href={a.href}
                            className={`px-4 py-2 rounded-lg border text-sm font-semibold text-white transition ${a.bg}`}>
                            {a.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Bottom row: shortcuts ────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Students',    href: '/dashboard/students',    icon: <Users className="w-5 h-5" />,        color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
                    { label: 'Teachers',    href: '/dashboard/teachers',    icon: <GraduationCap className="w-5 h-5" />, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
                    { label: 'Classes',     href: '/dashboard/classes',     icon: <BookOpen className="w-5 h-5" />,      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
                    { label: 'Attendance',  href: '/dashboard/attendance',  icon: <CalendarCheck className="w-5 h-5" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
                    { label: 'Finance',     href: '/dashboard/fee-hub',     icon: <DollarSign className="w-5 h-5" />,    color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
                    { label: 'Reports',     href: '/dashboard/reports',     icon: <BarChart3 className="w-5 h-5" />,     color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' },
                ].map((s, i) => (
                    <Link key={i} href={s.href}
                        className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} group-hover:scale-110 transition-transform`}>
                            {s.icon}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{s.label}</span>
                    </Link>
                ))}
            </div>

        </div>
    );
}
