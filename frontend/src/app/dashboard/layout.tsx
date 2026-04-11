"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../utils/api';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    Building2,
    BookOpen,
    CalendarCheck,
    BarChart3,
    DollarSign,
    Banknote,
    CalendarDays,
    FileText,
    TrendingUp,
    ArrowUpCircle,
    Users2,
    BookCopy,
    Package,
    FileBadge,
    ShieldAlert,
    Settings,
    Bell,
    LogOut,
    FolderOpen,
    MessageSquare,
    Receipt,
    Info,
    Menu,
    X,
    Layers
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/notifications/unread/count');
            setUnreadCount(data.count);
        } catch (err) {
            console.error("Failed to fetch unread count");
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        const userData = JSON.parse(userStr);
        setUser(userData);
        setIsAuthorized(true);

        // Fetch unread count
        fetchUnreadCount();

        // Fetch Branding
        api.get('/tenants/me').then(res => {
            const tenantData = res.data.data;
            setTenant(tenantData);

            // Initialize Socket
            if (tenantData?._id) {
                const { initSocket } = require('../utils/socket');
                const socket = initSocket(tenantData._id);

                // Listen for new notifications
                if (socket) {
                    socket.on('notification-received', () => {
                        fetchUnreadCount();
                    });
                }
            }
        }).catch(() => { });

        return () => {
            const { disconnectSocket } = require('../utils/socket');
            disconnectSocket();
        };
    }, [router]);

    // Close sidebar on route change
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (!isAuthorized || !user) return null;

    // Role-based navigation
    const getNavItems = () => {
        const common: any[] = [];

        if (user.role === 'school-admin' || user.role === 'receptionist') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { name: 'School Grades', href: '/dashboard/school-grades', icon: <Layers className="w-5 h-5 text-teal-400" /> },
                { name: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-5 h-5" /> },
                { name: 'Teachers', href: '/dashboard/teachers', icon: <Users className="w-5 h-5" /> },
                { name: 'Classes', href: '/dashboard/classes', icon: <Building2 className="w-5 h-5" /> },
                { name: 'Subjects', href: '/dashboard/subjects', icon: <BookOpen className="w-5 h-5" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
                { name: 'Grades', href: '/dashboard/grades', icon: <BarChart3 className="w-5 h-5" /> },
                { name: 'Fees', href: '/dashboard/finance', icon: <DollarSign className="w-5 h-5" /> },
                { name: 'Payroll', href: '/dashboard/payroll', icon: <Banknote className="w-5 h-5" /> },
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-5 h-5" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-5 h-5" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-5 h-5" /> },
                { name: 'Exam Results', href: '/dashboard/exam-results', icon: <TrendingUp className="w-5 h-5" /> },
                { name: 'Promote Students', href: '/dashboard/students/promote', icon: <ArrowUpCircle className="w-5 h-5" /> },
                // Extra Modules
                { name: 'Human Resources', href: '/dashboard/hr', icon: <Users2 className="w-5 h-5" /> },
                { name: 'Library', href: '/dashboard/library', icon: <BookCopy className="w-5 h-5" /> },
                { name: 'Inventory', href: '/dashboard/inventory', icon: <Package className="w-5 h-5" /> },
                { name: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-5 h-5" /> },
                { name: 'Logs & Security', href: '/dashboard/logs', icon: <ShieldAlert className="w-5 h-5" /> },
                { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
            );
        }

        // Super-admin specific items
        if (user.role === 'super-admin') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { name: 'Contact Messages', href: '/dashboard/contact-messages', icon: <MessageSquare className="w-5 h-5" /> },
                { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
            );
        }

        if (user.role === 'teacher') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { name: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-5 h-5" /> },
                { name: 'Classes', href: '/dashboard/classes', icon: <Building2 className="w-5 h-5" /> },
                { name: 'Subjects', href: '/dashboard/subjects', icon: <BookOpen className="w-5 h-5" /> },
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-5 h-5" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-5 h-5" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-5 h-5" /> },
                { name: 'Exam Results', href: '/dashboard/exam-results', icon: <TrendingUp className="w-5 h-5" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
                { name: 'Grades', href: '/dashboard/grades', icon: <BarChart3 className="w-5 h-5" /> },
                { name: 'Materials', href: '/dashboard/materials', icon: <FolderOpen className="w-5 h-5" /> },
                { name: 'Communication', href: '/dashboard/communication', icon: <MessageSquare className="w-5 h-5" /> },
                { name: 'Payslips', href: '/dashboard/payslips', icon: <Receipt className="w-5 h-5" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-5 h-5" /> },
                { name: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5" /> },
            );
        }

        if (['school-admin', 'accountant'].includes(user.role)) {
            // Already handled in school-admin block mostly, but for accountant:
            if (user.role === 'accountant') {
                common.push({ name: 'Fees & Finance', href: '/dashboard/finance', icon: <DollarSign className="w-5 h-5" /> });
            }
        }

        if (user.role === 'student' || user.role === 'parent') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
                { name: 'My Profile', href: '/dashboard/profile', icon: <Users className="w-5 h-5" /> }, // Profile
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-5 h-5" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-5 h-5" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-5 h-5" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-5 h-5" /> },
                { name: 'My Grades', href: '/dashboard/grades', icon: <TrendingUp className="w-5 h-5" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-5 h-5" /> },
                { name: 'Materials', href: '/dashboard/materials', icon: <FolderOpen className="w-5 h-5" /> },
                { name: 'Fees', href: '/dashboard/student-finance', icon: <DollarSign className="w-5 h-5" /> },
            );
        }

        common.push({ name: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="w-5 h-5" /> });


        common.push({ name: 'About School', href: '/dashboard/about', icon: <Info className="w-5 h-5" /> });

        // Deduplicate logic just in case
        const unique: any[] = [];
        const seen = new Set();
        for (const item of common) {
            if (!seen.has(item.href)) {
                seen.add(item.href);
                unique.push(item);
            }
        }
        return unique;
    };

    const navItems = getNavItems();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 shadow-xl
                transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-full lg:shadow-sm
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <Link href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden shrink-0 border border-white/10">
                            {tenant?.config?.logoUrl ? (
                                <img src={tenant.config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-white font-serif italic text-lg">{tenant?.name?.charAt(0) || 'S'}</span>
                            )}
                        </div>
                        <span className="tracking-tight truncate">{tenant?.name || 'SchoolOS'}</span>
                    </Link>
                    <button
                        className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto mt-2 custom-scrollbar scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-medium'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                            >
                                <span className={`transition-colors duration-200 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                    {item.icon}
                                </span>
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                            {user.firstName.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 capitalize truncate">{user.role.replace('-', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-200 font-medium text-sm"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="text-slate-500 dark:text-slate-400 text-sm font-medium hidden sm:block">
                            Welcome back, <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{user.firstName}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <Link href="/dashboard/notifications" className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors relative">
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
