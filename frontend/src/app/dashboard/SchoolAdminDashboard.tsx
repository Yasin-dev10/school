"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Activity, ArrowRight, ArrowUpRight, Bell, BookOpenCheck,
    CalendarCheck, CalendarDays, CircleDollarSign, GraduationCap, Plus,
    ReceiptText, Users, UserRoundCheck, Wallet, Clock3,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '../utils/api';

type DashboardData = {
    counts?: { students?: number; teachers?: number; parents?: number; classes?: number };
    finance?: { totalRevenue?: number; collected?: number; pending?: number };
    attendance?: { rate?: number; present?: number; total?: number; trends?: Array<{ date: string; rate: string | number }> };
    trends?: { enrollment?: Array<{ _id: number; count: number }> };
    distribution?: { classes?: Array<{ _id: string; count: number }> };
};

type Event = { id?: string; label: string; date: string; href?: string };
type TimetableSlot = { id?: string; _id?: string; day: string; startTime: string; endTime: string; room?: string; class?: { name?: string; section?: string }; subject?: { name?: string } };

const money = (value = 0) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

export default function SchoolAdminDashboard({
    firstName,
    data,
    events,
    analyticsFailed,
}: {
    firstName?: string;
    data: DashboardData | null;
    events: Event[];
    analyticsFailed: boolean;
}) {
    const { language } = useLanguage();
    const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(true);
    const today = new Date();
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
    const attendance = data?.attendance;
    const finance = data?.finance;
    const collectionRate = finance?.totalRevenue ? Math.min(100, (finance.collected || 0) / finance.totalRevenue * 100) : 0;
    const trends = attendance?.trends?.slice(-7) || [];
    const maxClassCount = Math.max(1, ...(data?.distribution?.classes || []).map((item) => item.count));
    useEffect(() => {
        let active = true;
        api.get('/timetable').then(({ data: response }) => {
            if (active) setSchedule((response?.data || []).filter((slot: TimetableSlot) => slot.day === weekday).sort((a: TimetableSlot, b: TimetableSlot) => a.startTime.localeCompare(b.startTime)));
        }).catch(() => { if (active) setSchedule([]); }).finally(() => { if (active) setScheduleLoading(false); });
        return () => { active = false; };
    }, [weekday]);
    const cards = [
        { label: 'Total students', value: data ? money(data.counts?.students) : '—', detail: `${data?.counts?.classes ?? '—'} active classes`, icon: Users, tone: 'blue', href: '/dashboard/students' },
        { label: 'Total teachers', value: data ? money(data.counts?.teachers) : '—', detail: 'Teaching staff', icon: GraduationCap, tone: 'violet', href: '/dashboard/teachers' },
        { label: 'Parent accounts', value: data ? money(data.counts?.parents) : '—', detail: 'Linked families', icon: UserRoundCheck, tone: 'cyan', href: '/dashboard/communication' },
        { label: 'Fees collected', value: data ? money(finance?.collected) : '—', detail: 'Collected to date', icon: CircleDollarSign, tone: 'amber', href: '/dashboard/fee-hub' },
        { label: 'Pending fees', value: data ? money(finance?.pending) : '—', detail: 'Outstanding balance', icon: Wallet, tone: 'rose', href: '/dashboard/fee-hub' },
    ];
    const quickLinks = [
        { label: 'Admit student', href: '/dashboard/students/add', icon: Plus },
        { label: 'Take attendance', href: '/dashboard/attendance', icon: CalendarCheck },
        { label: 'Record payment', href: '/dashboard/fee-hub', icon: ReceiptText },
        { label: 'Create exam', href: '/dashboard/exams', icon: BookOpenCheck },
    ];
    const tones: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
        cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    };

    return (
        <div className="mx-auto max-w-[1600px] space-y-5 pb-8">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">School overview</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Good {today.getHours() < 12 ? 'morning' : today.getHours() < 17 ? 'afternoon' : 'evening'}, {firstName || 'Admin'}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here’s what’s happening at your school today.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <CalendarDays className="h-4 w-4 text-cyan-600" />
                        {today.toLocaleDateString(language === 'so' ? 'so-SO' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <Link href="/dashboard/notifications" className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900">
                        <Bell className="h-4 w-4" /> Announcements
                    </Link>
                </div>
            </header>

            {analyticsFailed && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><span>School analytics are temporarily unavailable. Try refreshing to load the latest data.</span><button onClick={() => window.location.reload()} className="font-semibold underline">Refresh</button></div>}

            <section aria-label="School metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {cards.map(({ label, value, detail, icon: Icon, tone, href }) => (
                    <Link key={label} href={href} className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
                        <Card className="h-full transition duration-200 group-hover:-translate-y-0.5 group-hover:border-cyan-200 group-hover:shadow-md" padding="md">
                            <div className="flex items-start justify-between"><span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div>
                            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                        </Card>
                    </Link>
                ))}
            </section>

            <section aria-label="Quick actions">
                <div className="mb-3"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick actions</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Frequently used school tasks</p></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {quickLinks.map(({ label, href, icon: Icon }, index) => <Link key={label} href={href} className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800"><span className={`grid h-10 w-10 place-items-center rounded-xl ${['bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'][index]}`}><Icon className="h-5 w-5" /></span><span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span></Link>)}
                </div>
            </section>

            <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
                <div className="space-y-4 xl:col-span-8">
                <Card padding="md">
                    <CardHeader title="Attendance trend" icon={<Activity className="h-4 w-4 text-cyan-600" />} action={<Link href="/dashboard/attendance" className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">View attendance <ArrowRight className="h-3.5 w-3.5" /></Link>} />
                    {trends.length ? <div className="grid h-48 grid-cols-7 items-end gap-2 border-b border-slate-100 pb-2 dark:border-slate-700 sm:gap-4">
                        {trends.map((item) => {
                            const rate = Math.max(0, Math.min(100, Number(item.rate) || 0));
                            return <div key={item.date} className="flex h-full flex-col items-center justify-end gap-2"><span className="text-[10px] font-semibold text-slate-500">{Math.round(rate)}%</span><div className="w-full max-w-12 rounded-t-lg bg-cyan-500 transition-all" style={{ height: `${Math.max(rate, 4)}%` }} title={`${item.date}: ${rate}%`} /><span className="text-[10px] text-slate-400">{new Date(`${item.date}T00:00:00`).toLocaleDateString(language === 'so' ? 'so-SO' : 'en-US', { weekday: 'short' })}</span></div>;
                        })}
                    </div> : <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="No attendance trend yet" description="Recorded attendance will appear here." className="py-8" />}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400"><span>Today: <strong className="text-slate-800 dark:text-white">{attendance?.rate ?? 0}% present</strong></span><span>{attendance?.present ?? 0} present / {attendance?.total ?? 0} records</span></div>
                </Card>

                <Card padding="md">
                    <CardHeader title="Students by class" icon={<GraduationCap className="h-4 w-4 text-blue-700" />} action={<Link href="/dashboard/classes" className="text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">Manage classes</Link>} />
                    {(data?.distribution?.classes || []).length ? <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">{data?.distribution?.classes?.slice(0, 6).map((item) => <div key={item._id}><div className="mb-1.5 flex justify-between gap-2 text-xs"><span className="truncate font-medium text-slate-700 dark:text-slate-200">{item._id}</span><span className="text-slate-500">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-[#1E3A8A] dark:bg-cyan-500" style={{ width: `${item.count / maxClassCount * 100}%` }} /></div></div>)}</div> : <EmptyState icon={<Users className="h-6 w-6" />} title="No class data yet" description="Student class distribution will appear when records are assigned." className="py-6" />}
                </Card>
                </div>

                <div className="space-y-4 xl:col-span-4">
                <Card padding="md">
                    <CardHeader title="Staff attendance today" icon={<UserRoundCheck className="h-4 w-4 text-cyan-600" />} action={<Link href="/dashboard/attendance" className="text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">Details</Link>} />
                    <div className="flex items-center gap-5 py-1">
                        <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#06B6D4 ${attendance?.rate || 0}%, #e2e8f0 0)` }}><div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center dark:bg-slate-800"><span><strong className="block text-2xl text-slate-900 dark:text-white">{data ? `${attendance?.rate || 0}%` : '—'}</strong><small className="text-[10px] text-slate-500">Present</small></span></div></div>
                        <div className="space-y-3 text-xs"><p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Present <strong className="ml-auto">{attendance?.present ?? '—'}</strong></p><p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Other statuses <strong className="ml-auto">{attendance ? Math.max(0, (attendance.total || 0) - (attendance.present || 0)) : '—'}</strong></p><p className="text-slate-400">{attendance?.total ?? 0} student records</p></div>
                    </div>
                </Card>

                <Card padding="md">
                    <CardHeader title="Today’s schedule" icon={<Clock3 className="h-4 w-4 text-blue-700" />} action={<Link href="/dashboard/timetable" className="text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">View timetable</Link>} />
                    {scheduleLoading ? <div className="space-y-3" aria-label="Loading schedule">{[1, 2, 3].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />)}</div> : schedule.length ? <div className="divide-y divide-slate-100 dark:divide-slate-700">{schedule.slice(0, 5).map((slot, index) => <div key={slot.id || slot._id || index} className="flex gap-3 py-3 first:pt-0 last:pb-0"><span className="w-14 shrink-0 text-xs font-semibold text-slate-500">{slot.startTime}</span><span className="min-w-0 flex-1 border-l-2 border-cyan-500 pl-3"><strong className="block truncate text-xs text-slate-800 dark:text-slate-200">{slot.class?.name || 'Class'}{slot.class?.section ? ` ${slot.class.section}` : ''} · {slot.subject?.name || 'Lesson'}</strong><span className="mt-1 block truncate text-[11px] text-slate-500">{slot.endTime}{slot.room ? ` · Room ${slot.room}` : ''}</span></span></div>)}</div> : <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No classes scheduled today" description="There are no timetable entries for today." className="py-5" />}
                </Card>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card padding="md">
                    <CardHeader title="Fee collection" icon={<CircleDollarSign className="h-4 w-4 text-amber-600" />} action={<Link href="/dashboard/fee-hub" className="text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">Details</Link>} />
                    <div className="mt-5 flex items-end justify-between gap-2"><div><p className="text-xs text-slate-500 dark:text-slate-400">Collected to date</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{data ? `Rs ${money(finance?.collected)}` : '—'}</p></div><span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{collectionRate.toFixed(0)}%</span></div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${collectionRate}%` }} /></div>
                    <div className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Expected revenue</span><strong className="text-slate-800 dark:text-slate-200">{data ? `Rs ${money(finance?.totalRevenue)}` : '—'}</strong></div><div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Outstanding</span><strong className="text-amber-700 dark:text-amber-300">{data ? `Rs ${money(finance?.pending)}` : '—'}</strong></div></div>
                    <Link href="/dashboard/finance" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700">Open finance <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                </Card>
                <Card padding="md">
                    <CardHeader title="Upcoming exams" icon={<CalendarCheck className="h-4 w-4 text-violet-600" />} action={<Link href="/dashboard/exams" className="text-xs font-semibold text-[#1E3A8A] hover:underline dark:text-cyan-300">All exams</Link>} />
                    {events.length ? <div className="divide-y divide-slate-100 dark:divide-slate-700">{events.slice(0, 5).map((event, index) => <Link key={event.id || `${event.label}-${index}`} href={event.href || '/dashboard/exams'} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"><CalendarDays className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{event.label}</span><span className="text-xs text-slate-500">{event.date}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></Link>)}</div> : <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="No upcoming exams" description="Scheduled exams will appear here." className="py-6" />}
                </Card>
            </section>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"><span>School data is updated from your live records.</span><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Live data</span></div>
        </div>
    );
}
