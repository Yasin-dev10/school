"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, GraduationCap, Search, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../../../utils/api';

type Mark = { id: string; marksObtained: number; maxMarks: number; grade?: string | null; remarks?: string | null; exam: { id: string; name: string; term: string; startDate: string }; class: { id: string; name: string; section: string } };
type Student = { id: string; firstName: string; lastName: string; admissionNo?: string | null; rollNo?: string | null; profileClass?: string | null; profileSection?: string | null; average: number | null; marks: Mark[] };
type Details = { subject: { name: string; code: string; type: string; teachers?: Array<{ firstName: string; lastName: string }> }; classes: Array<{ id: string; name: string; section: string; grade: string }>; students: Student[]; summary: { studentCount: number; markCount: number; classCount: number; average: number | null } };

export default function SubjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [details, setDetails] = useState<Details | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [classFilter, setClassFilter] = useState('');

    useEffect(() => {
        api.get(`/subjects/${id}/details`)
            .then(response => setDetails(response.data.data))
            .catch(err => setError(err.response?.data?.message || 'Failed to load subject details'))
            .finally(() => setLoading(false));
    }, [id]);

    const students = useMemo(() => (details?.students || []).filter(student => {
        const text = `${student.firstName} ${student.lastName} ${student.admissionNo || ''} ${student.rollNo || ''}`.toLowerCase();
        const matchesSearch = text.includes(search.toLowerCase());
        const selectedClass = details?.classes.find(item => item.id === classFilter);
        const matchesClass = !classFilter || student.marks.some(mark => mark.class.id === classFilter) || student.profileClass === classFilter || (
            selectedClass && student.profileClass === selectedClass.name && (!student.profileSection || student.profileSection === selectedClass.section)
        );
        return matchesSearch && matchesClass;
    }), [details, search, classFilter]);

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading subject data...</div>;
    if (error || !details) return <div className="p-8"><Link href="/dashboard/subjects" className="text-blue-600">← Back to subjects</Link><p className="mt-8 text-center text-red-500">{error}</p></div>;

    const statCards: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
        { label: 'Students', value: details.summary.studentCount, Icon: Users },
        { label: 'Classes', value: details.summary.classCount, Icon: GraduationCap },
        { label: 'Recorded marks', value: details.summary.markCount, Icon: BookOpen },
        { label: 'Subject average', value: details.summary.average === null ? '—' : `${details.summary.average}%`, Icon: GraduationCap }
    ];

    return <div className="p-4 sm:p-6 max-w-7xl mx-auto min-h-screen">
        <Link href="/dashboard/subjects" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-5"><ArrowLeft className="w-4 h-4" /> Back to subjects</Link>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600"><BookOpen className="w-6 h-6" /></div><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">{details.subject.name}</h1><p className="text-sm text-slate-500">{details.subject.code} · {details.subject.type}</p></div></div></div>
            <p className="text-sm text-slate-500">Teacher: {details.subject.teachers?.map(t => `${t.firstName} ${t.lastName}`).join(', ') || 'Not assigned'}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {statCards.map(({ label, value, Icon }) => <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"><Icon className="w-5 h-5 text-blue-500 mb-2" /><p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, admission or roll number..." className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" /></div>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"><option value="">All classes</option>{details.classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}</select>
        </div>

        <div className="space-y-3">
            {students.length === 0 ? <div className="bg-white dark:bg-slate-800 border rounded-xl p-12 text-center text-slate-500">No students or marks found for this subject.</div> : students.map(student => <details key={student.id} className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <summary className="cursor-pointer list-none p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <div><p className="font-bold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</p><p className="text-xs text-slate-500">Admission: {student.admissionNo || '—'} · Roll: {student.rollNo || '—'} · {student.profileSection || ''}</p></div>
                    <div className="flex items-center gap-4"><span className="text-xs text-slate-500">{student.marks.length} result(s)</span><span className={`px-3 py-1 rounded-full text-sm font-bold ${student.average !== null && student.average >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{student.average === null ? 'No grade' : `${student.average}%`}</span></div>
                </summary>
                <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500"><tr><th className="px-4 py-3 text-left">Exam</th><th className="px-4 py-3 text-left">Class</th><th className="px-4 py-3 text-right">Score</th><th className="px-4 py-3 text-right">Percentage</th><th className="px-4 py-3 text-left">Grade</th></tr></thead><tbody>{student.marks.map(mark => <tr key={mark.id} className="border-t border-slate-100 dark:border-slate-700"><td className="px-4 py-3 font-medium">{mark.exam.name}<span className="block text-xs text-slate-400">{mark.exam.term}</span></td><td className="px-4 py-3">{mark.class.name} - {mark.class.section}</td><td className="px-4 py-3 text-right font-semibold">{mark.marksObtained}/{mark.maxMarks}</td><td className="px-4 py-3 text-right">{mark.maxMarks ? ((mark.marksObtained / mark.maxMarks) * 100).toFixed(1) : '0.0'}%</td><td className="px-4 py-3">{mark.grade || '—'}</td></tr>)}</tbody></table>{student.marks.length === 0 && <p className="p-5 text-center text-slate-500">No marks recorded yet.</p>}</div>
            </details>)}
        </div>
    </div>;
}
