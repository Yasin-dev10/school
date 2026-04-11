"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../utils/api';
import {
    User,
    Calendar,
    Mail,
    Phone,
    MapPin,
    GraduationCap,
    BookOpen,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    DollarSign,
    Bell,
    School,
    BarChart3,
    CalendarDays,
    Users,
    ArrowRight
} from 'lucide-react';

export default function StudentPortalPage() {
    const [user, setUser] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
            fetchStudentData(userData._id);
        }
    }, []);

    const fetchStudentData = async (studentId: string) => {
        try {
            const [profileRes, attendanceRes, gradesRes, feesRes, timetableRes] = await Promise.all([
                api.get(`/students/${studentId}`),
                api.get('/attendance/my'),
                api.get('/exams/student-grades'),
                api.get(`/fees/invoices?studentId=${studentId}`),
                api.get('/timetable/student/me')
            ]);

            setStudentData({
                profile: profileRes.data.data,
                attendance: attendanceRes.data.data,
                grades: gradesRes.data.data,
                fees: feesRes.data.data,
                timetable: timetableRes.data.data
            });
        } catch (error) {
            console.error('Error fetching student data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const profile = studentData?.profile || {};
    const attendance = studentData?.attendance || {};
    const grades = studentData?.grades || {};
    const fees = studentData?.fees || [];
    const timetable = studentData?.timetable || [];

    // Calculate attendance percentage
    const attendanceRecords = attendance.records || [];
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter((a: any) => a.status === 'present').length;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Calculate pending fees
    const pendingFees = fees.filter((f: any) => f.status !== 'paid').reduce((sum: number, f: any) => sum + (f.totalAmount - f.paidAmount), 0);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-10">
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    Student Portal
                </h1>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                    Welcome back, <span className="text-indigo-600 dark:text-indigo-400 font-bold">{user?.firstName}</span>. Manage your academic journey.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: 'Attendance Rate', 
                        value: `${attendancePercent}%`, 
                        icon: <CheckCircle2 className="w-6 h-6" />, 
                        color: attendancePercent >= 75 ? 'text-green-400' : 'text-red-400', 
                        bg: attendancePercent >= 75 ? 'bg-green-400/10' : 'bg-red-400/10' 
                    },
                    { 
                        label: 'Current GPA', 
                        value: grades.cumulativeGpa || 'N/A', 
                        icon: <TrendingUp className="w-6 h-6" />, 
                        color: 'text-blue-400', 
                        bg: 'bg-blue-400/10' 
                    },
                    { 
                        label: 'Pending Fees', 
                        value: `$${pendingFees.toLocaleString()}`, 
                        icon: <DollarSign className="w-6 h-6" />, 
                        color: pendingFees > 0 ? 'text-red-400' : 'text-green-400', 
                        bg: pendingFees > 0 ? 'bg-red-400/10' : 'bg-green-400/10' 
                    },
                    { 
                        label: 'Today\'s Classes', 
                        value: timetable.filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())).length, 
                        icon: <School className="w-6 h-6" />, 
                        color: 'text-purple-400', 
                        bg: 'bg-purple-400/10' 
                    },
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

            {/* Student Portal Navigation */}
            <div className="glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <span>Academic Services</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        {
                            title: 'Personal Information',
                            description: 'View and update your profile details',
                            icon: <User className="w-8 h-8" />,
                            href: '/dashboard/profile',
                            color: 'bg-indigo-500',
                            stats: `Class ${profile.profile?.class || 'N/A'}`
                        },
                        {
                            title: 'Attendance Records',
                            description: 'Check your attendance history and statistics',
                            icon: <Calendar className="w-8 h-8" />,
                            href: '/dashboard/attendance',
                            color: 'bg-green-500',
                            stats: `${attendancePercent}% Present`
                        },
                        {
                            title: 'Academic Grades',
                            description: 'View your grades and academic performance',
                            icon: <BarChart3 className="w-8 h-8" />,
                            href: '/dashboard/grades',
                            color: 'bg-blue-500',
                            stats: `GPA: ${grades.cumulativeGpa || 'N/A'}`
                        },
                        {
                            title: 'Progress Reports',
                            description: 'Access detailed academic reports and analytics',
                            icon: <FileText className="w-8 h-8" />,
                            href: '/dashboard/reports',
                            color: 'bg-purple-500',
                            stats: 'View Reports'
                        },
                        {
                            title: 'Fee Management',
                            description: 'Track and manage your fee payments',
                            icon: <DollarSign className="w-8 h-8" />,
                            href: '/dashboard/finance',
                            color: 'bg-orange-500',
                            stats: pendingFees > 0 ? `$${pendingFees} Due` : 'Up to Date'
                        },
                        {
                            title: 'Class Timetable',
                            description: 'View your weekly class schedule',
                            icon: <CalendarDays className="w-8 h-8" />,
                            href: '/dashboard/timetable',
                            color: 'bg-rose-500',
                            stats: `${timetable.length} Classes/Week`
                        },
                        {
                            title: 'Online Examinations',
                            description: 'Take online exams and view results',
                            icon: <School className="w-8 h-8" />,
                            href: '/dashboard/exams',
                            color: 'bg-cyan-500',
                            stats: 'Take Exams'
                        },
                        {
                            title: 'Notifications',
                            description: 'View institutional announcements and updates',
                            icon: <Bell className="w-8 h-8" />,
                            href: '/dashboard/notifications',
                            color: 'bg-amber-500',
                            stats: 'Stay Updated'
                        }
                    ].map((service, i) => (
                        <Link key={i} href={service.href} className="group">
                            <div className="glass dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 shadow-sm h-full">
                                <div className={`${service.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                                    {service.icon}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {service.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                    {service.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
                                        {service.stats}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Quick Information Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <User className="w-5 h-5" />
                        </div>
                        <span>Personal Information</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Full Name</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.firstName} {profile.lastName}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Email</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.email}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Phone</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.phone || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Class</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.profile?.class} - {profile.profile?.section}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Date of Birth</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.profile?.dateOfBirth ? new Date(profile.profile.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Address</p>
                                    <p className="text-slate-900 dark:text-white font-semibold">{profile.profile?.address || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span>Today's Schedule</span>
                    </h2>
                    
                    <div className="space-y-4">
                        {timetable
                            .filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
                            .slice(0, 4)
                            .map((slot: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <div className="text-center min-w-[60px]">
                                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{slot.startTime}</p>
                                        <p className="text-[10px] text-slate-500">{slot.endTime}</p>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{slot.subject?.name}</h4>
                                        <p className="text-xs text-slate-500">Room {slot.room || 'TBA'}</p>
                                    </div>
                                </div>
                            ))}
                        {timetable.filter((t: any) => t.day === new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())).length === 0 && (
                            <div className="text-center py-8 text-slate-500 italic">No classes today!</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}