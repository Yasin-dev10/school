"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarCheck, CalendarClock, ClipboardList, GraduationCap, Users } from 'lucide-react';
import api from '../utils/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';

type ClassRow = { id: string; name: string; section?: string; studentCount?: number };
type Slot = { id: string; day: string; startTime: string; endTime: string; class?: { name: string; section?: string }; subject?: { name: string } };
type Assignment = { id: string; title: string; dueDate?: string; class?: { name: string; section?: string }; subject?: { name: string }; submissions?: { id: string; status: string }[] };

const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

export default function TeacherDashboard({ firstName }: { firstName?: string }) {
    const [classes, setClasses] = useState<ClassRow[]>([]);
    const [timetable, setTimetable] = useState<Slot[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [classResult, timetableResult, assignmentResult] = await Promise.all([
                api.get('/classes'), api.get('/timetable/teacher/me'), api.get('/assignments'),
            ]);
            setClasses(classResult.data.data || []);
            setTimetable(timetableResult.data.data || []);
            setAssignments(assignmentResult.data.data || []);
        } catch {
            setError('We could not load your teaching overview. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (loading) return <PageLoader label="Loading your teaching dashboard…" />;
    if (error) return <div role="alert" className="mx-auto mt-8 max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center dark:border-rose-900 dark:bg-slate-900"><h1 className="font-bold text-slate-900 dark:text-white">{error}</h1><button onClick={() => void load()} className="mt-4 rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white">Try again</button></div>;

    const todaySlots = timetable.filter((slot) => slot.day.toLowerCase() === weekday.toLowerCase()).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const pendingSubmissions = assignments.reduce((total, assignment) => total + (assignment.submissions || []).filter((submission) => submission.status === 'submitted').length, 0);
    const dueSoon = assignments.filter((assignment) => assignment.dueDate && new Date(assignment.dueDate).getTime() >= Date.now()).slice(0, 4);

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Teacher workspace</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Good day{firstName ? `, ${firstName}` : ''}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your assigned classes, timetable and student work in one place.</p>
                </div>
                <Link href="/dashboard/attendance" className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-cyan-500"><CalendarCheck className="h-4 w-4" /> Mark attendance</Link>
            </header>

            <section aria-label="Teaching overview" className="grid gap-4 sm:grid-cols-3">
                {[
                    { label: 'Assigned classes', value: classes.length, icon: <Users className="h-5 w-5" />, href: '/dashboard/classes' },
                    { label: 'Classes today', value: todaySlots.length, icon: <CalendarClock className="h-5 w-5" />, href: '/dashboard/timetable' },
                    { label: 'Work to review', value: pendingSubmissions, icon: <ClipboardList className="h-5 w-5" />, href: '/dashboard/assignments' },
                ].map((metric) => <Link key={metric.label} href={metric.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-cyan-800"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</span><span className="rounded-xl bg-cyan-50 p-2.5 text-[#1e3a8a] dark:bg-cyan-950/60 dark:text-cyan-300">{metric.icon}</span></div><p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{metric.value}</p></Link>)}
            </section>

            <section className="grid gap-5 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-3">
                    <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">Today&apos;s timetable</h2><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}</p></div><Link href="/dashboard/timetable" className="text-sm font-semibold text-[#1e3a8a] hover:underline dark:text-cyan-300">Full timetable</Link></div>
                    {todaySlots.length ? <ol className="divide-y divide-slate-100 dark:divide-slate-800">{todaySlots.map((slot) => <li key={slot.id} className="flex items-center gap-3 py-3"><span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-[#1e3a8a] dark:text-cyan-300">{slot.startTime}–{slot.endTime}</span><span className="h-9 w-1 rounded-full bg-cyan-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{slot.subject?.name || 'Lesson'}</p><p className="text-xs text-slate-500">{slot.class?.name || 'Class'}{slot.class?.section ? ` · ${slot.class.section}` : ''}</p></div></li>)}</ol> : <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No classes scheduled today" description="Your next assigned lessons will appear in your timetable." className="py-7" />}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900 dark:text-white">Assigned classes</h2><GraduationCap className="h-5 w-5 text-cyan-600" /></div>
                    {classes.length ? <ul className="space-y-2">{classes.slice(0, 5).map((item) => <li key={item.id}><Link href={`/dashboard/classes`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 transition hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-800"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{item.name}{item.section ? ` · ${item.section}` : ''}</span><span className="text-xs text-slate-500">{item.studentCount ?? '—'} students</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /></Link></li>)}</ul> : <EmptyState icon={<Users className="h-6 w-6" />} title="No classes assigned" description="Classes will appear here when they are assigned to you." className="py-7" />}
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">Assignments and submissions</h2><p className="mt-1 text-xs text-slate-500">Assignments belonging to your account.</p></div><Link href="/dashboard/assignments" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1e3a8a] hover:underline dark:text-cyan-300">Open assignments <ArrowRight className="h-4 w-4" /></Link></div>
                {dueSoon.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dueSoon.map((assignment) => <article key={assignment.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex items-start gap-3"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" /><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{assignment.title}</h3><p className="mt-1 truncate text-xs text-slate-500">{assignment.class?.name || 'Class'} · {assignment.subject?.name || 'Subject'}</p><p className="mt-3 text-xs text-slate-500">{assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}` : 'No due date'}</p></div></div></article>)}</div> : <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No upcoming assignments" description="Your published assignments will appear here." className="py-6" />}
            </section>
        </div>
    );
}
