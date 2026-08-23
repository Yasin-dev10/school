'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { AlertTriangle, BarChart3, CalendarCheck, DollarSign, GraduationCap, Loader2, RefreshCw, Settings2, Users, X } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

type WidgetId = 'risk' | 'attendance' | 'subjects' | 'workload' | 'fees';
const widgetOptions: { id: WidgetId; label: string }[] = [
    { id: 'risk', label: 'Students at risk' }, { id: 'attendance', label: 'Attendance alerts' },
    { id: 'subjects', label: 'Subject comparison' }, { id: 'workload', label: 'Teacher workload' },
    { id: 'fees', label: 'Fee forecast' },
];
const defaultWidgets = widgetOptions.map(w => w.id);
const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const chartOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { usePointStyle: true, color: '#94a3b8' } } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { beginAtZero: true, grid: { color: 'rgba(100,116,139,.12)' }, ticks: { color: '#64748b' } } } };

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/70 ${className}`}>{children}</section>;
}
function Title({ icon, children, note }: { icon: React.ReactNode; children: React.ReactNode; note?: string }) {
    return <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">{icon}{children}</h2>{note && <p className="mt-1 text-xs text-slate-500">{note}</p>}</div></div>;
}

export default function AdvancedAnalyticsPage() {
    const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
    const [customizing, setCustomizing] = useState(false); const [widgets, setWidgets] = useState<WidgetId[]>(defaultWidgets);
    useEffect(() => { try { const saved = localStorage.getItem('advancedAnalyticsWidgets'); if (saved) setWidgets(JSON.parse(saved)); } catch {} }, []);
    const load = async () => { setLoading(true); setError(''); try { const response = await api.get('/analytics/advanced'); setData(response.data.data); } catch (e: any) { setError(e?.response?.data?.message || 'Unable to load advanced analytics.'); } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);
    const toggle = (id: WidgetId) => setWidgets(current => { const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]; localStorage.setItem('advancedAnalyticsWidgets', JSON.stringify(next)); return next; });
    const visible = (id: WidgetId) => widgets.includes(id);
    const attendanceChart = useMemo(() => data ? ({ labels: data.attendance.trend.slice(-30).map((d: any) => d.date.slice(5)), datasets: [{ label: 'Attendance %', data: data.attendance.trend.slice(-30).map((d: any) => d.rate), borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,.12)', fill: true, tension: .35, pointRadius: 1 }] }) : null, [data]);
    const subjectChart = useMemo(() => data ? ({ labels: data.subjectPerformance.map((s: any) => s.subjectName), datasets: [{ label: 'Average score %', data: data.subjectPerformance.map((s: any) => s.averageScore), backgroundColor: '#6366f1', borderRadius: 7 }] }) : null, [data]);
    const feeChart = useMemo(() => data ? ({ labels: [...data.feeForecast.history.map((x: any) => x.month), ...data.feeForecast.forecast.map((x: any) => x.month)], datasets: [{ label: 'Collected', data: [...data.feeForecast.history.map((x: any) => x.collected), ...data.feeForecast.forecast.map(() => null)], borderColor: '#10b981', tension: .35 }, { label: 'Forecast', data: [...data.feeForecast.history.slice(0, -1).map(() => null), data.feeForecast.history.at(-1)?.collected ?? 0, ...data.feeForecast.forecast.map((x: any) => x.projected)], borderColor: '#f59e0b', borderDash: [6, 5], tension: .35 }] }) : null, [data]);

    if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
    if (error) return <Card className="mx-auto mt-16 max-w-xl text-center"><AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-500" /><p className="font-semibold text-slate-800 dark:text-white">{error}</p><button onClick={load} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Try again</button></Card>;

    return <div className="space-y-6 pb-10">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-500">Decision intelligence</p><h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Advanced Analytics</h1><p className="mt-1 text-sm text-slate-500">Early warnings, performance signals, workload balance, and financial projections.</p></div><div className="flex gap-2"><button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700"><RefreshCw className="h-4 w-4" /> Refresh</button><button onClick={() => setCustomizing(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><Settings2 className="h-4 w-4" /> Customize</button></div></header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
            ['At-risk students', data.studentsAtRisk.length, <GraduationCap key="a" className="h-5 w-5" />, 'text-rose-500 bg-rose-500/10'],
            ['7-day attendance', `${data.attendance.recentAverage}%`, <CalendarCheck key="b" className="h-5 w-5" />, 'text-cyan-500 bg-cyan-500/10'],
            ['Subjects tracked', data.subjectPerformance.length, <BarChart3 key="c" className="h-5 w-5" />, 'text-indigo-500 bg-indigo-500/10'],
            ['Teachers scheduled', data.teacherWorkload.length, <Users key="d" className="h-5 w-5" />, 'text-emerald-500 bg-emerald-500/10'],
        ].map(([label, value, icon, style]: any) => <Card key={label}><div className={`mb-3 w-fit rounded-xl p-2 ${style}`}>{icon}</div><p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p><p className="text-xs text-slate-500">{label}</p></Card>)}</div>

        {visible('risk') && <Card><Title icon={<GraduationCap className="h-5 w-5 text-rose-500" />} note="Risk combines academic performance, attendance, and outstanding fees.">Students at risk</Title>{data.studentsAtRisk.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="pb-3">Student</th><th>Class</th><th>Score</th><th>Attendance</th><th>Risk</th><th>Signals</th></tr></thead><tbody>{data.studentsAtRisk.map((s: any) => <tr key={s.studentId} className="border-t border-slate-100 dark:border-slate-700/60"><td className="py-3 font-semibold text-slate-800 dark:text-white">{s.studentName}</td><td>{s.className}</td><td>{s.averageScore ?? '—'}{s.averageScore !== null && '%'}</td><td>{s.attendanceRate ?? '—'}{s.attendanceRate !== null && '%'}</td><td><span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-500">{s.riskScore}</span></td><td className="max-w-xs text-xs text-slate-500">{s.reasons.join(' · ')}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No students currently match the risk thresholds.</p>}</Card>}

        <div className="grid gap-6 lg:grid-cols-2">{visible('attendance') && <Card><Title icon={<CalendarCheck className="h-5 w-5 text-cyan-500" />} note={`${data.attendance.change >= 0 ? '+' : ''}${data.attendance.change} points versus the previous week.`}>Attendance trend alerts</Title>{data.attendance.alerts.map((a: any) => <div key={a.title} className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3"><p className="text-sm font-bold text-amber-600">{a.title}</p><p className="text-xs text-slate-500">{a.message}</p></div>)}{!data.attendance.alerts.length && <p className="mb-3 text-sm text-emerald-500">Attendance is stable and above the alert threshold.</p>}<div className="h-64">{attendanceChart && <Line data={attendanceChart} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, min: 0, max: 100 } } }} />}</div></Card>}
        {visible('subjects') && <Card><Title icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}>Subject performance comparison</Title><div className="h-80">{subjectChart && <Bar data={subjectChart} options={{ ...chartOptions, indexAxis: data.subjectPerformance.length > 7 ? 'y' : 'x' }} />}</div></Card>}</div>

        <div className="grid gap-6 lg:grid-cols-2">{visible('workload') && <Card><Title icon={<Users className="h-5 w-5 text-emerald-500" />} note="Weekly periods based on the active timetable.">Teacher workload analysis</Title><div className="space-y-3">{data.teacherWorkload.map((t: any) => { const max = Math.max(...data.teacherWorkload.map((x: any) => x.periodsPerWeek), 1); return <div key={t.teacherId}><div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{t.teacherName}</span><span className="text-slate-500">{t.periodsPerWeek} periods</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700"><div className={`h-2 rounded-full ${t.periodsPerWeek >= 25 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${t.periodsPerWeek / max * 100}%` }} /></div></div>})}</div></Card>}
        {visible('fees') && <Card><Title icon={<DollarSign className="h-5 w-5 text-amber-500" />} note="Three-month linear forecast based on the latest six months of recorded collections.">Fee collection forecast</Title><div className="mb-3 grid grid-cols-3 gap-2">{data.feeForecast.forecast.map((f: any) => <div key={f.month} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/40"><p className="text-xs text-slate-500">{f.month}</p><p className="font-bold text-slate-900 dark:text-white">{money.format(f.projected)}</p></div>)}</div><div className="h-64">{feeChart && <Line data={feeChart} options={chartOptions} />}</div></Card>}</div>

        {customizing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-900 dark:text-white">Dashboard widgets</h2><p className="text-xs text-slate-500">Choose which insights appear on this device.</p></div><button onClick={() => setCustomizing(false)}><X className="h-5 w-5" /></button></div><div className="space-y-2">{widgetOptions.map(w => <label key={w.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-700"><span className="text-sm font-medium">{w.label}</span><input type="checkbox" checked={widgets.includes(w.id)} onChange={() => toggle(w.id)} className="h-4 w-4 accent-indigo-600" /></label>)}</div><button onClick={() => { setWidgets(defaultWidgets); localStorage.removeItem('advancedAnalyticsWidgets'); }} className="mt-4 text-xs font-semibold text-indigo-500">Restore defaults</button></div></div>}
    </div>;
}
