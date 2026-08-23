'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, ArcElement, Filler,
    ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    GraduationCap, Users, DollarSign, Briefcase, TrendingUp,
    Download, FileSpreadsheet, AlertTriangle, ArrowUpRight,
    RefreshCw, Loader2, Search,
} from 'lucide-react';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, ArcElement, Filler
);

/* ─── types ─────────────────────────────────────────────────────────────── */
type Tab = 'academic' | 'attendance' | 'financial' | 'workload' | 'progress';

/* ─── chart base options ─────────────────────────────────────────────────── */
const baseOpts: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const, align: 'end' as const,
            labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 11 } },
        },
        tooltip: {
            backgroundColor: 'rgba(15,23,42,0.92)', titleColor: '#fff',
            bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1, padding: 12, cornerRadius: 12,
            displayColors: true, boxPadding: 6, usePointStyle: true,
        },
    },
    scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(100,116,139,0.1)' }, ticks: { color: '#64748b', font: { size: 10 } } },
    },
    interaction: { mode: 'index', intersect: false },
};

/* ─── shared UI pieces ───────────────────────────────────────────────────── */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 ${className}`}>{children}</div>
    );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">{children}</h3>;
}
function Empty({ msg }: { msg: string }) {
    return <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">{msg}</div>;
}
function Spinner() {
    return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const downloadBrandedReport = async (
    format: 'pdf' | 'xlsx',
    title: string,
    columns: { key: string; header: string; width?: number }[],
    rows: Record<string, unknown>[],
    filename: string
) => {
    const response = await api.post('/report-exports', { format, title, columns, rows }, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filename}.${format}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

/* ════════════════════════════════════════════════════════════════════════════
   ACADEMIC TAB
   data from: GET /analytics/class/:classId
   returns: { marksBySubject, attendanceTrends, gradeMatrix, lowAttendanceAlerts }
════════════════════════════════════════════════════════════════════════════ */
function AcademicTab({ classes }: { classes: any[] }) {
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!selectedClass) { setData(null); return; }
        setLoading(true); setError('');
        api.get(`/analytics/class/${selectedClass._id}`)
            .then(r => setData(r.data.data))
            .catch(e => setError(e?.response?.data?.message || 'Failed to load'))
            .finally(() => setLoading(false));
    }, [selectedClass]);

    /* chart datasets */
    const subjectBarData = data?.marksBySubject?.length ? {
        labels: data.marksBySubject.map((m: any) => m.subjectName),
        datasets: [{
            label: 'Avg Score', data: data.marksBySubject.map((m: any) => m.avgScore),
            backgroundColor: '#818cf8', borderRadius: 6, barThickness: 16,
        }],
    } : null;

    const attTrendData = data?.attendanceTrends?.length ? {
        labels: data.attendanceTrends.map((t: any) => t.date),
        datasets: [{
            label: 'Attendance Rate %',
            data: data.attendanceTrends.map((t: any) =>
                t.total > 0 ? +((t.present / t.total) * 100).toFixed(1) : 0),
            borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)',
            tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
        }],
    } : null;

    const getAcademicExportData = () => {
        if (!data?.gradeMatrix?.length) return;
        const subjects = data.marksBySubject.map((s: any) => s.subjectName);
        const columns = [{ key: 'student', header: 'Student', width: 28 }, ...subjects.map((subject: string, index: number) => ({ key: `subject_${index}`, header: subject, width: 16 }))];
        const rows = data.gradeMatrix.map((row: any) => {
            const obj: Record<string, unknown> = { student: row.name };
            subjects.forEach((subject: string, index: number) => { obj[`subject_${index}`] = row.marks.find((m: any) => m.subject === subject)?.score ?? ''; });
            return obj;
        });
        return { columns, rows };
    };

    const exportAcademic = async (format: 'pdf' | 'xlsx') => {
        const exportData = getAcademicExportData();
        if (!exportData) return;
        await downloadBrandedReport(format, `Grade Report — ${selectedClass?.name ?? ''}`, exportData.columns, exportData.rows, `grades_${selectedClass?.name ?? 'report'}`);
    };

    return (
        <div className="space-y-5">
            {/* selector + export row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                    value={selectedClass?._id ?? ''}
                    onChange={e => setSelectedClass(classes.find(c => c._id === e.target.value) || null)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                    <option value="">— Select a class —</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section ?? ''}</option>)}
                </select>
                {data && (
                    <div className="flex gap-2">
                        <button onClick={() => exportAcademic('xlsx')} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition text-xs font-semibold">
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                        </button>
                        <button onClick={() => exportAcademic('pdf')} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition text-xs font-semibold">
                            <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                    </div>
                )}
            </div>

            {!selectedClass && (
                <Card className="col-span-2">
                    <Empty msg="Select a class above to load academic analytics." />
                </Card>
            )}

            {selectedClass && loading && (
                <Card className="h-64"><Spinner /></Card>
            )}

            {selectedClass && error && (
                <Card><p className="text-red-400 text-sm">{error}</p></Card>
            )}

            {selectedClass && !loading && data && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Subject avg scores */}
                    <div className="lg:col-span-2">
                        <Card>
                            <SectionTitle>Subject-wise Average Score</SectionTitle>
                            <div className="h-64">
                                {subjectBarData
                                    ? <Bar options={{ ...baseOpts, indexAxis: 'y' as const, plugins: { ...baseOpts.plugins, legend: { display: false } }, scales: { x: { ...baseOpts.scales!.x, min: 0 }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } } } }} data={subjectBarData} />
                                    : <Empty msg="No marks data for this class." />}
                            </div>
                        </Card>
                    </div>

                    {/* Low attendance alerts */}
                    <Card>
                        <SectionTitle>Low Attendance Alerts (&lt;75%)</SectionTitle>
                        {data.lowAttendanceAlerts?.length ? (
                            <div className="space-y-2">
                                {data.lowAttendanceAlerts.map((a: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{a.studentName}</span>
                                        <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{a.attendanceRate}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : <Empty msg="No students below 75% attendance." />}
                    </Card>

                    {/* Attendance trend (last 7 days) */}
                    <div className="lg:col-span-2">
                        <Card>
                            <SectionTitle>Attendance Trend (Last 7 Days)</SectionTitle>
                            <div className="h-56">
                                {attTrendData
                                    ? <Line options={baseOpts} data={attTrendData} />
                                    : <Empty msg="No attendance data for this period." />}
                            </div>
                        </Card>
                    </div>

                    {/* Grade matrix */}
                    <div className="lg:col-span-3">
                        <Card>
                            <SectionTitle>Grade Matrix</SectionTitle>
                            {data.gradeMatrix?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                                                <th className="pb-2 text-left font-semibold">Student</th>
                                                {data.marksBySubject.map((s: any) => (
                                                    <th key={s.subjectName} className="pb-2 text-center font-semibold">{s.subjectName}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {data.gradeMatrix.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{row.name}</td>
                                                    {data.marksBySubject.map((subj: any) => {
                                                        const mark = row.marks.find((m: any) => m.subject === subj.subjectName);
                                                        return (
                                                            <td key={subj.subjectName} className="py-2.5 text-center font-bold text-emerald-500">
                                                                {mark ? mark.score : <span className="text-slate-400 font-normal">—</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <Empty msg="No grade data for this class." />}
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   ATTENDANCE TAB
   data from: GET /analytics/admin/overview
   uses: attendance.trends (14-day daily rate), attendance.rate, attendance.present, attendance.total
════════════════════════════════════════════════════════════════════════════ */
function AttendanceTab({ overview, loading }: { overview: any; loading: boolean }) {
    if (loading) return <Card className="h-64"><Spinner /></Card>;
    if (!overview) return <Card><Empty msg="No attendance data available." /></Card>;

    const att = overview.attendance;

    /* daily trend chart */
    const trendData = att?.trends?.length ? {
        labels: att.trends.map((t: any) => t.date),
        datasets: [{
            label: 'Daily Attendance Rate %',
            data: att.trends.map((t: any) => parseFloat(t.rate)),
            borderColor: '#22d3ee', backgroundColor: 'rgba(34,211,238,0.1)',
            tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5,
        }],
    } : null;

    /* donut: present vs absent today */
    const todayPresent  = att?.present ?? 0;
    const todayTotal    = att?.total   ?? 0;
    const todayAbsent   = todayTotal - todayPresent;
    const donutData = todayTotal > 0 ? {
        labels: ['Present', 'Absent'],
        datasets: [{
            data: [todayPresent, todayAbsent],
            backgroundColor: ['#22d3ee', '#818cf8'],
            borderWidth: 0, hoverOffset: 8,
        }],
    } : null;

    /* enrollment distribution bar (classes) */
    const classDist = overview.distribution?.classes;
    const classBarData = classDist?.length ? {
        labels: classDist.map((c: any) => c._id),
        datasets: [{
            label: 'Students',
            data: classDist.map((c: any) => c.count),
            backgroundColor: '#818cf8', borderRadius: 4, barThickness: 16,
        }],
    } : null;

    /* gender donut */
    const genderData = overview.demographics?.gender?.length ? {
        labels: overview.demographics.gender.map((g: any) => g._id),
        datasets: [{
            data: overview.demographics.gender.map((g: any) => g.count),
            backgroundColor: ['#818cf8', '#f472b6', '#22d3ee', '#fbbf24'],
            borderWidth: 0, hoverOffset: 8,
        }],
    } : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* today stat */}
            <Card>
                <SectionTitle>Today's Attendance</SectionTitle>
                <div className="flex items-end gap-4 mb-4">
                    <span className="text-5xl font-black text-slate-800 dark:text-white">{att?.rate ?? 0}%</span>
                    <span className="text-sm text-slate-400 mb-1">{todayPresent} / {todayTotal} present</span>
                </div>
                <div className="h-40 flex items-center justify-center">
                    {donutData
                        ? <Doughnut options={{ ...baseOpts, cutout: '72%', plugins: { ...baseOpts.plugins, legend: { position: 'bottom' as const, labels: { color: '#94a3b8', usePointStyle: true, padding: 12, font: { size: 10 } } } } }} data={donutData} />
                        : <Empty msg="No attendance recorded today." />}
                </div>
            </Card>

            {/* 14-day trend */}
            <div className="lg:col-span-2">
                <Card>
                    <SectionTitle>14-Day Attendance Trend</SectionTitle>
                    <div className="h-56">
                        {trendData
                            ? <Line options={baseOpts} data={trendData} />
                            : <Empty msg="No trend data yet." />}
                    </div>
                </Card>
            </div>

            {/* students per class */}
            <div className="lg:col-span-2">
                <Card>
                    <SectionTitle>Students per Class</SectionTitle>
                    <div className="h-56">
                        {classBarData
                            ? <Bar options={{ ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: false } } }} data={classBarData} />
                            : <Empty msg="No class distribution data." />}
                    </div>
                </Card>
            </div>

            {/* gender demographics */}
            <Card>
                <SectionTitle>Gender Demographics</SectionTitle>
                <div className="h-56 flex items-center justify-center">
                    {genderData
                        ? <Doughnut options={{ ...baseOpts, cutout: '65%', plugins: { ...baseOpts.plugins, legend: { position: 'right' as const, labels: { color: '#94a3b8', usePointStyle: true, padding: 10, font: { size: 11 } } } } }} data={genderData} />
                        : <Empty msg="No demographic data." />}
                </div>
            </Card>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   FINANCIAL TAB
   data from: GET /analytics/finance
   returns: { revenueByCategory, outstanding }
   + overview.trends.finance (monthly) from admin overview
════════════════════════════════════════════════════════════════════════════ */
function FinancialTab({ financeData, overview, loading }: { financeData: any; overview: any; loading: boolean }) {
    if (loading) return <Card className="h-64"><Spinner /></Card>;
    if (!financeData) return <Card><Empty msg="No financial data available." /></Card>;

    /* monthly income/expense line */
    const monthlyTrends = overview?.trends?.finance ?? [];
    const incomeExpData = monthlyTrends.length ? {
        labels: monthlyTrends.map((t: any) => MONTH_NAMES[(t._id ?? 1) - 1]),
        datasets: [
            { label: 'Revenue',   data: monthlyTrends.map((t: any) => t.revenue),   borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.12)', tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0 },
            { label: 'Collected', data: monthlyTrends.map((t: any) => t.collected), borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.10)', tension: 0.4, fill: true, borderWidth: 2, pointRadius: 0 },
        ],
    } : null;

    /* revenue by category donut */
    const catDonutData = financeData.revenueByCategory?.length ? {
        labels: financeData.revenueByCategory.map((c: any) => c._id),
        datasets: [{
            data: financeData.revenueByCategory.map((c: any) => c.total),
            backgroundColor: ['#818cf8', '#c084fc', '#f472b6', '#4ade80', '#fbbf24', '#22d3ee'],
            borderWidth: 0, hoverOffset: 10,
        }],
    } : null;

    /* summary from overview */
    const finance = overview?.finance;

    const exportFinance = async (format: 'pdf' | 'xlsx') => {
        const columns = [
            { key: 'student', header: 'Student', width: 28 },
            { key: 'amount', header: 'Amount Owed', width: 18 },
            { key: 'status', header: 'Status', width: 15 },
            { key: 'dueDate', header: 'Due Date', width: 16 },
        ];
        const rows = (financeData.outstanding ?? []).map((inv: any) => ({
            student: `${inv.student?.firstName ?? ''} ${inv.student?.lastName ?? ''}`.trim(),
            amount: `$${((inv.totalAmount ?? 0) - (inv.paidAmount ?? 0)).toLocaleString()}`,
            status: inv.status,
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—',
        }));
        await downloadBrandedReport(format, 'Financial Report — Outstanding Dues', columns, rows, 'financial_report');
    };

    return (
        <div className="space-y-5">
            <div className="flex justify-end gap-2">
                <button onClick={() => exportFinance('xlsx')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-emerald-500/20">
                    <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button onClick={() => exportFinance('pdf')} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-red-500/20">
                    <Download className="w-4 h-4" /> PDF
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* summary stat cards */}
                {finance && [
                    { label: 'Total Revenue',  value: `$${finance.totalRevenue?.toLocaleString() ?? 0}`, color: 'text-slate-800 dark:text-white' },
                    { label: 'Collected',      value: `$${finance.collected?.toLocaleString() ?? 0}`,    color: 'text-emerald-500' },
                    { label: 'Pending',        value: `$${finance.pending?.toLocaleString() ?? 0}`,      color: 'text-rose-500' },
                ].map((s, i) => (
                    <Card key={i}>
                        <p className="text-xs text-slate-400 font-medium mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    </Card>
                ))}

                {/* monthly income/expense */}
                <div className="lg:col-span-2">
                    <Card>
                        <SectionTitle>Monthly Revenue vs. Collected</SectionTitle>
                        <div className="h-56">
                            {incomeExpData
                                ? <Line options={baseOpts} data={incomeExpData} />
                                : <Empty msg="No monthly trend data." />}
                        </div>
                    </Card>
                </div>

                {/* revenue by category */}
                <Card>
                    <SectionTitle>Revenue by Category</SectionTitle>
                    <div className="h-56 flex items-center justify-center">
                        {catDonutData
                            ? <Doughnut options={{ ...baseOpts, cutout: '68%', plugins: { ...baseOpts.plugins, legend: { position: 'right' as const, labels: { color: '#94a3b8', usePointStyle: true, padding: 10, font: { size: 10 } } } } }} data={catDonutData} />
                            : <Empty msg="No category data." />}
                    </div>
                </Card>

                {/* outstanding dues table */}
                <div className="lg:col-span-3">
                    <Card>
                        <SectionTitle>Outstanding Dues</SectionTitle>
                        {financeData.outstanding?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                                            <th className="pb-2 text-left font-semibold">Student</th>
                                            <th className="pb-2 text-left font-semibold">Amount Owed</th>
                                            <th className="pb-2 text-left font-semibold">Status</th>
                                            <th className="pb-2 text-left font-semibold">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {financeData.outstanding.map((inv: any, i: number) => {
                                            const owed = (inv.totalAmount ?? 0) - (inv.paidAmount ?? 0);
                                            const due = inv.dueDate ? new Date(inv.dueDate) : null;
                                            const isOverdue = due && due < new Date();
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-2.5 font-semibold text-slate-800 dark:text-white">
                                                        {inv.student?.firstName} {inv.student?.lastName}
                                                    </td>
                                                    <td className="py-2.5 font-bold text-rose-500">${owed.toLocaleString()}</td>
                                                    <td className="py-2.5">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${inv.status === 'unpaid' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                            {inv.status === 'unpaid' ? <AlertTriangle className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                            {inv.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-slate-500 dark:text-slate-400">
                                                        {due ? (
                                                            <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>
                                                                {due.toLocaleDateString()}
                                                                {isOverdue && ' (Overdue)'}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <Empty msg="No outstanding dues." />}
                    </Card>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   WORKLOAD TAB
   data from: GET /analytics/staff
   returns: { workload: [{ teacherName, periodsCount }] }
════════════════════════════════════════════════════════════════════════════ */
function WorkloadTab({ staffData, loading }: { staffData: any; loading: boolean }) {
    if (loading) return <Card className="h-64"><Spinner /></Card>;
    if (!staffData?.workload?.length) return <Card><Empty msg="No timetable / workload data available." /></Card>;

    const sorted = [...staffData.workload].sort((a: any, b: any) => b.periodsCount - a.periodsCount);

    const barData = {
        labels: sorted.map((w: any) => w.teacherName),
        datasets: [{
            label: 'Periods / Week',
            data: sorted.map((w: any) => w.periodsCount),
            backgroundColor: '#818cf8', borderRadius: 4,
        }],
    };

    const most  = sorted[0];
    const least = sorted[sorted.length - 1];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-3">
                <Card>
                    <SectionTitle>Teacher Workload (Periods per Week)</SectionTitle>
                    <div className="h-80">
                        <Bar options={{ ...baseOpts, indexAxis: 'y' as const, plugins: { ...baseOpts.plugins, legend: { display: false } } }} data={barData} />
                    </div>
                </Card>
            </div>

            <Card>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 mb-3">Most Loaded</div>
                <p className="text-xl font-black text-slate-800 dark:text-white">{most.teacherName}</p>
                <p className="text-sm text-slate-400 mt-1">{most.periodsCount} periods / week</p>
            </Card>

            <Card>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 mb-3">Least Loaded</div>
                <p className="text-xl font-black text-slate-800 dark:text-white">{least.teacherName}</p>
                <p className="text-sm text-slate-400 mt-1">{least.periodsCount} periods / week</p>
            </Card>

            <Card>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 mb-3">Average</div>
                <p className="text-xl font-black text-slate-800 dark:text-white">
                    {(sorted.reduce((s: number, w: any) => s + w.periodsCount, 0) / sorted.length).toFixed(1)}
                </p>
                <p className="text-sm text-slate-400 mt-1">periods / week across {sorted.length} teachers</p>
            </Card>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   PROGRESS TAB
   data from: GET /students?search=...  then GET /analytics/student/:id
   returns: { marks: [{ subject, exam, marksObtained, maxMarks }], attendanceSummary }
════════════════════════════════════════════════════════════════════════════ */
function ProgressTab() {
    const [query, setQuery]                   = useState('');
    const [searching, setSearching]           = useState(false);
    const [studentProgress, setStudentProgress] = useState<any>(null);
    const [error, setError]                   = useState('');

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setSearching(true); setError(''); setStudentProgress(null);
        try {
            const { data: sr } = await api.get(`/students?search=${encodeURIComponent(query)}`);
            const student = sr.data?.[0];
            if (!student) { setError('Student not found.'); return; }
            const { data: pr } = await api.get(`/analytics/student/${student._id}`);
            setStudentProgress({ student, ...pr.data });
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Search failed.');
        } finally { setSearching(false); }
    }, [query]);

    /* performance line */
    const perfData = studentProgress?.marks?.length ? {
        labels: studentProgress.marks.map((m: any) => m.exam?.name ?? ''),
        datasets: [{
            label: 'Score %',
            data: studentProgress.marks.map((m: any) => m.maxMarks > 0 ? +((m.marksObtained / m.maxMarks) * 100).toFixed(1) : 0),
            borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.15)',
            tension: 0.4, fill: true, borderWidth: 2, pointRadius: 3, pointHoverRadius: 6,
        }],
    } : null;

    /* attendance donut */
    const attData = studentProgress?.attendanceSummary?.length ? {
        labels: studentProgress.attendanceSummary.map((a: any) => a._id),
        datasets: [{
            data: studentProgress.attendanceSummary.map((a: any) => a.count),
            backgroundColor: ['#34d399', '#f87171', '#fbbf24', '#94a3b8'],
            borderWidth: 0, hoverOffset: 8,
        }],
    } : null;

    return (
        <Card className="col-span-full">
            {/* search */}
            <div className="max-w-xl mx-auto text-center space-y-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-2xl mx-auto">🚀</div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Student Progress Tracker</h3>
                <p className="text-slate-400 text-sm">Search by student name or admission number.</p>
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Student name or admission no…"
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {searching ? <><RefreshCw className="w-4 h-4 animate-spin" /> Searching…</> : 'Analyze'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            {/* results */}
            {studentProgress && (
                <div className="space-y-6">
                    {/* student card */}
                    <div className="flex items-center gap-5 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-2xl font-black text-indigo-400 shrink-0">
                            {studentProgress.student.firstName?.[0]}
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800 dark:text-white">
                                {studentProgress.student.firstName} {studentProgress.student.lastName}
                            </p>
                            <p className="text-slate-400 text-sm">
                                Admission No: {studentProgress.student.admissionNo ?? studentProgress.student.profile?.admissionNo ?? '—'} &nbsp;|&nbsp;
                                Total exams: {studentProgress.marks?.length ?? 0}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* performance over time */}
                        <Card>
                            <SectionTitle>Performance over Time</SectionTitle>
                            <div className="h-56">
                                {perfData
                                    ? <Line options={baseOpts} data={perfData} />
                                    : <Empty msg="No marks data for this student." />}
                            </div>
                        </Card>

                        {/* attendance donut */}
                        <Card>
                            <SectionTitle>Attendance Summary</SectionTitle>
                            <div className="h-56 flex items-center justify-center">
                                {attData
                                    ? <Doughnut options={{ ...baseOpts, cutout: '68%', plugins: { ...baseOpts.plugins, legend: { position: 'right' as const, labels: { color: '#94a3b8', usePointStyle: true, padding: 10, font: { size: 11 } } } } }} data={attData} />
                                    : <Empty msg="No attendance records." />}
                            </div>
                        </Card>
                    </div>

                    {/* subject breakdown table */}
                    {studentProgress.marks?.length > 0 && (
                        <Card>
                            <SectionTitle>Subject-wise Breakdown</SectionTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700">
                                            <th className="pb-2 text-left font-semibold">Exam</th>
                                            <th className="pb-2 text-left font-semibold">Subject</th>
                                            <th className="pb-2 text-center font-semibold">Score</th>
                                            <th className="pb-2 text-center font-semibold">Max</th>
                                            <th className="pb-2 text-center font-semibold">%</th>
                                            <th className="pb-2 text-center font-semibold">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {studentProgress.marks.map((m: any, i: number) => {
                                            const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
                                            return (
                                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="py-2.5 text-slate-600 dark:text-slate-300">{m.exam?.name ?? '—'}</td>
                                                    <td className="py-2.5 font-medium text-slate-800 dark:text-white">{m.subject?.name ?? '—'}</td>
                                                    <td className="py-2.5 text-center font-bold text-emerald-500">{m.marksObtained}</td>
                                                    <td className="py-2.5 text-center text-slate-400">{m.maxMarks}</td>
                                                    <td className="py-2.5 text-center text-slate-500 dark:text-slate-400">{pct.toFixed(1)}%</td>
                                                    <td className="py-2.5 text-center">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 50 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-red-500/15 text-red-400'}`}>
                                                            {pct >= 50 ? 'PASS' : 'FAIL'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </Card>
    );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN PAGE — orchestrates all data fetching
