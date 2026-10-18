"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';
import {
    GraduationCap, DollarSign, Users, CalendarCheck,
    Bell, CalendarDays, BookOpen, ArrowUpRight,
    ChevronRight, BarChart3, MoreHorizontal
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useLanguage } from '@/contexts/LanguageContext';
import ParentDashboard from './ParentDashboard';
import TeacherDashboard from './TeacherDashboard';
import SchoolAdminDashboard from './SchoolAdminDashboard';

export default function DashboardPage() {
    const router = useRouter();
    const { language, translate: t } = useLanguage();
    const [user, setUser] = useState<any>(null);
    const [adminData, setAdminData] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [marks, setMarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsFailed, setAnalyticsFailed] = useState(false);
    const [stats, setStats] = useState({
        totalStudents: 0, totalStaff: 0,
        feesCollected: 0, attendanceRate: '0%',
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const userData = JSON.parse(userStr);
        setUser(userData);

        if (userData.role === 'student') {
            router.replace('/dashboard/student');
            return;
        }

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
                            totalStudents: d.counts?.students || 0,
                            totalStaff: d.counts?.teachers || 0,
                            feesCollected: d.finance?.collected || 0,
                            attendanceRate: `${d.attendance?.rate || 0}%`,
                        });
                    } else setAnalyticsFailed(true);
                    setExams(examsRes.data.data || []);
                    setMarks(marksRes.data.data || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();

        if (userData?.tenantId) {
            initSocket(userData.tenantId);
            return () => { disconnectSocket(); };
        }
    }, [router]);

    const upcomingEvents = exams
        .filter(e => new Date(e.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 6)
        .map(e => ({
            label: e.name,
            date: new Date(e.startDate).toLocaleDateString(language === 'so' ? 'so-SO' : 'en-US', { day: '2-digit', month: 'short' }),
        }));

    const subjectPerf: Record<string, { total: number; count: number }> = {};
    marks.forEach((m: any) => {
        const name = m.subject?.name || t('Unknown');
        if (!subjectPerf[name]) subjectPerf[name] = { total: 0, count: 0 };
        subjectPerf[name].total += (m.marksObtained / m.maxMarks) * 100;
        subjectPerf[name].count++;
    });
    const perfRows = Object.entries(subjectPerf)
        .map(([name, { total, count }]) => ({ name, avg: (total / count).toFixed(0) }))
        .slice(0, 5);

    const isAdmin = ['school-admin', 'super-admin', 'receptionist'].includes(user?.role);
    const isTeacher = user?.role === 'teacher';

    const statCards = [
        { label: 'Total Students', value: adminData ? stats.totalStudents : '—', icon: <Users className="w-5 h-5" />, bg: 'bg-blue-500/15 text-[#1e3a8a] dark:text-cyan-300' },
        { label: 'Fees Collected', value: adminData ? `$${stats.feesCollected.toLocaleString()}` : '—', icon: <DollarSign className="w-5 h-5" />, bg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
        { label: 'Total Staff', value: adminData ? stats.totalStaff : '—', icon: <GraduationCap className="w-5 h-5" />, bg: 'bg-violet-500/15 text-violet-600' },
        { label: 'Avg Attendance', value: adminData ? stats.attendanceRate : '—', icon: <CalendarCheck className="w-5 h-5" />, bg: 'bg-pink-500/15 text-pink-600' },
    ];

    const quickActions = [
        { label: 'Add Student', href: '/dashboard/students/add', className: 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white' },
        { label: 'Post Announcement', href: '/dashboard/notifications', className: 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white' },
        { label: 'Create Exam', href: '/dashboard/exams', className: 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white' },
        { label: 'Generate Report', href: '/dashboard/reports', className: 'bg-rose-600 hover:bg-rose-500 border-rose-500 text-white' },
    ];

    if (loading) return <PageLoader label={t('Loading dashboard…')} />;

    if (isTeacher) {
        return <TeacherDashboard firstName={user?.firstName} />;
    }

    if (user?.role === 'parent') {
        return <ParentDashboard firstName={user.firstName} />;
    }

    if (user?.role === 'school-admin') {
        return <SchoolAdminDashboard firstName={user.firstName} data={adminData} events={upcomingEvents} analyticsFailed={analyticsFailed} />;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{t('Dashboard')}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('Welcome back')}, <span className="font-semibold text-indigo-500">{user?.firstName}</span>
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    {new Date().toLocaleDateString(language === 'so' ? 'so-SO' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            {isAdmin && analyticsFailed && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><p>School analytics are temporarily unavailable. Other dashboard sections remain available.</p><button onClick={() => window.location.reload()} className="font-semibold underline">Reload</button></div>}

            {isAdmin && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((s, i) => (
                        <Card key={i} className="flex flex-col gap-2 overflow-hidden relative" padding="md">
                            <div className="flex items-start justify-between">
                                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                                    {s.icon}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t(s.label)}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{s.value}</p>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2" padding="md">
                    <CardHeader
                        title={t('Recent Academic Performance')}
                        icon={<BookOpen className="w-4 h-4 text-indigo-500" />}
                        action={
                            <Link href="/dashboard/grade-entry" className="text-xs text-indigo-500 hover:underline flex items-center gap-0.5 font-semibold">
                                {t('View all')} <ChevronRight className="w-3 h-3" />
                            </Link>
                        }
                    />

                    {perfRows.length === 0 ? (
                        <EmptyState
                            icon={<BookOpen className="w-7 h-7" />}
                            title={t('No marks data yet')}
                            description={t('Grade entries will appear here once exams are recorded.')}
                            className="py-8"
                        />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                                    <th className="pb-2 text-left">{t('Subject')}</th>
                                    <th className="pb-2 text-left">{t('Average Score')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {perfRows.map((r, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{r.name}</td>
                                        <td className="py-2.5 text-slate-600 dark:text-slate-300">{r.avg}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-3">
                        {[
                            { label: 'Total Students', val: stats.totalStudents, href: '/dashboard/students' },
                            { label: 'Active Classes', val: adminData?.counts?.classes || 0, href: '/dashboard/classes' },
                            { label: 'Total Teachers', val: stats.totalStaff, href: '/dashboard/teachers' },
                        ].map((item) => (
                            <Link key={item.href} href={item.href}
                                className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition group">
                                <p className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition">{item.val}</p>
                                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-0.5">{t(item.label)}</p>
                            </Link>
                        ))}
                    </div>
                </Card>

                <Card className="flex flex-col" padding="md">
                    <CardHeader
                        title={t('Upcoming Events')}
                        icon={<Bell className="w-4 h-4 text-amber-500" />}
                        action={
                            <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        }
                    />

                    <div className="space-y-2 flex-1">
                        {upcomingEvents.length === 0 ? (
                            <EmptyState
                                icon={<CalendarCheck className="w-7 h-7" />}
                                title={t('No upcoming events')}
                                description={t('Scheduled exams and deadlines will show up here.')}
                                className="py-6"
                            />
                        ) : upcomingEvents.map((ev, i) => {
                            const colors = [
                                'bg-indigo-500/15 text-indigo-500',
                                'bg-amber-500/15 text-amber-500',
                                'bg-blue-500/15 text-blue-500',
                                'bg-pink-500/15 text-pink-500',
                                'bg-teal-500/15 text-teal-500',
                                'bg-violet-500/15 text-violet-500',
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
                        {t('View all exams →')}
                    </Link>
                </Card>
            </div>

            {isAdmin && (
                <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4" padding="md">
                    <span className="text-sm font-semibold text-slate-700 dark:text-white shrink-0">{t('Quick actions')}</span>
                    <div className="flex flex-wrap gap-2">
                        {quickActions.map((a) => (
                            <Link key={a.href} href={a.href}
                                className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${a.className}`}>
                                {t(a.label)}
                            </Link>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Students', href: '/dashboard/students', icon: <Users className="w-5 h-5" />, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
                    { label: 'Teachers', href: '/dashboard/teachers', icon: <GraduationCap className="w-5 h-5" />, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30' },
                    { label: 'Classes', href: '/dashboard/classes', icon: <BookOpen className="w-5 h-5" />, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
                    { label: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-5 h-5" />, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
                    { label: 'Finance', href: '/dashboard/fee-hub', icon: <DollarSign className="w-5 h-5" />, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
                    { label: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5" />, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' },
                ].map((s) => (
                    <Link key={s.href} href={s.href}
                        className="surface-card p-4 flex flex-col items-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color} group-hover:scale-105 transition-transform`}>
                            {s.icon}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t(s.label)}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
