"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../utils/api';
import { initSocket, disconnectSocket } from '../utils/socket';
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
    Filler,
    ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';

import { useTheme } from 'next-themes';
import {
    GraduationCap,
    CheckCircle2,
    DollarSign,
    FileText,
    TrendingUp,
    Zap,
    Bell,
    Users,
    Clock,
    BookOpen,
    UserPlus,
    Calendar,
    FileBadge,
    BarChart3,
    School,
    FolderOpen,
    Shield,
    CalendarDays,
    ArrowRight
} from 'lucide-react';


ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);


export default function DashboardPage() {
    const { theme } = useTheme();
    const [user, setUser] = useState<any>(null);
    const [adminData, setAdminData] = useState<any>(null);
    const [stats, setStats] = useState({
        totalStudents: 0,
        attendanceToday: '0%',
        pendingFees: '$0',
        upcomingExams: 0
    });
    const [timetable, setTimetable] = useState<any[]>([]);
    const [teacherData, setTeacherData] = useState<{ classes: string[], totalStudents: number }>({
        classes: [],
        totalStudents: 0
    });
    const [studentStats, setStudentStats] = useState({
        attendance: '0%',
        gpa: 'N/A',
        pendingFees: '$0',
        nextExam: 'N/A',
        attendanceRecords: [] as any[]
    });

    const [children, setChildren] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [exams, setExams] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [workload, setWorkload] = useState({ totalHours: 0, totalSlots: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);

            const fetchDashboardData = async () => {
                try {
                    // Fetch notifications for everyone
                    api.get('/notifications').then(res => setNotifications(res.data.data || []));

                    if (userData.role === 'school-admin') {
                        const { data: analytics } = await api.get('/analytics/admin/overview');
                        setAdminData(analytics.data);
                        setStats({
                            totalStudents: analytics.data.counts.students,
                            attendanceToday: `${analytics.data.attendance.rate}%`,
                            pendingFees: `$${analytics.data.finance.pending.toLocaleString()}`,
                            upcomingExams: 0 // Will fetch from exams
                        });
                        api.get('/exams').then(res => {
                            const exams = res.data.data || [];
                            const upcoming = exams.filter((e: any) => new Date(e.startDate) > new Date()).length;
                            setStats(s => ({ ...s, upcomingExams: upcoming }));
                            setExams(exams);
                        });
                        api.get('/tasks').then(res => setTasks(res.data.data || []));
                    } else if (userData.role === 'teacher') {
                        const [ttRes, stRes] = await Promise.all([
                            api.get('/timetable/teacher/me'),
                            api.get('/students')
                        ]);
                        const ttData = ttRes.data.data || [];
                        setTimetable(ttData);
                        setTeacherData({
                            classes: Array.from(new Set(ttData.map((s: any) => s.class?.name))) as string[],
                            totalStudents: stRes.data.count || 0
                        });

                        api.get('/tasks').then(res => setTasks(res.data.data || []));
                        api.get('/timetable/teacher/workload').then(res => setWorkload(res.data.data || { totalHours: 0, totalSlots: 0 }));
                        api.get('/exams').then(res => setExams(res.data.data || []));
                    } else if (userData.role === 'student') {
                        const [invRes, attRes, assRes, ttRes, gradesRes] = await Promise.all([
                            api.get(`/fees/invoices?studentId=${userData._id}`),
                            api.get('/attendance/my'),
                            api.get('/assignments'),
                            api.get('/timetable/student/me'),
                            api.get('/exams/student-grades')
                        ]);

                        const invoices = invRes.data.data || [];
                        const unpaid = invoices.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + (i.totalAmount - i.paidAmount), 0);
                        const attData = attRes.data.data || {};
                        const attLogs = attData.records || [];
                        const totalDays = attLogs.length;
                        const presentDays = attLogs.filter((a: any) => a.status === 'present').length;
                        const attPercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

                        const gradesData = gradesRes.data.data || {};

                        // Find next exam
                        const { data: allExamsRes } = await api.get('/exams');
                        const allExams = allExamsRes.data || [];
                        const upcomingExams = allExams
                            .filter((e: any) => new Date(e.startDate) > new Date())
                            .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                        const nextExamDate = upcomingExams.length > 0
                            ? new Date(upcomingExams[0].startDate).toLocaleDateString()
                            : 'None Scheduled';

                        setStudentStats(prev => ({
                            ...prev,
                            pendingFees: `$${unpaid.toLocaleString()}`,
                            attendance: `${attPercent}%`,
                            attendanceRecords: attLogs,
                            gpa: gradesData.cumulativeGpa || 'N/A',
                            nextExam: nextExamDate
                        }));

                        setTasks(assRes.data.data || []);
                        setTimetable(ttRes.data.data || []);
                    } else if (userData.role === 'parent') {
                        const { data: childRes } = await api.get('/students/my-children');
                        setChildren(childRes.data || []);
                    }
                } catch (error) {
                    console.error("Dashboard error", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchDashboardData();

            // Socket.IO Integration for Real-time Updates
            if (userData?.tenantId) {
                const socket = initSocket(userData.tenantId);

                socket.on('student:created', () => {
                    // Refresh stats or data
                    fetchDashboardData();
                });

                socket.on('student:deleted', () => {
                    fetchDashboardData();
                });

                socket.on('exam:created', () => {
                    fetchDashboardData();
                });

                // Cleanup on unmount
                return () => {
                    socket.off('student:created');
                    socket.off('student:deleted');
                    socket.off('exam:created');
                    disconnectSocket();
                };
            }
        }
    }, []);

    const isAdmin = user && ['school-admin', 'receptionist'].includes(user.role);
    const isTeacher = user?.role === 'teacher';

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Chart Data for Admin
    const enrollmentData = adminData ? {
        labels: adminData.trends.enrollment.map((t: any) => monthNames[t._id - 1]),
        datasets: [{
            label: 'New Students',
            data: adminData.trends.enrollment.map((t: any) => t.count),
            backgroundColor: (context: any) => {
                const chart = context.chart;
                const { ctx, chartArea } = chart;
                if (!chartArea) return null;
                const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(0, 'rgba(99, 102, 241, 0.05)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0.9)');
                return gradient;
            },
            hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: {
                topLeft: 8,
                topRight: 8,
                bottomLeft: 4,
                bottomRight: 4
            },
            barThickness: 24,
            maxBarThickness: 32,
        }]
    } : null;


    const financeData = adminData ? {
        labels: adminData.trends.finance.map((t: any) => monthNames[t._id - 1]),
        datasets: [
            {
                label: 'Revenue',
                data: adminData.trends.finance.map((t: any) => t.revenue),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: (context: any) => {
                    const { ctx, chartArea } = context.chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.15)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.45,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: 'rgb(34, 197, 94)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 3,
            },
            {
                label: 'Collected',
                data: adminData.trends.finance.map((t: any) => t.collected),
                borderColor: 'rgb(99, 102, 241)',
                backgroundColor: (context: any) => {
                    const { ctx, chartArea } = context.chart;
                    if (!chartArea) return null;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.45,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: 'rgb(99, 102, 241)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 3,
            }
        ]
    } : null;


    const attendanceTrendData = adminData ? {
        labels: adminData.attendance.trends.map((t: any) => t._id.slice(5)), // slice for cleaner date
        datasets: [{
            label: 'Attendance Rate (%)',
            data: adminData.attendance.trends.map((t: any) => Math.round(t.rate)),
            borderColor: 'rgb(244, 114, 182)',
            backgroundColor: (context: any) => {
                const { ctx, chartArea } = context.chart;
                if (!chartArea) return null;
                const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, 'rgba(244, 114, 182, 0.15)');
                gradient.addColorStop(1, 'rgba(244, 114, 182, 0)');
                return gradient;
            },
            fill: true,
            tension: 0.45,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: 'rgb(244, 114, 182)',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            borderWidth: 3,
        }]
    } : null;

    const classDistData = adminData ? {
        labels: adminData.distribution.classes.map((c: any) => c._id || 'Unassigned'),
        datasets: [{
            data: adminData.distribution.classes.map((c: any) => c.count),
            backgroundColor: [
                '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
            ],
            borderWidth: 0,
            hoverOffset: 15
        }]
    } : null;

    const genderData = adminData ? {
        labels: adminData.demographics.gender.map((g: any) => g._id?.charAt(0).toUpperCase() + g._id?.slice(1) || 'N/A'),
        datasets: [{
            data: adminData.demographics.gender.map((g: any) => g.count),
            backgroundColor: ['#60a5fa', '#f472b6', '#94a3b8'],
            borderWidth: 0,
            hoverOffset: 15
        }]
    } : null;

    // --- TEACHER DATA ---
    const teacherWorkloadData = isTeacher ? {
        labels: Array.from(new Set(timetable.map((t: any) => t.subject?.name || 'Unknown'))),
        datasets: [{
            data: Array.from(new Set(timetable.map((t: any) => t.subject?.name))).map(subjName =>
                timetable.filter((t: any) => t.subject?.name === subjName).length
            ),
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            borderWidth: 0,
        }]
    } : null;

    // --- STUDENT DATA ---
    const studentAttendanceDist = (user?.role === 'student' && studentStats.attendanceRecords.length > 0) ? {
        labels: ['Present', 'Absent', 'Late'],
        datasets: [{
            data: [
                studentStats.attendanceRecords.filter((a: any) => a.status === 'present').length,
                studentStats.attendanceRecords.filter((a: any) => a.status === 'absent').length,
                studentStats.attendanceRecords.filter((a: any) => a.status === 'late').length,
            ],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0,
            cutout: '70%',
        }]
    } : null;


    const baseChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },

        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    color: theme === 'dark' ? '#94a3b8' : '#475569',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 25,
                    font: {
                        size: 11,
                        weight: '700' as any,
                        family: "'Plus Jakarta Sans', sans-serif"
                    }
                }
            },
            tooltip: {
                backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: theme === 'dark' ? '#fff' : '#0f172a',
                titleFont: { size: 13, weight: 'bold' as any, family: "'Plus Jakarta Sans', sans-serif" },
                bodyColor: theme === 'dark' ? '#cbd5e1' : '#334155',
                bodyFont: { size: 12, family: "'Plus Jakarta Sans', sans-serif" },
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                borderWidth: 1,
                padding: 14,
                cornerRadius: 16,
                displayColors: true,
                boxPadding: 6,
                usePointStyle: true,
                bodySpacing: 8,
            }
        },
        scales: {
            y: {
                grid: {
                    color: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10, family: "'Plus Jakarta Sans', sans-serif", weight: '600' as any },
                    padding: 12
                }
            },
            x: {
                grid: { display: false },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 10, family: "'Plus Jakarta Sans', sans-serif", weight: '600' as any },
                    padding: 12
                }
            }
        }
    };

    const countChartOptions = {
        ...baseChartOptions,
        plugins: {
            ...baseChartOptions.plugins,
        }
    };

    const currencyChartOptions = {
        ...baseChartOptions,
        scales: {
            ...baseChartOptions.scales,
            y: {
                ...baseChartOptions.scales.y,
                ticks: {
                    ...baseChartOptions.scales.y.ticks,
                    callback: (value: any) => value >= 1000 ? `$${value / 1000}k` : `$${value}`
                }
            }
        }
    };

    const pieChartOptions = {
        ...baseChartOptions,
        scales: {
            x: { display: false },
            y: { display: false }
        },
        plugins: {
            ...baseChartOptions.plugins,
            legend: {
                ...baseChartOptions.plugins.legend,
                position: 'right' as const,
            }
        }
    };


    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-10">
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isAdmin ? 'Institutional Overview' : isTeacher ? 'Faculty Portal' : user?.role === 'parent' ? 'Home Portal' : 'My Learning Space'}
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                    Welcome back, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user?.firstName}</span>. Here is your summary for today.
                </p>
            </div>

            {/* Admin Stats & Charts */}
            {isAdmin && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Total Students', value: stats.totalStudents, icon: <GraduationCap className="w-6 h-6" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                            { label: 'Attendance Today', value: stats.attendanceToday, icon: <CheckCircle2 className="w-6 h-6" />, color: 'text-green-400', bg: 'bg-green-400/10' },
                            { label: 'Pending Revenue', value: stats.pendingFees, icon: <DollarSign className="w-6 h-6" />, color: 'text-orange-400', bg: 'bg-orange-400/10' },
                            { label: 'Upcoming Exams', value: stats.upcomingExams, icon: <FileText className="w-6 h-6" />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                        ].map((item, i) => (

                            <div key={i} className="glass dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm">
                                <div className={`${item.bg} w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{item.label}</p>
                                <p className={`text-3xl font-black mt-1 ${item.color}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Enrollment Chart */}
                        <div className="glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <span>Student Enrollment Growth</span>
                            </h2>

                            <div className="h-[250px] w-full">
                                {enrollmentData ? <Bar data={enrollmentData} options={countChartOptions} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                            </div>
                        </div>

                        {/* Finance Chart */}
                        <div className="glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <span>Revenue vs Collection</span>
                            </h2>

                            <div className="h-[250px] w-full">
                                {financeData ? <Line data={financeData} options={currencyChartOptions} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                            </div>
                        </div>

                        {/* Additional Analytics Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl col-span-1 lg:col-span-2">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-pink-500/10 rounded-xl text-pink-500">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    Attendance Trends (Daily %)
                                </h2>
                                <div className="h-[300px] w-full">
                                    {attendanceTrendData ? <Line data={attendanceTrendData} options={countChartOptions} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                                </div>
                            </div>

                            <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    Gender Profile
                                </h2>
                                <div className="h-[300px] w-full">
                                    {genderData ? <Pie data={genderData} options={pieChartOptions} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                                </div>
                            </div>
                        </div>

                        <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                                    <School className="w-5 h-5" />
                                </div>
                                Population by Class
                            </h2>
                            <div className="h-[320px] w-full">
                                {classDistData ? <Doughnut data={classDistData} options={{ ...pieChartOptions, cutout: '70%' }} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                            </div>
                        </div>
                    </div>


                    {/* Productivity Tools */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <span>Quick Action Shortcuts</span>
                            </h2>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {
                                    [
                                        { name: 'Admit Student', icon: <UserPlus className="w-6 h-6" />, href: '/dashboard/students/add', color: 'hover:bg-indigo-600' },
                                        { name: 'Hire Teacher', icon: <Users className="w-6 h-6" />, href: '/dashboard/teachers/add', color: 'hover:bg-emerald-600' },
                                        { name: 'Post Notice', icon: <Bell className="w-6 h-6" />, href: '/dashboard/communication', color: 'hover:bg-orange-600' },
                                        { name: 'Create Invoice', icon: <FileText className="w-6 h-6" />, href: '/dashboard/finance', color: 'hover:bg-purple-600' },
                                        { name: 'Set Timetable', icon: <CalendarDays className="w-6 h-6" />, href: '/dashboard/timetable', color: 'hover:bg-rose-600' },
                                        { name: 'Issue Certs', icon: <FileBadge className="w-6 h-6" />, href: '/dashboard/certificates', color: 'hover:bg-cyan-600' },
                                        { name: 'View Reports', icon: <BarChart3 className="w-6 h-6" />, href: '/dashboard/reports', color: 'hover:bg-blue-600' },
                                    ].map((action, i) => (
                                        <Link key={i} href={action.href} className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-slate-200 dark:border-white/5 transition-all duration-300 group ${action.color}`}>
                                            <div className="mb-2 text-slate-400 group-hover:text-white group-hover:scale-125 transition-transform">{action.icon}</div>
                                            <span className="text-[11px] font-bold text-slate-600 group-hover:text-white dark:text-slate-300 text-center">{action.name}</span>
                                        </Link>
                                    ))
                                }
                            </div>

                        </div>

                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <span>Recent Activity Feed</span>
                            </h2>

                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {tasks.length > 0 ? tasks.map((task: any) => (
                                    <div key={task._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-white/5">
                                            {task.title.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{task.title}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(task.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                                            Log
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center text-slate-600 italic">No recent activities logged.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Teacher Stats */}
            {isTeacher && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'My Students', value: teacherData.totalStudents, icon: <Users className="w-6 h-6" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                            { label: 'Weekly Hours', value: workload.totalHours, icon: <Clock className="w-6 h-6" />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                            { label: 'Periods Today', value: timetable.filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())).length, icon: <Calendar className="w-6 h-6" />, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                            { label: 'Upcoming Exams', value: exams.filter((e: any) => new Date(e.startDate) > new Date()).length, icon: <FileText className="w-6 h-6" />, color: 'text-rose-400', bg: 'bg-rose-400/10' },
                        ].map((item, i) => (

                            <div key={i} className="glass dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm">
                                <div className={`${item.bg} w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{item.label}</p>
                                <p className={`text-3xl font-black mt-1 ${item.color}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Schedule - Left Column */}
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 lg:col-span-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span>Today's Schedule</span>
                            </h2>

                            <div className="space-y-4">
                                {timetable
                                    .filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
                                    .map((slot: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                            <div className="text-center min-w-[80px]">
                                                <p className="text-xs font-black text-indigo-400">{slot.startTime}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">{slot.endTime}</p>
                                            </div>
                                            <div className="h-10 w-[2px] bg-slate-800" />
                                            <div>
                                                <h4 className="text-slate-900 dark:text-white font-bold group-hover:text-indigo-400 transition">{slot.subject?.name}</h4>
                                                <p className="text-xs text-slate-500">Class {slot.class?.name} - {slot.class?.section} • Room {slot.room || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))}
                                {timetable.filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())).length === 0 && (
                                    <div className="text-center py-10 text-slate-600 italic">No classes scheduled for today.</div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions & Tasks - Right Column */}
                        <div className="space-y-8">
                            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <span>Quick Actions</span>
                                </h2>

                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { name: 'Mark Attendance', icon: <CheckCircle2 className="w-6 h-6" />, href: '/dashboard/attendance', color: 'hover:bg-indigo-600' },
                                        { name: 'Enter Marks', icon: <BarChart3 className="w-6 h-6" />, href: '/dashboard/exams', color: 'hover:bg-emerald-600' },
                                        { name: 'My Classes', icon: <School className="w-6 h-6" />, href: '/dashboard/classes', color: 'hover:bg-amber-600' },
                                        { name: 'Resources', icon: <FolderOpen className="w-6 h-6" />, href: '/dashboard/subjects', color: 'hover:bg-rose-600' },
                                        { name: 'Payslips', icon: <DollarSign className="w-6 h-6" />, href: '/dashboard/payslips', color: 'hover:bg-purple-600' },
                                        { name: 'Communication', icon: <Bell className="w-6 h-6" />, href: '/dashboard/communication', color: 'hover:bg-cyan-600' },
                                    ].map((action, i) => (
                                        <Link key={i} href={action.href} className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 transition-all duration-300 group ${action.color}`}>
                                            <div className="mb-2 text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform">{action.icon}</div>
                                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-white text-center leading-tight">{action.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <span>Daily Tasks</span>
                                </h2>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {tasks.length > 0 ? tasks.slice(0, 5).map((task: any) => (
                                        <div key={task._id} className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                            <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">{task.title}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(task.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    )) : (
                                        <div className="py-10 text-center text-slate-600 italic text-xs">No pending tasks.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                                <BarChart3 className="w-5 h-5" />
                            </div>
                            <span>Subject Workload Distribution</span>
                        </h2>
                        <div className="h-[250px] w-full">
                            {teacherWorkloadData ? <Pie data={teacherWorkloadData} options={pieChartOptions} /> : <div className="h-full flex items-center justify-center text-slate-500">No data available</div>}
                        </div>
                    </div>

                </div>
            )}

            {/* Student Dashboard */}
            {user?.role === 'student' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'My Attendance', value: studentStats.attendance, icon: <Calendar className="w-6 h-6" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                            { label: 'Current GPA', value: studentStats.gpa, icon: <TrendingUp className="w-6 h-6" />, color: 'text-green-400', bg: 'bg-green-400/10' },
                            { label: 'Pending Fees', value: `$${studentStats.pendingFees}`, icon: <DollarSign className="w-6 h-6" />, color: 'text-red-400', bg: 'bg-red-400/10' },
                            { label: 'Next Exam', value: studentStats.nextExam, icon: <FileText className="w-6 h-6" />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                        ].map((item, i) => (

                            <div key={i} className="glass dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/5 relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm">
                                <div className={`${item.bg} w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{item.label}</p>
                                <p className={`text-3xl font-black mt-1 ${item.color}`}>{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Student Quick Actions */}
                    <div className="glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <Zap className="w-5 h-5" />
                            </div>
                            <span>Student Portal</span>
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                            {[
                                { name: 'My Information', icon: <Users className="w-6 h-6" />, href: '/dashboard/profile', color: 'hover:bg-indigo-600' },
                                { name: 'Attendance', icon: <CheckCircle2 className="w-6 h-6" />, href: '/dashboard/attendance', color: 'hover:bg-emerald-600' },
                                { name: 'Grades', icon: <BarChart3 className="w-6 h-6" />, href: '/dashboard/grades', color: 'hover:bg-blue-600' },
                                { name: 'Reports', icon: <FileText className="w-6 h-6" />, href: '/dashboard/reports', color: 'hover:bg-purple-600' },
                                { name: 'Fee Payments', icon: <DollarSign className="w-6 h-6" />, href: '/dashboard/finance', color: 'hover:bg-orange-600' },
                                { name: 'Timetable', icon: <CalendarDays className="w-6 h-6" />, href: '/dashboard/timetable', color: 'hover:bg-rose-600' },
                                { name: 'Online Exams', icon: <School className="w-6 h-6" />, href: '/dashboard/exams', color: 'hover:bg-cyan-600' },
                                { name: 'Notifications', icon: <Bell className="w-6 h-6" />, href: '/dashboard/notifications', color: 'hover:bg-amber-600' },
                            ].map((action, i) => (
                                <Link key={i} href={action.href} className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 transition-all duration-300 group ${action.color}`}>
                                    <div className="mb-2 text-slate-600 dark:text-slate-400 group-hover:text-white group-hover:scale-110 transition-transform">{action.icon}</div>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-white text-center leading-tight">{action.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span>Today's Schedule</span>
                            </h2>

                            <div className="space-y-4">
                                {timetable
                                    .filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
                                    .map((slot: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                                            <div className="text-center min-w-[80px]">
                                                <p className="text-xs font-black text-indigo-400">{slot.startTime}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">{slot.endTime}</p>
                                            </div>
                                            <div className="h-10 w-[2px] bg-slate-800" />
                                            <div>
                                                <h4 className="text-slate-900 dark:text-white font-bold group-hover:text-indigo-400 transition">{slot.subject?.name}</h4>
                                                <p className="text-xs text-slate-500">Teacher: {slot.teacher?.firstName} {slot.teacher?.lastName} • Room {slot.room || 'N/A'}</p>
                                            </div>
                                        </div>
                                    ))}
                                {timetable.filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())).length === 0 && (
                                    <div className="text-center py-10 text-slate-600 italic">No classes scheduled for today. Cheers!</div>
                                )}
                            </div>
                        </div>

                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span>Pending Assignments</span>
                            </h2>

                            <div className="space-y-4">
                                {tasks.length > 0 ? tasks.slice(0, 4).map((task: any) => (
                                    <div key={task._id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group cursor-pointer">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-400 transition">{task.title}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-500">Subject: {task.subject?.name || 'General'}</p>
                                            </div>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-black uppercase">
                                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center text-slate-600 italic">All caught up! No pending assignments.</div>
                                )}
                                <Link href="/dashboard/assignments" className="block text-center w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:text-white rounded-xl text-xs font-bold transition mt-4 flex items-center justify-center gap-2">
                                    <span>View All Assignments</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <span>Attendance Summary</span>
                            </h2>
                            <div className="h-[300px] w-full relative">
                                {studentAttendanceDist ? (
                                    <>
                                        <Doughnut data={studentAttendanceDist} options={{ ...pieChartOptions, cutout: '75%' }} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-3xl font-black text-slate-900 dark:text-white">{studentStats.attendance}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Average</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500 italic">No attendance records found.</div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* Parent View */}
            {user?.role === 'parent' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Shield className="w-5 h-5" />
                        </div>
                        <span>Child Overview</span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {children.map((child: any) => (
                            <Link
                                key={child._id}
                                href={`/dashboard/parent/child/${child._id}`}
                                className="glass-dark p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all cursor-pointer"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-400 transition">{child.firstName} {child.lastName}</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{child.profile?.class} - {child.profile?.section}</p>
                                    <div className="flex gap-4 mt-6">
                                        <div className="text-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase">Term Avg</p>
                                            <p className="text-indigo-400 font-black">--</p>
                                        </div>
                                        <div className="text-center bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase">Attnd</p>
                                            <p className="text-green-400 font-black">--</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Fee Status</p>
                                    <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                        Up to date
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {!isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* News & Announcements */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/5 h-full shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Exams</h2>
                                <Link href="/dashboard/exams" className="text-sm text-indigo-400 font-semibold hover:text-indigo-300 transition">View Board</Link>
                            </div>
                            <div className="space-y-4">
                                {exams.length > 0 ? exams.filter((e: any) => new Date(e.startDate) > new Date()).slice(0, 3).map((e: any) => (
                                    <div key={e._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{e.name}</h4>
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-black uppercase">{e.term}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium">Starts: {new Date(e.startDate).toLocaleDateString()}</p>
                                    </div>
                                )) : (
                                    <div className="py-10 text-center text-slate-600 italic">No upcoming exams.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-dark p-8 rounded-3xl border border-white/5 h-full">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Institutional Notices</h2>
                            <button className="text-sm text-indigo-400 font-semibold hover:text-indigo-300 transition">History</button>
                        </div>
                        <div className="space-y-6">
                            {notifications.length > 0 ? notifications.slice(0, 3).map((n: any) => (
                                <div key={n._id} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-400 transition">{n.title}</h4>
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                                        {n.message}
                                    </p>
                                </div>
                            )) : (
                                <div className="py-10 text-center text-slate-600 italic">No recent announcements.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
