"use client";

import { useState } from 'react';
import { BookOpen, Download, GraduationCap, IdCard, TrendingUp } from 'lucide-react';

type Props = {
    grades: any;
    student: any;
    loading: boolean;
    onDownload: () => void;
    students?: any[];
    selectedChild?: string;
    onChildChange?: (id: string) => void;
};

export function StudentResultsView({ grades, student, loading, onDownload, students = [], selectedChild, onChildChange }: Props) {
    const terms = grades?.terms || [];
    const [selectedTerm, setSelectedTerm] = useState(0);
    const term = terms[Math.min(selectedTerm, Math.max(terms.length - 1, 0))];
    const courses = term?.courses || [];
    const average = courses.length
        ? courses.reduce((sum: number, course: any) => sum + Number(course.percentage || 0), 0) / courses.length
        : 0;
    const profile = student?.profile || {};

    if (loading) return <div className="grid min-h-[55vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" /></div>;

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-10">
            <section className="overflow-hidden rounded-3xl bg-[#405bb2] text-white shadow-lg shadow-indigo-900/10">
                <div className="flex flex-col justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                    <div className="flex items-center gap-4">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><GraduationCap className="h-7 w-7" /></div>
                        <div><p className="text-sm text-indigo-100">Examination Results</p><h1 className="text-2xl font-bold">Academic Transcript</h1></div>
                    </div>
                    <button onClick={onDownload} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#405bb2] hover:bg-indigo-50">
                        <Download className="h-4 w-4" /> Download transcript
                    </button>
                </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
                <aside className="space-y-5">
                    {students.length > 1 && <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Student</label><select value={selectedChild} onChange={e => onChildChange?.(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 dark:border-slate-700">{students.map(child => <option key={child._id} value={child._id}>{child.firstName} {child.lastName}</option>)}</select></div>}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-3 bg-indigo-50 p-5 text-[#405bb2] dark:bg-indigo-950/30"><IdCard className="h-5 w-5" /><h2 className="font-bold">Student Profile</h2></div>
                        <dl className="divide-y divide-slate-100 px-5 text-sm dark:divide-slate-800">
                            {[['Name', `${student?.firstName || ''} ${student?.lastName || ''}`], ['Student ID', profile.studentId || student?.studentId || profile.admissionNo || '—'], ['Class', `${profile.class || student?.profileClass || '—'}${profile.section ? ` · ${profile.section}` : ''}`], ['Roll No', profile.rollNo || student?.rollNo || '—']].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}
                        </dl>
                        <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/60"><div><p className="text-xs text-slate-500">Cumulative GPA</p><p className="mt-1 text-2xl font-bold text-[#405bb2]">{grades?.cumulativeGpa || '0.00'}</p></div><div className="border-l border-slate-200 dark:border-slate-700"><p className="text-xs text-slate-500">Credits</p><p className="mt-1 text-2xl font-bold text-[#405bb2]">{grades?.totalCredits || 0}</p></div></div>
                    </div>
                </aside>

                <main className="space-y-5" id="transcript-area">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Select semester / exam</label>
                        <select value={selectedTerm} onChange={e => setSelectedTerm(Number(e.target.value))} className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-3 font-semibold dark:border-slate-700">{terms.map((item: any, index: number) => <option key={item.id || index} value={index}>{item.name}{item.term ? ` · ${item.term}` : ''}</option>)}</select>
                    </div>

                    {!term ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center dark:border-slate-700 dark:bg-slate-900"><BookOpen className="mx-auto mb-3 h-9 w-9 text-slate-400" /><h2 className="font-bold">No released results yet</h2><p className="mt-1 text-sm text-slate-500">Published examination results will appear here.</p></div> : <>
                        <div className="grid grid-cols-3 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">{[['Courses', courses.length], ['Term GPA', term.termGpa || '0.00'], ['Average', `${average.toFixed(1)}%`]].map(([label, value], index) => <div key={label} className={`p-5 text-center ${index ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-[#405bb2] sm:text-2xl">{value}</p></div>)}</div>
                        <div className="space-y-4"><h2 className="flex items-center gap-2 text-lg font-bold text-[#405bb2]"><TrendingUp className="h-5 w-5" /> Courses ({courses.length})</h2>{courses.map((course: any, index: number) => <article key={`${course.subjectCode}-${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"><div className="flex items-center gap-3 bg-indigo-50/80 px-5 py-4 dark:bg-indigo-950/30"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#405bb2] text-white"><BookOpen className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{course.subjectName}</h3><p className="text-xs text-slate-500">{course.subjectCode || 'Subject'}</p></div><span className="rounded-xl bg-white px-3 py-2 text-lg font-bold text-[#405bb2] shadow-sm dark:bg-slate-900">{course.grade || '—'}</span></div><div className="grid grid-cols-3 gap-3 p-5 text-center"><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Score</p><p className="mt-1 font-bold text-[#405bb2]">{course.marksObtained}/{course.maxMarks}</p></div><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Percentage</p><p className="mt-1 font-bold text-[#405bb2]">{course.percentage}%</p></div><div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Credits</p><p className="mt-1 font-bold text-[#405bb2]">{course.credits}</p></div></div></article>)}</div>
                    </>}
                </main>
            </div>
        </div>
    );
}
