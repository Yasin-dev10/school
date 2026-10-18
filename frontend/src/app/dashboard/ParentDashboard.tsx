"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react';
import api from '../utils/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';

type ChildSummary = {
    id: string;
    firstName: string;
    lastName: string;
    admissionNo?: string;
    profileClass?: string;
    profileSection?: string;
};

export default function ParentDashboard({ firstName }: { firstName?: string }) {
    const [children, setChildren] = useState<ChildSummary[]>([]);
    const [summaries, setSummaries] = useState<Record<string, { attendance: string; marks: number }>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await api.get('/parent/children');
                const linkedChildren: ChildSummary[] = data.data || [];
                if (!active) return;
                setChildren(linkedChildren);
                const rows = await Promise.all(linkedChildren.map(async (child) => {
                    const [attendance, marks] = await Promise.all([
                        api.get(`/parent/child/${child.id}/attendance`).catch(() => null),
                        api.get(`/parent/child/${child.id}/marks`).catch(() => null),
                    ]);
                    return [child.id, {
                        attendance: attendance?.data?.data?.stats?.percentage ?? '—',
                        marks: marks?.data?.data?.length ?? 0,
                    }] as const;
                }));
                if (active) setSummaries(Object.fromEntries(rows));
            } catch {
                if (active) setError('We could not load linked student records. Please try again.');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    if (loading) return <PageLoader label="Loading family dashboard…" />;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Family portal</p>
                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back{firstName ? `, ${firstName}` : ''}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A clear view of the children linked to your account.</p>
                </div>
                <Link href="/dashboard/communication" className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-cyan-500">
                    Contact school <ArrowRight className="h-4 w-4" />
                </Link>
            </header>

            {error ? (
                <section role="alert" className="rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300">
                    <p>{error}</p><button onClick={() => window.location.reload()} className="mt-3 font-semibold underline">Try again</button>
                </section>
            ) : children.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900">
                    <EmptyState icon={<Users className="h-7 w-7" />} title="No linked students yet" description="Ask the school administrator to link your parent account to a student record." />
                </section>
            ) : (
                <>
                    <section aria-label="Linked students" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {children.map((child) => (
                            <article key={child.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1e3a8a] dark:bg-blue-950 dark:text-cyan-300"><GraduationCap className="h-5 w-5" /></span>
                                        <div><h2 className="font-bold text-slate-900 dark:text-white">{child.firstName} {child.lastName}</h2><p className="text-xs text-slate-500">{[child.profileClass, child.profileSection && `Section ${child.profileSection}`].filter(Boolean).join(' · ') || 'Class not set'}</p></div>
                                    </div>
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Attendance</p><p className="mt-1 flex items-center gap-1.5 font-bold text-slate-900 dark:text-white"><Activity className="h-4 w-4 text-cyan-600" />{summaries[child.id]?.attendance ?? '—'}{summaries[child.id]?.attendance !== '—' ? '%' : ''}</p></div>
                                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Recorded marks</p><p className="mt-1 flex items-center gap-1.5 font-bold text-slate-900 dark:text-white"><BookOpen className="h-4 w-4 text-cyan-600" />{summaries[child.id]?.marks ?? '—'}</p></div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                    <Link href={`/dashboard/parent/child/${child.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900">View progress <ArrowRight className="h-3.5 w-3.5" /></Link>
                                    <Link href="/dashboard/grades" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><CalendarDays className="h-3.5 w-3.5" />Results</Link>
                                </div>
                            </article>
                        ))}
                    </section>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Student records shown here are limited to children linked to your account.</p>
                </>
            )}
        </div>
    );
}