════════════════════════════════════════════════════════════════════════════ */
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'academic',   label: 'Academic',   icon: <GraduationCap className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance', icon: <Users className="w-4 h-4" /> },
    { id: 'financial',  label: 'Financial',  icon: <DollarSign className="w-4 h-4" /> },
    { id: 'workload',   label: 'Workload',   icon: <Briefcase className="w-4 h-4" /> },
    { id: 'progress',   label: 'Progress',   icon: <TrendingUp className="w-4 h-4" /> },
];

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('academic');
    const [user, setUser] = useState<any>(null);

    /* shared data */
    const [classes, setClasses]           = useState<any[]>([]);
    const [overview, setOverview]         = useState<any>(null);
    const [overviewLoading, setOvLoading] = useState(false);
    const [financeData, setFinanceData]   = useState<any>(null);
    const [finLoading, setFinLoading]     = useState(false);
    const [staffData, setStaffData]       = useState<any>(null);
    const [staffLoading, setStaffLoading] = useState(false);

    /* on mount */
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
        api.get('/classes').then(r => setClasses(r.data.data ?? [])).catch(() => {});
    }, []);

    /* lazy-load per tab */
    useEffect(() => {
        if ((activeTab === 'attendance') && !overview) {
            setOvLoading(true);
            api.get('/analytics/admin/overview')
                .then(r => setOverview(r.data.data))
                .catch(() => {})
                .finally(() => setOvLoading(false));
        }
        if (activeTab === 'financial') {
            if (!financeData) {
                setFinLoading(true);
                api.get('/analytics/finance')
                    .then(r => setFinanceData(r.data.data))
                    .catch(() => {})
                    .finally(() => setFinLoading(false));
            }
            if (!overview) {
                setOvLoading(true);
                api.get('/analytics/admin/overview')
                    .then(r => setOverview(r.data.data))
                    .catch(() => {})
                    .finally(() => setOvLoading(false));
            }
        }
        if (activeTab === 'workload' && !staffData) {
            setStaffLoading(true);
            api.get('/analytics/staff')
                .then(r => setStaffData(r.data.data))
                .catch(() => {})
                .finally(() => setStaffLoading(false));
        }
    }, [activeTab]);

    const isTeacher = user?.role === 'teacher';
    const visibleTabs = TABS.filter(t => isTeacher && (t.id === 'financial' || t.id === 'workload') ? false : true);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Reports &amp; Analytics</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time insights from your school database</p>
            </div>

            {/* tab bar */}
            <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* content */}
            {activeTab === 'academic'   && <AcademicTab   classes={classes} />}
            {activeTab === 'attendance' && <AttendanceTab  overview={overview} loading={overviewLoading} />}
            {activeTab === 'financial'  && <FinancialTab   financeData={financeData} overview={overview} loading={finLoading} />}
            {activeTab === 'workload'   && <WorkloadTab    staffData={staffData} loading={staffLoading} />}
            {activeTab === 'progress'   && (
                <div className="grid grid-cols-1 gap-5">
                    <ProgressTab />
                </div>
            )}
        </div>
    );
}
