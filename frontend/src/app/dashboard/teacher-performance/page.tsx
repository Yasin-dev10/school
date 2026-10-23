"use client";
import { useCallback, useEffect, useState } from 'react';
import api from '../../utils/api';
import { FileSpreadsheet, FileText, Star } from 'lucide-react';

type Report = { teacherId: string; name: string; overall: number; rating: string; attendance: { required: number; completed: number; missing: number; rate: number; missingLessons: { date: string; classId: string; subjectId: string }[]; activity: { date: string; recordedAt: string }[] }; teaching: { completed: number; scheduled: number; assignments: number; quizzes: number }; exams: { graded: number; resultsEntered: number; average: number | null; passRate: number; trend: number | null }; punctuality: { lessonStartTrackingAvailable: boolean; resultEntries: string[] }; evaluations: Evaluation[] };
type Evaluation = { id: string; periodType: string; periodStart: string; periodEnd: string; rating: number; notes?: string; improvements?: string; reviewer?: { firstName: string; lastName: string } };
const inputClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const monthNow = new Date().toISOString().slice(0, 7);

export default function TeacherPerformancePage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [previousReports, setPreviousReports] = useState<Report[]>([]);
    const [teachers, setTeachers] = useState<{id:string; firstName:string; lastName:string}[]>([]);
    const [classes, setClasses] = useState<{id:string; name:string; section?:string}[]>([]);
    const [subjects, setSubjects] = useState<{id:string; name:string}[]>([]);
    const [month, setMonth] = useState(monthNow);
    const [teacherId, setTeacherId] = useState('');
    const [classId, setClassId] = useState('');
    const [subjectId, setSubjectId] = useState('');
    const [term, setTerm] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ periodType: 'monthly', periodStart: `${month}-01`, periodEnd: `${month}-28`, rating: 4, notes: '', improvements: '' });

    useEffect(() => {
        try { const user = JSON.parse(localStorage.getItem('user') || '{}'); setIsAdmin(['school-admin','super-admin'].includes(user.role)); }
        catch { setIsAdmin(false); }
        Promise.all([api.get('/teachers'), api.get('/classes'), api.get('/subjects')]).then(([t,c,s]) => {
            setTeachers(t.data.data || []); setClasses(c.data.data || []); setSubjects(s.data.data || []);
        }).catch(() => {});
    }, []);
    const load = useCallback(async () => {
        setLoading(true); setError('');
        try {
            const filters = { ...(teacherId ? { teacherId } : {}), ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}), ...(term ? { term } : {}) };
            const previousDate = new Date(`${month}-01T00:00:00`); previousDate.setMonth(previousDate.getMonth() - 1);
            const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth()+1).padStart(2,'0')}`;
            const [current, previous] = await Promise.all([
                api.get('/teacher-performance', { params: { month, ...filters } }),
                api.get('/teacher-performance', { params: { month: previousMonth, ...filters } }),
            ]);
            const data = current.data;
            setReports(data.data.rows || []);
            setPreviousReports(previous.data.data.rows || []);
        } catch { setError('Warbixinta lama soo rari karin. Fadlan mar kale isku day.'); }
        finally { setLoading(false); }
    }, [month, teacherId, classId, subjectId, term]);
    useEffect(() => { void load(); }, [load]);

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const rows = reports.map(r => ({ Teacher: r.name, 'Attendance required': r.attendance.required, 'Attendance completed': r.attendance.completed, 'Missing attendance': r.attendance.missing, 'Attendance rate %': r.attendance.rate, 'Lessons (attendance proxy)': r.teaching.completed, Assignments: r.teaching.assignments, Quizzes: r.teaching.quizzes, 'Exams graded': r.exams.graded, 'Results entered': r.exams.resultsEntered, 'Student average %': r.exams.average ?? '', 'Pass rate %': r.exams.passRate, 'Overall score %': r.overall, Rating: r.rating }));
        const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Teacher performance'); XLSX.writeFile(book, `teacher-performance-${month}.xlsx`);
    };
    const exportPdf = async () => {
        const { jsPDF } = await import('jspdf'); const table = (await import('jspdf-autotable')).default;
        const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Teacher Performance — ${month}`, 14, 18);
        table(doc, { startY: 25, head: [['Teacher','Attendance','Missing','Assignments','Quizzes','Exams','Results','Average','Score','Rating']], body: reports.map(r => [r.name, `${r.attendance.completed}/${r.attendance.required} (${r.attendance.rate}%)`, r.attendance.missing, r.teaching.assignments, r.teaching.quizzes, r.exams.graded, r.exams.resultsEntered, r.exams.average == null ? '—' : `${r.exams.average}%`, `${r.overall}%`, r.rating]), styles: { fontSize: 8 } });
        doc.save(`teacher-performance-${month}.pdf`);
    };
    const saveEvaluation = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const targetTeacherId = teacherId || selected?.teacherId; if (!targetTeacherId || !form.periodStart || !form.periodEnd) return;
        setSaving(true);
        try { await api.post('/teacher-performance/evaluations', { ...form, teacherId: targetTeacherId, periodStart: new Date(`${form.periodStart}T00:00:00`).toISOString(), periodEnd: new Date(`${form.periodEnd}T23:59:59`).toISOString() }); await load(); }
        catch { setError('Qiimeynta lama kaydin. Hubi xogta oo mar kale isku day.'); }
        finally { setSaving(false); }
    };
    const selected = reports.find(r => r.teacherId === teacherId) || reports[0];
    const scoreTone = (score:number) => score >= 90 ? 'text-emerald-600 dark:text-emerald-400' : score >= 70 ? 'text-blue-700 dark:text-cyan-300' : 'text-amber-600 dark:text-amber-400';

    return <main className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Reports & analytics</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Teacher Performance</h1><p className="mt-1 text-sm text-slate-500">Attendance, teaching activity, exam results and administrator reviews.</p></div><div className="flex gap-2"><button onClick={() => void exportExcel()} disabled={!reports.length} className={`${inputClass} inline-flex items-center gap-2`}><FileSpreadsheet className="h-4 w-4"/>Excel</button><button onClick={() => void exportPdf()} disabled={!reports.length} className={`${inputClass} inline-flex items-center gap-2`}><FileText className="h-4 w-4"/>PDF</button></div></header>
        <section className={`${cardClass} flex flex-wrap gap-3`} aria-label="Report filters"><label className="grid gap-1 text-xs font-medium text-slate-500">Month<input className={inputClass} type="month" value={month} onChange={e => setMonth(e.target.value)}/></label>{isAdmin && <label className="grid gap-1 text-xs font-medium text-slate-500">Teacher<select className={inputClass} value={teacherId} onChange={e=>setTeacherId(e.target.value)}><option value="">All teachers</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></label>}<label className="grid gap-1 text-xs font-medium text-slate-500">Class<select className={inputClass} value={classId} onChange={e=>setClassId(e.target.value)}><option value="">All classes</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name}{c.section ? ` · ${c.section}`:''}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-500">Subject<select className={inputClass} value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">All subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="grid gap-1 text-xs font-medium text-slate-500">Exam term<select className={inputClass} value={term} onChange={e=>setTerm(e.target.value)}><option value="">All terms</option><option value="First_Term">First term</option><option value="Mid_Term">Mid term</option><option value="Final_Term">Final term</option><option value="Unit_Test">Unit test</option><option value="Monthly_Test">Monthly test</option></select></label></section>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {loading ? <div className={cardClass}>Loading performance reports…</div> : reports.length === 0 ? <div className={`${cardClass} text-sm text-slate-500`}>No teacher activity found for this month and filter.</div> : <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Teachers',value:reports.length},{label:'Average score',value:`${Math.round(reports.reduce((n,r)=>n+r.overall,0)/reports.length)}%`},{label:'Missing attendance',value:reports.reduce((n,r)=>n+r.attendance.missing,0)},{label:'Attendance completed',value:`${reports.reduce((n,r)=>n+r.attendance.completed,0)} / ${reports.reduce((n,r)=>n+r.attendance.required,0)}`}].map(x=><article key={x.label} className={cardClass}><p className="text-sm text-slate-500">{x.label}</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{x.value}</p></article>)}</section>
            <section className="grid gap-5 lg:grid-cols-5"><div className={`${cardClass} lg:col-span-3`}><h2 className="font-bold text-slate-900 dark:text-white">Overall teacher performance</h2><div className="mt-4 space-y-3">{[...reports].sort((a,b)=>b.overall-a.overall).map((r,i)=><button key={r.teacherId} onClick={()=>setTeacherId(r.teacherId)} className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left dark:bg-slate-800"><span className="w-7 text-sm font-bold text-slate-400">{i+1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{r.name}</span><span className={`text-lg font-bold ${scoreTone(r.overall)}`}>{r.overall}%</span><span className="text-xs text-slate-500">{r.rating}</span></button>)}</div></div>
                <div className={cardClass}><h2 className="font-bold text-slate-900 dark:text-white">Score weights</h2><ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300"><li className="flex justify-between">Attendance completion <b>40%</b></li><li className="flex justify-between">Lesson coverage proxy <b>20%</b></li><li className="flex justify-between">Exam pass rate <b>15%</b></li><li className="flex justify-between">Punctuality <b>10%</b></li><li className="flex justify-between">Student average <b>15%</b></li></ul><p className="mt-4 text-xs text-slate-500">Score is normalized over available metrics. Punctuality is not included until lesson start-time tracking exists.</p></div></section>
            <section className={cardClass}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">Teacher report</h2><p className="text-xs text-slate-500">Lesson starts and approved absence records are not available in the current school data.</p></div><select className={inputClass} value={selected?.teacherId || ''} onChange={e=>setTeacherId(e.target.value)}>{reports.map(r=><option key={r.teacherId} value={r.teacherId}>{r.name}</option>)}</select></div>{selected && <><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{label:'Attendance required',value:selected.attendance.required},{label:'Attendance completed',value:selected.attendance.completed},{label:'Completion rate',value:`${selected.attendance.rate}%`},{label:'Missing lessons',value:selected.attendance.missing},{label:'Assignments',value:selected.teaching.assignments},{label:'Quizzes',value:selected.teaching.quizzes},{label:'Exams graded',value:selected.exams.graded},{label:'Results entered',value:selected.exams.resultsEntered},{label:'Student pass rate',value:`${selected.exams.passRate}%`},{label:'Average student score',value:selected.exams.average == null?'—':`${selected.exams.average}%`},{label:'Previous exam change',value:selected.exams.trend == null?'—':`${selected.exams.trend > 0?'+':''}${selected.exams.trend}%`},{label:'Overall rating',value:`${selected.overall}% · ${selected.rating}`}].map(k=><div key={k.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{k.label}</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{k.value}</p></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Attendance activity · date and recorded time</h3><ul className="max-h-64 divide-y divide-slate-100 overflow-auto dark:divide-slate-700">{selected.attendance.activity.map((a,i)=><li key={`${a.date}-${i}`} className="flex justify-between py-2 text-sm"><span>{new Date(a.date).toLocaleDateString()}</span><span className="text-slate-500">{new Date(a.recordedAt).toLocaleTimeString()}</span></li>)}</ul>{selected.attendance.missingLessons.length>0&&<p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{selected.attendance.missing} scheduled lesson(s) have no attendance record.</p>}</div><div><h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Exam result entry times</h3><ul className="mb-5 max-h-36 divide-y divide-slate-100 overflow-auto dark:divide-slate-700">{selected.punctuality.resultEntries.map((time,i)=><li key={`${time}-${i}`} className="flex justify-between py-2 text-sm"><span>{new Date(time).toLocaleDateString()}</span><span className="text-slate-500">{new Date(time).toLocaleTimeString()}</span></li>)}</ul><h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Administrator evaluations</h3>{selected.evaluations.length ? selected.evaluations.map(e=><article key={e.id} className="mb-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><div className="flex items-center justify-between text-sm font-semibold"><span className="capitalize">{e.periodType} · {e.rating}/5 <Star className="inline h-4 w-4 text-amber-500"/></span><span className="text-xs text-slate-500">{new Date(e.periodStart).toLocaleDateString()} – {new Date(e.periodEnd).toLocaleDateString()}</span></div>{e.notes&&<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{e.notes}</p>}{e.improvements&&<p className="mt-1 text-sm text-slate-500">Growth areas: {e.improvements}</p>}<p className="mt-1 text-xs text-slate-400">{e.reviewer?.firstName} {e.reviewer?.lastName}</p></article>):<p className="text-sm text-slate-500">No administrator evaluations for this report.</p>}</div></div></>}
            </section>
            <section className={cardClass}><h2 className="font-bold text-slate-900 dark:text-white">Monthly performance comparison</h2><div className="mt-4 space-y-3">{reports.slice(0,8).map(r=>{const old=previousReports.find(x=>x.teacherId===r.teacherId); const delta=old ? r.overall-old.overall : null; return <div key={r.teacherId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-sm"><span className="truncate font-medium text-slate-700 dark:text-slate-200">{r.name}</span><span className="text-slate-500">{old ? `${old.overall}% → ${r.overall}%` : `${r.overall}% · new`}</span><b className={delta == null ? 'text-slate-400' : delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{delta == null ? '—' : `${delta>0?'+':''}${delta}%`}</b></div>})}</div><p className="mt-3 text-xs text-slate-500">Compared with the previous month using the same filters.</p></section>
            {isAdmin && selected && <form onSubmit={saveEvaluation} className={`${cardClass} space-y-3`}><h2 className="font-bold text-slate-900 dark:text-white">Add administrator evaluation</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select className={inputClass} value={form.periodType} onChange={e=>setForm({...form,periodType:e.target.value})}><option value="monthly">Monthly</option><option value="term">Term</option><option value="annual">Annual</option></select><input required className={inputClass} type="date" value={form.periodStart} onChange={e=>setForm({...form,periodStart:e.target.value})}/><input required className={inputClass} type="date" value={form.periodEnd} onChange={e=>setForm({...form,periodEnd:e.target.value})}/><select className={inputClass} value={form.rating} onChange={e=>setForm({...form,rating:Number(e.target.value)})}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></div><textarea className={`${inputClass} w-full`} rows={2} placeholder="Performance notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><textarea className={`${inputClass} w-full`} rows={2} placeholder="Areas for improvement" value={form.improvements} onChange={e=>setForm({...form,improvements:e.target.value})}/><button disabled={saving} className="rounded-xl bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Saving…':'Save evaluation'}</button></form>}
        </>}
    </main>;
}
