"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, ArrowLeft, BookOpen, CalendarClock, ClipboardList, CreditCard, MessageSquare } from 'lucide-react';
import api from '../../../../utils/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';

type Tab = 'overview' | 'attendance' | 'academics' | 'timetable' | 'fees' | 'assignments' | 'materials';

export default function ChildDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [child, setChild] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [marks, setMarks] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [childRes, attendanceRes, marksRes, timetableRes, invoicesRes, classesRes] = await Promise.all([
                api.get(`/students/${id}`),
                api.get(`/parent/child/${id}/attendance`),
                api.get(`/parent/child/${id}/marks`),
                api.get(`/parent/child/${id}/timetable`),
                api.get(`/fees/invoices?studentId=${id}`),
                api.get('/classes'),
            ]);
            const student = childRes.data.data;
            setChild(student);
            setAttendance(attendanceRes.data.data);
            setMarks(marksRes.data.data || []);
            setTimetable(timetableRes.data.data || []);
            setInvoices((invoicesRes.data.data || []).filter((invoice: any) => invoice.studentId === id));
            const studentClass = (classesRes.data.data || []).find((item: any) => item.name === student.profile?.class && (!student.profile?.section || item.section === student.profile.section));
            if (studentClass) {
                const [assignmentRes, materialRes] = await Promise.all([
                    api.get('/assignments', { params: { classId: studentClass.id } }),
                    api.get('/materials', { params: { classId: studentClass.id } }),
                ]);
                setAssignments(assignmentRes.data.data || []);
                setMaterials(materialRes.data.data || []);
            } else {
                setAssignments([]);
                setMaterials([]);
            }
        } catch {
            setError('We could not load this student record. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { void load(); }, [load]);

    if (loading) return <PageLoader label="Loading student records…" />;
    if (error || !child) return <div role="alert" className="mx-auto mt-8 max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center dark:border-rose-900 dark:bg-slate-900"><h1 className="font-bold text-slate-900 dark:text-white">{error || 'Student record unavailable'}</h1><button onClick={() => void load()} className="mt-4 rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white">Try again</button><Link href="/dashboard" className="ml-3 text-sm font-semibold text-[#1e3a8a] dark:text-cyan-300">Back to family portal</Link></div>;

    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const todaysClasses = timetable.filter((slot) => slot.day.toLowerCase() === today.toLowerCase());
    const unpaidBalance = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)), 0);
    const average = marks.length ? marks.reduce((sum, mark) => sum + (mark.maxMarks ? Number(mark.marksObtained) / Number(mark.maxMarks) * 100 : 0), 0) / marks.length : null;
    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
        { id: 'attendance', label: 'Attendance', icon: <CalendarClock className="h-4 w-4" /> },
        { id: 'academics', label: 'Results', icon: <BookOpen className="h-4 w-4" /> },
        { id: 'timetable', label: 'Timetable', icon: <CalendarClock className="h-4 w-4" /> },
        { id: 'fees', label: 'Fees', icon: <CreditCard className="h-4 w-4" /> },
        { id: 'assignments', label: 'Assignments', icon: <ClipboardList className="h-4 w-4" /> },
        { id: 'materials', label: 'Materials', icon: <BookOpen className="h-4 w-4" /> },
    ];
    const surface = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-[#1e3a8a] dark:bg-blue-950 dark:text-cyan-300">{child.firstName?.charAt(0)}{child.lastName?.charAt(0)}</span>
                    <div><p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Family portal / Student</p><h1 className="text-xl font-bold text-slate-900 dark:text-white">{child.firstName} {child.lastName}</h1><p className="text-xs text-slate-500">{[child.profile?.class && `Class ${child.profile.class}`, child.profile?.section && `Section ${child.profile.section}`, child.profile?.rollNo && `Roll ${child.profile.rollNo}`].filter(Boolean).join(' · ') || 'Class information unavailable'}</p></div>
                </div>
                <div className="flex gap-2"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> All children</Link><Link href="/dashboard/communication" className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a8a] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900"><MessageSquare className="h-4 w-4" /> Message teacher</Link></div>
            </header>

            <section aria-label="Student summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Attendance', value: `${attendance?.stats?.percentage ?? '0'}%`, icon: <Activity className="h-5 w-5" /> },
                    { label: 'Average mark', value: average === null ? '—' : `${average.toFixed(1)}%`, icon: <BookOpen className="h-5 w-5" /> },
                    { label: 'Unpaid fees', value: `$${unpaidBalance.toLocaleString()}`, icon: <CreditCard className="h-5 w-5" /> },
                    { label: 'Classes today', value: todaysClasses.length, icon: <CalendarClock className="h-5 w-5" /> },
                ].map((stat) => <div key={stat.label} className={`${surface} flex items-center gap-4`}><span className="rounded-xl bg-cyan-50 p-3 text-[#1e3a8a] dark:bg-cyan-950/50 dark:text-cyan-300">{stat.icon}</span><div><p className="text-xs font-medium text-slate-500">{stat.label}</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p></div></div>)}
            </section>

            <section className={`${surface} !p-2`}>
                <div role="tablist" aria-label="Student records" className="flex gap-1 overflow-x-auto">
                    {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-[#1e3a8a] text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{tab.icon}{tab.label}</button>)}
                </div>
            </section>

            {activeTab === 'overview' && <section className="grid gap-5 lg:grid-cols-2"><div className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Recent results</h2><div className="mt-4 space-y-2">{marks.slice(0, 5).map((mark) => <div key={mark.id || mark._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{mark.subject?.name || 'Subject'}</p><p className="text-xs text-slate-500">{mark.exam?.name || 'Exam'}</p></div><span className="shrink-0 text-sm font-bold text-[#1e3a8a] dark:text-cyan-300">{mark.marksObtained}/{mark.maxMarks}</span></div>)}{!marks.length && <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No results yet" description="Published results for this student will appear here." />}</div></div><div className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Recent attendance</h2><div className="mt-4 space-y-2">{(attendance?.records || []).slice(0, 5).map((record: any) => <div key={record.id || record._id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span className="text-sm text-slate-700 dark:text-slate-200">{new Date(record.date).toLocaleDateString()}</span><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold capitalize text-[#1e3a8a] dark:bg-cyan-950 dark:text-cyan-200">{record.status}</span></div>)}{!attendance?.records?.length && <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No attendance records" description="Attendance records will appear here when available." />}</div></div></section>}

            {activeTab === 'attendance' && <section className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Attendance record</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">Date</th><th>Class</th><th>Subject</th><th>Status</th><th>Notes</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{(attendance?.records || []).map((record: any) => <tr key={record.id || record._id}><td className="py-3 text-slate-700 dark:text-slate-200">{new Date(record.date).toLocaleDateString()}</td><td>{record.class?.name || '—'}</td><td>{record.subject?.name || '—'}</td><td className="capitalize">{record.status}</td><td>{record.remarks || '—'}</td></tr>)}</tbody></table></div>{!attendance?.records?.length && <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No attendance records" description="Attendance records will appear here when available." />}</section>}

            {activeTab === 'academics' && <section className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Exam results</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-3">Subject</th><th>Exam</th><th>Score</th><th>Percentage</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{marks.map((mark) => <tr key={mark.id || mark._id}><td className="py-3 font-medium">{mark.subject?.name || '—'}</td><td>{mark.exam?.name || '—'}</td><td>{mark.marksObtained}/{mark.maxMarks}</td><td>{mark.maxMarks ? `${((mark.marksObtained / mark.maxMarks) * 100).toFixed(1)}%` : '—'}</td></tr>)}</tbody></table></div>{!marks.length && <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No results yet" description="Results appear after the school publishes them." />}</section>}

            {activeTab === 'timetable' && <section className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Class timetable</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{timetable.map((slot) => <article key={slot.id || slot._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">{slot.day} · {slot.startTime}–{slot.endTime}</p><h3 className="mt-2 font-bold text-slate-900 dark:text-white">{slot.subject?.name || 'Lesson'}</h3><p className="mt-1 text-xs text-slate-500">{slot.class?.name || child.profile?.class || 'Class'} · Room {slot.room || '—'}</p><p className="mt-1 text-xs text-slate-500">Teacher: {slot.teachers?.map((teacher: any) => `${teacher.firstName} ${teacher.lastName}`).join(', ') || '—'}</p></article>)}{!timetable.length && <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No timetable available" description="The school has not published this class timetable yet." />}</div></section>}

            {activeTab === 'fees' && <section className={surface}><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900 dark:text-white">Fee invoices</h2><Link href="/dashboard/student-finance" className="text-sm font-semibold text-[#1e3a8a] hover:underline dark:text-cyan-300">Open fee portal</Link></div><div className="space-y-2">{invoices.map((invoice) => <article key={invoice.id || invoice._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><div><p className="font-semibold text-slate-900 dark:text-white">{invoice.invoiceNumber || 'Invoice'}</p><p className="mt-1 text-xs text-slate-500">Due {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</p></div><div className="text-right"><p className="font-bold text-slate-900 dark:text-white">${Number(invoice.totalAmount || 0).toLocaleString()}</p><p className="text-xs capitalize text-slate-500">{invoice.status}</p></div></article>)}{!invoices.length && <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No invoices" description="There are no fee invoices linked to this student." />}</div></section>}

            {activeTab === 'assignments' && <section className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Class assignments</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{assignments.map((assignment) => <article key={assignment.id || assignment._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold text-slate-900 dark:text-white">{assignment.title}</h3><p className="mt-1 text-xs text-slate-500">{assignment.subject?.name || 'Subject'} · Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}</p></article>)}{!assignments.length && <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No assignments" description="Assignments for this class will appear here." />}</div></section>}

            {activeTab === 'materials' && <section className={surface}><h2 className="font-bold text-slate-900 dark:text-white">Learning materials</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{materials.map((material) => <article key={material.id || material._id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="font-semibold text-slate-900 dark:text-white">{material.title}</h3><p className="mt-1 text-xs text-slate-500">{material.subject?.name || 'Class material'}</p>{material.fileUrl && <a href={material.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-[#1e3a8a] underline dark:text-cyan-300">Open material</a>}</article>)}{!materials.length && <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No materials" description="Materials shared with this class will appear here." />}</div></section>}
        </div>
    );
}
