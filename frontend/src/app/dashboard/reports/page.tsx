'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler,
    ChartOptions
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
    AcademicCapIcon,
    UserGroupIcon,
    BanknotesIcon,
    BriefcaseIcon,
    DocumentArrowDownIcon,
    TableCellsIcon,
    PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('academic');
    const [user, setUser] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [studentProgress, setStudentProgress] = useState<any>(null);
    const [financeStats, setFinanceStats] = useState<any>(null);
    const [staffStats, setStaffStats] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const u = localStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
        }
        api.get('/classes').then(res => setClasses(res.data.data));
    }, []);

    useEffect(() => {
        if (activeTab === 'finance' && !financeStats) {
            api.get('/analytics/finance').then(res => setFinanceStats(res.data.data));
        }
        if (activeTab === 'workload' && !staffStats) {
            api.get('/analytics/staff').then(res => setStaffStats(res.data.data));
        }
    }, [activeTab]);

    useEffect(() => {
        if (!selectedClass) return;
        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/analytics/class/${selectedClass._id}`);
                setStats(data.data);
            } catch (err) {
                console.error("Failed to fetch analytics");
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [selectedClass]);

    const handleStudentSearch = async () => {
        if (!searchQuery) return;
        setSearching(true);
        try {
            // First search for student to get ID
            const { data: searchRes } = await api.get(`/students?search=${searchQuery}`);
            const student = searchRes.data[0];
            if (student) {
                const { data: progressRes } = await api.get(`/analytics/student/${student._id}`);
                setStudentProgress({
                    student,
                    ...progressRes.data
                });
            } else {
                alert('Student not found');
            }
        } catch (err) {
            console.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const baseChartOptions: ChartOptions<any> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    color: '#94a3b8',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { size: 11, weight: '600' as any, family: "'Plus Jakarta Sans', sans-serif" }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                titleFont: { size: 13, weight: 'bold' as any, family: "'Plus Jakarta Sans', sans-serif" },
                bodyColor: '#cbd5e1',
                bodyFont: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: true,
                boxPadding: 6,
                usePointStyle: true,
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: '#64748b',
                    font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.03)',
                    drawBorder: false
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }
                }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        }
    };


    // --- DATA TRANSFORMATION ---
    const academicData = stats ? {
        labels: stats.marksBySubject.map((m: any) => m.subjectName),
        datasets: [
            {
                label: 'Avg Score',
                data: stats.marksBySubject.map((m: any) => m.avgScore),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.45,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 3
            },
            {
                label: 'Highest Score',
                data: stats.marksBySubject.map((m: any) => m.maxScore),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                tension: 0.45,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                borderWidth: 3
            },

        ],
    } : {
        labels: ['Term 1', 'Term 2', 'Term 3', 'Term 4'],
        datasets: [
            {
                label: 'Avg Class Grade',
                data: [78, 82, 81, 85],
                borderColor: '#818cf8',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Pass Rate (%)',
                data: [92, 94, 91, 96],
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const attendanceData = stats ? {
        labels: stats.attendanceTrends.map((a: any) => a._id),
        datasets: [
            {
                label: 'Attendance Rate (%)',
                data: stats.attendanceTrends.map((a: any) => Math.round((a.presentCount / a.totalCount) * 100)),
                backgroundColor: '#fb7185',
                borderRadius: 4,
            }
        ],
    } : {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        datasets: [
            {
                label: 'Student',
                data: [98, 95, 97, 94, 92],
                backgroundColor: '#fb7185',
                borderRadius: 4,
            },
            {
                label: 'Teacher',
                data: [100, 100, 98, 98, 96],
                backgroundColor: '#60a5fa',
                borderRadius: 4,
            },
        ],
    };

    const financeData = financeStats ? {
        labels: financeStats.revenueByCategory.map((c: any) => c._id),
        datasets: [
            {
                label: 'Revenue',
                data: financeStats.revenueByCategory.map((c: any) => c.total),
                backgroundColor: [
                    '#818cf8', // indigo-400
                    '#c084fc', // purple-400
                    '#f472b6', // pink-400
                    '#4ade80', // green-400
                    '#fbbf24', // amber-400
                ],
                borderWidth: 0,
                hoverOffset: 10,
            },
        ],
    } : {
        labels: ['Tuition', 'Transport', 'Books', 'Uniforms', 'Other'],
        datasets: [
            {
                label: 'Revenue',
                data: [50000, 15000, 8000, 12000, 5000],
                backgroundColor: [
                    '#818cf8', // indigo-400
                    '#c084fc', // purple-400
                    '#f472b6', // pink-400
                    '#4ade80', // green-400
                    '#fbbf24', // amber-400
                ],
                borderWidth: 0,
                hoverOffset: 10,
            },
        ],
    };

    const workloadData = staffStats ? {
        labels: staffStats.workload.map((w: any) => w.teacherName),
        datasets: [
            {
                label: 'Teaching Periods / Week',
                data: staffStats.workload.map((w: any) => w.periodsCount),
                backgroundColor: '#818cf8', // indigo-400 
                borderRadius: 4,
            },
        ],
    } : {
        labels: ['Mr. Smith', 'Ms. Doe', 'Mrs. Johnson', 'Mr. Brown', 'Ms. Davis'],
        datasets: [
            {
                label: 'Teaching Hours / Week',
                data: [20, 18, 22, 15, 19],
                backgroundColor: '#818cf8', // indigo-400 
                borderRadius: 4,
            },
        ],
    };

    // --- CLASS SELECTOR UI ---
    const ClassSelector = () => (
        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 shadow-inner w-full">
            <select
                value={selectedClass?._id || ''}
                onChange={(e) => setSelectedClass(classes.find(c => c._id === e.target.value))}
                className="w-full bg-transparent border-none text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
            >
                <option value="" className="bg-slate-900">Choose Class...</option>
                {classes.map(c => (
                    <option key={c._id} value={c._id} className="bg-slate-900">{c.name} - {c.section}</option>
                ))}
            </select>
        </div>
    );

    // --- EXPORT FUNCTIONS ---
    const exportToExcel = (data: any[], fileName: string) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    const exportToPDF = (title: string, columns: string[], rows: any[][]) => {
        const doc = new jsPDF();
        doc.text(title, 14, 22);
        autoTable(doc, {
            head: [columns],
            body: rows,
            startY: 30,
        });
        doc.save(`${title.toLowerCase().replace(/\s/g, '_')}.pdf`);
    };

    const studentGrades = [
        { name: 'John Doe', math: 85, science: 90, english: 88, history: 92 },
        { name: 'Jane Smith', math: 92, science: 88, english: 95, history: 89 },
        { name: 'Sam Wilson', math: 78, science: 82, english: 80, history: 85 },
    ];

    const handleExportGradesPDF = () => {
        if (stats?.gradeMatrix) {
            const subjects = stats.marksBySubject.map((s: any) => s.subjectName);
            const columns = ['Name', ...subjects];
            const rows = stats.gradeMatrix.map((s: any) => [
                s.studentName,
                ...subjects.map((subj: any) => s.marks.find((m: any) => m.subject === subj)?.score || '-')
            ]);
            exportToPDF(`Class_${selectedClass?.name}_Grades_Report`, columns, rows);
        } else {
            const columns = ['Name', 'Math', 'Science', 'English', 'History'];
            const rows = studentGrades.map(s => [s.name, s.math, s.science, s.english, s.history]);
            exportToPDF('Student_Grades_Report', columns, rows);
        }
    };

    const handleExportGradesExcel = () => {
        if (stats?.gradeMatrix) {
            const subjects = stats.marksBySubject.map((s: any) => s.subjectName);
            const data = stats.gradeMatrix.map((s: any) => {
                const row: any = { Name: s.studentName };
                subjects.forEach((subj: any) => {
                    row[subj] = s.marks.find((m: any) => m.subject === subj)?.score || '-';
                });
                return row;
            });
            exportToExcel(data, `Class_${selectedClass?.name}_Grades_Report`);
        } else {
            exportToExcel(studentGrades, 'Student_Grades_Report');
        }
    };


    // --- RENDER HELPERS ---
    const renderTabButton = (id: string, label: string, icon: any) => {
        const Icon = icon;
        const isActive = activeTab === id;
        return (
            <button
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 ${isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
            >
                <Icon className="w-5 h-5" />
                {label}
            </button>
        );
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Reports & Analytics</h1>
                    <p className="text-sm text-slate-400 mt-1">Deep insights into academic and institutional performance</p>
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                    <button onClick={handleExportGradesExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all font-semibold text-xs sm:text-sm">
                        <TableCellsIcon className="w-4 h-4" />
                        Excel
                    </button>
                    <button onClick={handleExportGradesPDF} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all font-semibold text-xs sm:text-sm">
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Tabs & Class Selector */}
            <div className="flex flex-col xl:row xl:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div className="flex flex-wrap gap-2">
                    {renderTabButton('academic', 'Academic', AcademicCapIcon)}
                    {renderTabButton('attendance', 'Attendance', UserGroupIcon)}
                    {user?.role !== 'teacher' && renderTabButton('finance', 'Financial', BanknotesIcon)}
                    {user?.role !== 'teacher' && renderTabButton('workload', 'Workload', BriefcaseIcon)}
                    {renderTabButton('progress', 'Progress', PresentationChartLineIcon)}
                </div>
                <div className="w-full xl:w-auto">
                    <ClassSelector />
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">

                {/* ACADEMIC VIEW */}
                {activeTab === 'academic' && (
                    <>
                        <div className="glass-dark p-6 rounded-3xl col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-bold text-white mb-6">Academic Performance Trends</h3>
                            <div className="h-80 w-full">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Analyzing class data...</div>
                                ) : (
                                    <Line options={baseChartOptions} data={academicData} />

                                )}
                            </div>
                        </div>
                        <div className="glass-dark p-6 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-4">Performance Distribution</h3>
                            <div className="h-64 w-full flex items-center justify-center">
                                {stats ? (
                                    <Pie
                                        options={{
                                            ...baseChartOptions,
                                            plugins: {
                                                ...baseChartOptions.plugins,
                                                legend: {
                                                    position: 'right' as const,
                                                    labels: {
                                                        color: '#94a3b8',
                                                        usePointStyle: true,
                                                        pointStyle: 'circle',
                                                        padding: 15,
                                                        font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }
                                                    }
                                                }
                                            }
                                        }}
                                        data={{
                                            labels: ['Excellent (90%+)', 'Good (70%-90%)', 'Average (50%-70%)', 'Below (50%-)'],
                                            datasets: [{
                                                data: [
                                                    stats.marksBySubject.filter((m: any) => (m.avgScore / m.maxScore) >= 0.9).length,
                                                    stats.marksBySubject.filter((m: any) => (m.avgScore / m.maxScore) >= 0.7 && (m.avgScore / m.maxScore) < 0.9).length,
                                                    stats.marksBySubject.filter((m: any) => (m.avgScore / m.maxScore) >= 0.5 && (m.avgScore / m.maxScore) < 0.7).length,
                                                    stats.marksBySubject.filter((m: any) => (m.avgScore / m.maxScore) < 0.5).length,
                                                ],
                                                backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444'],
                                                borderColor: 'rgba(255,255,255,0.05)',
                                                borderWidth: 2,
                                                hoverOffset: 15
                                            }]
                                        }}
                                    />

                                ) : (
                                    <p className="text-slate-500 italic text-sm text-center">Select a class to view distribution.</p>
                                )}
                            </div>
                        </div>
                        <div className="glass-dark p-6 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-4">Grade Matrix</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-400">
                                    <thead className="bg-white/5 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Student</th>
                                            {stats?.marksBySubject.map((s: any) => (
                                                <th key={s.subjectName} className="px-4 py-3">{s.subjectName.slice(0, 3)}</th>
                                            ))}
                                            {!stats && (
                                                <>
                                                    <th className="px-4 py-3">Math</th>
                                                    <th className="px-4 py-3">Sci</th>
                                                    <th className="px-4 py-3">Eng</th>
                                                    <th className="px-4 py-3 rounded-r-lg">Hist</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stats ? stats.gradeMatrix.map((s: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">{s.studentName}</td>
                                                {stats.marksBySubject.map((subj: any) => {
                                                    const mark = s.marks.find((m: any) => m.subject === subj.subjectName);
                                                    return (
                                                        <td key={subj.subjectName} className="px-4 py-3 text-emerald-400 font-bold">
                                                            {mark ? mark.score : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )) : studentGrades.map((s, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                                                <td className="px-4 py-3 text-emerald-400 font-bold">{s.math}</td>
                                                <td className="px-4 py-3 text-emerald-400 font-bold">{s.science}</td>
                                                <td className="px-4 py-3 text-emerald-400 font-bold">{s.english}</td>
                                                <td className="px-4 py-3 text-emerald-400 font-bold">{s.history}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ATTENDANCE VIEW */}
                {activeTab === 'attendance' && (
                    <>
                        <div className="glass-dark p-6 rounded-3xl col-span-1 lg:col-span-2">
                            <h3 className="text-lg font-bold text-white mb-6">Weekly Attendance Overview</h3>
                            <div className="h-80 w-full">
                                {loading ? (
                                    <div className="h-full flex items-center justify-center text-slate-500 animate-pulse">Aggregating attendance records...</div>
                                ) : (
                                    <Bar options={baseChartOptions} data={attendanceData} />

                                )}
                            </div>
                        </div>
                        <div className="glass-dark p-6 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-4">Critical Alerts</h3>
                            <div className="space-y-3">
                                {stats?.lowAttendanceAlerts.length > 0 ? (
                                    stats.lowAttendanceAlerts.map((alert: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                                            <span className="font-medium">{alert.studentName}</span>
                                            <span className="font-bold bg-red-500 text-white px-2 py-0.5 rounded text-xs">{Math.round(alert.attendanceRate)}%</span>
                                        </div>
                                    ))
                                ) : stats ? (
                                    <p className="text-slate-500 text-sm italic p-4">No critical attendance issues found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                                            <span className="font-medium">John Doe (10A)</span>
                                            <span className="font-bold bg-red-500 text-white px-2 py-0.5 rounded text-xs">65%</span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                                            <span className="font-medium">Alice Cooper (9B)</span>
                                            <span className="font-bold bg-amber-500 text-white px-2 py-0.5 rounded text-xs">70%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </>
                )}

                {/* FINANCE VIEW */}
                {activeTab === 'finance' && (
                    <>
                        <div className="glass-dark p-6 rounded-3xl">
                            <h3 className="text-lg font-bold text-white mb-6">Revenue Distribution</h3>
                            <div className="h-64 w-full flex justify-center relative">
                                <Doughnut
                                    options={{
                                        ...baseChartOptions,
                                        cutout: '75%',
                                        plugins: {
                                            ...baseChartOptions.plugins,
                                            legend: {
                                                position: 'right' as const,
                                                labels: {
                                                    color: '#94a3b8',
                                                    usePointStyle: true,
                                                    padding: 15,
                                                    font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }
                                                }
                                            }
                                        }
                                    }}
                                    data={financeData}
                                />

                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-white">
                                        ${financeStats ? financeStats.revenueByCategory.reduce((acc: number, curr: any) => acc + curr.total, 0).toLocaleString() : '90k'}
                                    </span>
                                </div>
                            </div>

                        </div>
                        <div className="glass-dark p-6 rounded-3xl overflow-x-auto custom-scrollbar">
                            <h3 className="text-lg font-bold text-white mb-4">Outstanding Dues</h3>
                            <table className="w-full text-sm text-left text-slate-400 min-w-[500px]">
                                <thead className="bg-white/5 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Student</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3 rounded-r-lg">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {financeStats ? (
                                        financeStats.outstanding.map((inv: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">{inv.student.firstName} {inv.student.lastName}</td>
                                                <td className="px-4 py-3 text-red-400 font-bold">${inv.totalAmount - inv.paidAmount}</td>
                                                <td className="px-4 py-3">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <>
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">Robert Fox</td>
                                                <td className="px-4 py-3 text-red-400 font-bold">$450.00</td>
                                                <td className="px-4 py-3">Oct 15, 2025</td>
                                            </tr>
                                            <tr className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">Jenny Wilson</td>
                                                <td className="px-4 py-3 text-red-400 font-bold">$1,200.00</td>
                                                <td className="px-4 py-3">Oct 20, 2025</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* WORKLOAD VIEW */}
                {activeTab === 'workload' && (
                    <div className="glass-dark p-6 rounded-3xl col-span-1 lg:col-span-2">
                        <h3 className="text-lg font-bold text-white mb-6">Teacher Workload (Weekly Hours)</h3>
                        <div className="h-80 w-full">
                            <Bar
                                options={{
                                    ...baseChartOptions,
                                    indexAxis: 'y' as const,
                                    plugins: {
                                        ...baseChartOptions.plugins,
                                        legend: { display: false }
                                    }
                                }}
                                data={workloadData}
                            />
                        </div>
                    </div>
                )}

                {/* PROGRESS VIEW */}
                {activeTab === 'progress' && (
                    <div className="glass-dark p-8 rounded-[2.5rem] col-span-1 lg:col-span-2 border border-white/5 space-y-8">
                        <div className="max-w-xl mx-auto text-center space-y-4 sm:space-y-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl sm:text-3xl mx-auto">
                                🚀
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-white">Student Progress Tracker</h3>
                            <p className="text-slate-400 text-xs sm:text-sm">Monitor individual growth trajectories by searching for a student below.</p>
                            <div className="flex flex-col sm:row gap-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search student name or ID..."
                                    className="flex-1 px-5 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                />
                                <button
                                    onClick={handleStudentSearch}
                                    disabled={searching}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-indigo-500/20"
                                >
                                    {searching ? 'Analyzing...' : 'Analyze'}
                                </button>
                            </div>
                        </div>

                        {studentProgress && (
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
                                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/10">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl font-black text-indigo-400">
                                        {studentProgress.student.firstName[0]}
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-bold text-white">{studentProgress.student.firstName} {studentProgress.student.lastName}</h4>
                                        <p className="text-slate-400">Roll No: {studentProgress.student.profile?.rollNo || 'N/A'} | ID: {studentProgress.student._id.slice(-6)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                        <h5 className="text-white font-bold mb-4">Performance over Time</h5>
                                        <div className="h-64">
                                            <Line
                                                options={baseChartOptions}
                                                data={{

                                                    labels: studentProgress.marks.map((m: any) => m.exam.name),
                                                    datasets: [{
                                                        label: 'Score Percentage',
                                                        data: studentProgress.marks.map((m: any) => (m.marksObtained / m.maxMarks) * 100),
                                                        borderColor: '#818cf8',
                                                        backgroundColor: 'rgba(129, 140, 248, 0.2)',
                                                        tension: 0.4,
                                                        fill: true
                                                    }]
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                        <h5 className="text-white font-bold mb-4">Attendance Summary</h5>
                                        <div className="h-64 flex items-center justify-center">
                                            <Doughnut
                                                options={{ ...baseChartOptions, cutout: '70%', plugins: { ...baseChartOptions.plugins, legend: { display: false } } }}
                                                data={{

                                                    labels: studentProgress.attendanceSummary.map((a: any) => a._id),
                                                    datasets: [{
                                                        data: studentProgress.attendanceSummary.map((a: any) => a.count),
                                                        backgroundColor: ['#34d399', '#f87171', '#fbbf24', '#94a3b8']
                                                    }]
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                    <h5 className="text-white font-bold mb-4">Subject Wise Breakdown</h5>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase">
                                                <tr>
                                                    <th className="px-4 py-2">Subject</th>
                                                    <th className="px-4 py-2">Last Score</th>
                                                    <th className="px-4 py-2">Max</th>
                                                    <th className="px-4 py-2">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-white">
                                                {studentProgress.marks.slice(-5).map((m: any, i: number) => (
                                                    <tr key={i} className="border-t border-white/5">
                                                        <td className="px-4 py-3">{m.subject.name}</td>
                                                        <td className="px-4 py-3 font-bold">{m.marksObtained}</td>
                                                        <td className="px-4 py-3 text-slate-400">{m.maxMarks}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${(m.marksObtained / m.maxMarks) >= 0.5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {(m.marksObtained / m.maxMarks) >= 0.5 ? 'PASS' : 'FAIL'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
