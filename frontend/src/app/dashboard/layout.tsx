"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../utils/api';
import { disconnectSocket, initSocket } from '../utils/socket';
import { ThemeToggle } from '@/components/ThemeToggle';
import { normalizeRole } from '@/hooks/usePermission';
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
    Layers,
    Search,
    HelpCircle,
} from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();

    // Read synchronously so the first render already has user data —
    // this prevents the logo/sidebar from going blank on refresh.
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);
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
        setMounted(true);
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(userStr);
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }
        if (!parsedUser || typeof parsedUser !== 'object') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }
        const userData = { ...parsedUser, role: normalizeRole(parsedUser.role) };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthorized(true);

        fetchUnreadCount();

        const handleTenantUpdate = (e: CustomEvent) => {
            setTenant((prev: any) => ({
                ...prev,
                name: e.detail.name,
                logoUrl: e.detail.logoUrl  // flat field, not nested under config
            }));
        };
        window.addEventListener('tenant-updated', handleTenantUpdate as EventListener);

        api.get('/tenants/me').then(res => {
            const tenantData = res.data.data;
            setTenant(tenantData);

            if (tenantData?._id) {
                const socket = initSocket(tenantData._id);
                if (socket) {
                    socket.on('notification-received', () => {
                        fetchUnreadCount();
                    });
                }
            }
        }).catch(() => { });

        return () => {
            window.removeEventListener('tenant-updated', handleTenantUpdate as EventListener);
            disconnectSocket();
        };
    }, [router]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (!mounted || !isAuthorized || !user) return (
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // Get current page name from pathname
    const getPageTitle = () => {
        const segments = pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (!last || last === 'dashboard') return 'Dashboard';
        return last
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    };

    const getNavItems = () => {
        const common: any[] = [];

        if (user.role === 'school-admin' || user.role === 'receptionist') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'School Grades', href: '/dashboard/school-grades', icon: <Layers className="w-4 h-4" /> },
                { name: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-4 h-4" /> },
                { name: 'Teachers', href: '/dashboard/teachers', icon: <Users className="w-4 h-4" /> },
                { name: 'Classes', href: '/dashboard/classes', icon: <Building2 className="w-4 h-4" /> },
                { name: 'Subjects', href: '/dashboard/subjects', icon: <BookOpen className="w-4 h-4" /> },
                { name: 'Subject Allocation', href: '/dashboard/subject-allocation', icon: <Layers className="w-4 h-4" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-4 h-4" /> },
                { name: 'Grades', href: '/dashboard/grades', icon: <BarChart3 className="w-4 h-4" /> },
                { name: 'Grade Entry', href: '/dashboard/grade-entry', icon: <FileText className="w-4 h-4" /> },
                { name: 'Fees', href: '/dashboard/finance', icon: <DollarSign className="w-4 h-4" /> },
                { name: 'Fee & Payment Hub', href: '/dashboard/fee-hub', icon: <DollarSign className="w-4 h-4" /> },
                { name: 'Invoice Generator', href: '/dashboard/fee-generator', icon: <FileText className="w-4 h-4" /> },
                { name: 'Payroll', href: '/dashboard/payroll', icon: <Banknote className="w-4 h-4" /> },
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-4 h-4" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-4 h-4" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-4 h-4" /> },
                { name: 'Exam Results', href: '/dashboard/exam-results', icon: <TrendingUp className="w-4 h-4" /> },
                { name: 'Promote Students', href: '/dashboard/students/promote', icon: <ArrowUpCircle className="w-4 h-4" /> },
                { name: 'Human Resources', href: '/dashboard/hr', icon: <Users2 className="w-4 h-4" /> },
                { name: 'Library', href: '/dashboard/materials', icon: <BookCopy className="w-4 h-4" /> },
                { name: 'Inventory', href: '/dashboard/inventory', icon: <Package className="w-4 h-4" /> },
                { name: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-4 h-4" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-4 h-4" /> },
                { name: 'Logs & Security', href: '/dashboard/logs', icon: <ShieldAlert className="w-4 h-4" /> },
                { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
            );
        }

        if (user.role === 'super-admin') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Contact Messages', href: '/dashboard/contact-messages', icon: <MessageSquare className="w-4 h-4" /> },
                { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
            );
        }

        if (user.role === 'teacher') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'Students', href: '/dashboard/students', icon: <GraduationCap className="w-4 h-4" /> },
                { name: 'Classes', href: '/dashboard/classes', icon: <Building2 className="w-4 h-4" /> },
                { name: 'Subjects', href: '/dashboard/subjects', icon: <BookOpen className="w-4 h-4" /> },
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-4 h-4" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-4 h-4" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-4 h-4" /> },
                { name: 'Exam Results', href: '/dashboard/exam-results', icon: <TrendingUp className="w-4 h-4" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-4 h-4" /> },
                { name: 'Grades', href: '/dashboard/grades', icon: <BarChart3 className="w-4 h-4" /> },
                { name: 'Materials', href: '/dashboard/materials', icon: <FolderOpen className="w-4 h-4" /> },
                { name: 'Communication', href: '/dashboard/communication', icon: <MessageSquare className="w-4 h-4" /> },
                { name: 'Payslips', href: '/dashboard/payslips', icon: <Receipt className="w-4 h-4" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-4 h-4" /> },
                { name: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-4 h-4" /> },
            );
        }

        if (user.role === 'accountant') {
            common.push({ name: 'Fees & Finance', href: '/dashboard/finance', icon: <DollarSign className="w-4 h-4" /> });
        }

        if (user.role === 'student' || user.role === 'parent') {
            common.push(
                { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                { name: 'My Profile', href: '/dashboard/profile', icon: <Users className="w-4 h-4" /> },
                { name: 'Timetable', href: '/dashboard/timetable', icon: <CalendarDays className="w-4 h-4" /> },
                { name: 'Attendance', href: '/dashboard/attendance', icon: <CalendarCheck className="w-4 h-4" /> },
                { name: 'Assignments', href: '/dashboard/assignments', icon: <FileText className="w-4 h-4" /> },
                { name: 'Exams', href: '/dashboard/exams', icon: <FileText className="w-4 h-4" /> },
                { name: 'My Grades', href: '/dashboard/grades', icon: <TrendingUp className="w-4 h-4" /> },
                { name: 'Certificates', href: '/dashboard/certificates', icon: <FileBadge className="w-4 h-4" /> },
                { name: 'Materials', href: '/dashboard/materials', icon: <FolderOpen className="w-4 h-4" /> },
                { name: 'Fees', href: '/dashboard/student-finance', icon: <DollarSign className="w-4 h-4" /> },
            );
        }

        common.push(
            { name: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="w-4 h-4" /> },
            { name: 'About School', href: '/dashboard/about', icon: <Info className="w-4 h-4" /> },
        );

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
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-60 bg-slate-900 dark:bg-slate-950 flex flex-col z-50 shadow-xl border-r border-white/5
                transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-full
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Sidebar Header — Logo banner + school name */}
                <div className="flex flex-col items-center px-4 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center justify-between w-full mb-3">
                        <div className="flex-1" />
                        <button
                            className="lg:hidden p-1 text-white/50 hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Logo */}
                    <Link href="/dashboard" className="flex flex-col items-center gap-2 w-full">
                        <div className="w-full rounded-xl overflow-hidden border border-white/15 bg-white" style={{aspectRatio: '3/1'}}>
                            {tenant?.logoUrl ? (
                                <img
                                    src={tenant.logoUrl}
                                    alt="School Logo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-600">
                                    <span className="text-white font-semibold text-2xl tracking-tight">
                                        {tenant?.name?.charAt(0) || 'S'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* School name + subtitle */}
                        <div className="text-center mt-1">
                            <p className="text-white font-semibold text-sm leading-tight">
                                {tenant?.name || 'School Registry'}
                            </p>
                            {tenant?.config?.mission && (
                                <p className="text-white/50 text-[10px] mt-0.5 leading-tight line-clamp-1">
                                    {tenant.config.mission}
                                </p>
                            )}
                           
                        </div>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm ${
                                    isActive
                                        ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/25'
                                        : 'text-white/70 hover:text-white hover:bg-white/8'
                                }`}
                            >
                                <span className={`${isActive ? 'text-white' : 'text-white/45 group-hover:text-white/80'} transition-colors`}>
                                    {item.icon}
                                </span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="px-3 py-3 border-t border-white/10">
                    <div className="flex items-center gap-2 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-200 font-semibold text-sm shrink-0">
                            {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-[10px] text-white/40 capitalize truncate">{user.role.replace('-', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-slate-900 sticky top-0 z-30 gap-3">
                    {/* Left: hamburger + page title */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base font-bold text-slate-800 dark:text-white">
                            {getPageTitle()}
                        </h1>
                    </div>

                    {/* Center: Search */}
                    <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search students, records, or files..."
                            className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none flex-1 min-w-0"
                        />
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Notifications */}
                        <Link
                            href="/dashboard/notifications"
                            className="relative w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* Help */}
                        <Link href="/dashboard/about" aria-label="Help and system information" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
                            <HelpCircle className="w-4 h-4" />
                        </Link>

                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

                        {/* Academic Year */}
                        {tenant?.academicYear && (
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Academic Year</span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{tenant.academicYear}</span>
                            </div>
                        )}

                        <ThemeToggle />
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}


