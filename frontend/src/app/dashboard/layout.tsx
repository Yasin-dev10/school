"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '../utils/api';
import { disconnectSocket, initSocket } from '../utils/socket';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { AccessibilityControls } from '@/components/AccessibilityControls';
import { useLanguage } from '@/contexts/LanguageContext';
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
    Grid3x3,
    ChevronDown,
    ClipboardList,
    Wallet,
    CirclePlay,
    BriefcaseBusiness,
    // Bot,
    Trophy,
    GitBranch,
} from 'lucide-react';

type NavItem = {
    name: string;
    href: string;
    icon: ReactNode;
};

type NavGroup = {
    id: string;
    label: string;
    groupIcon: ReactNode;
    items: NavItem[];
};

const icon = (node: ReactNode) => node;

function isItemActive(pathname: string, href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
}

function groupContainsActive(pathname: string, group: NavGroup) {
    return group.items.some((item) => isItemActive(pathname, item.href));
}

const ROLE_ROUTES: Record<string, string[]> = {
    student: [
        '/dashboard/student', '/dashboard/profile', '/dashboard/ai-assistant',
        '/dashboard/timetable', '/dashboard/calendar', '/dashboard/attendance',
        '/dashboard/assignments', '/dashboard/online-learning', '/dashboard/exams',
        '/dashboard/grades', '/dashboard/materials', '/dashboard/communication',
        '/dashboard/student-finance', '/dashboard/certificates',
        '/dashboard/notifications', '/dashboard/about', '/dashboard/help',
    ],
    teacher: [
        '/dashboard', '/dashboard/ai-assistant', '/dashboard/students',
        '/dashboard/classes', '/dashboard/subjects', '/dashboard/timetable',
        '/dashboard/calendar', '/dashboard/attendance', '/dashboard/assignments',
        '/dashboard/online-learning', '/dashboard/materials', '/dashboard/exams',
        '/dashboard/grade-entry', '/dashboard/multi-marks', '/dashboard/exam-results',
        '/dashboard/combined-results', '/dashboard/top-students', '/dashboard/grades',
        '/dashboard/communication', '/dashboard/payslips', '/dashboard/certificates',
        '/dashboard/reports', '/dashboard/notifications', '/dashboard/about',
        '/dashboard/help', '/dashboard/profile',
    ],
};

function roleHome(role: string) {
    return role === 'student' ? '/dashboard/student' : '/dashboard';
}

function canOpenDashboardRoute(role: string, pathname: string) {
    const allowed = ROLE_ROUTES[role];
    if (!allowed) return true;
    return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

const MODULE_ROUTE_PREFIXES: Array<[string, string]> = [
    ['/dashboard/students', 'students'], ['/dashboard/teachers', 'teachers'],
    ['/dashboard/classes', 'classes'], ['/dashboard/school-grades', 'classes'],
    ['/dashboard/subjects', 'subjects'], ['/dashboard/subject-allocation', 'subjects'],
    ['/dashboard/timetable', 'timetable'], ['/dashboard/calendar', 'calendar'],
    ['/dashboard/attendance', 'attendance'], ['/dashboard/assignments', 'learning'],
    ['/dashboard/online-learning', 'learning'], ['/dashboard/materials', 'learning'],
    ['/dashboard/exams', 'exams'], ['/dashboard/grade-entry', 'exams'],
    ['/dashboard/multi-marks', 'exams'], ['/dashboard/exam-results', 'exams'],
    ['/dashboard/combined-results', 'exams'], ['/dashboard/top-students', 'exams'],
    ['/dashboard/grades', 'exams'], ['/dashboard/finance', 'finance'],
    ['/dashboard/fee-hub', 'finance'], ['/dashboard/fee-generator', 'finance'],
    ['/dashboard/student-finance', 'finance'], ['/dashboard/payroll', 'payroll'],
    ['/dashboard/payslips', 'payroll'], ['/dashboard/inventory', 'inventory'],
    ['/dashboard/certificates', 'certificates'], ['/dashboard/reports', 'reports'],
    ['/dashboard/analytics', 'reports'], ['/dashboard/communication', 'communication'],
    ['/dashboard/notifications', 'communication'], ['/dashboard/alumni', 'alumni'],
    ['/dashboard/customization', 'customization'], ['/dashboard/logs', 'settings'],
    ['/dashboard/settings', 'settings'], ['/dashboard/help', 'support'],
];

function moduleForRoute(pathname: string) {
    return MODULE_ROUTE_PREFIXES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { translate: t } = useLanguage();

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [mounted, setMounted] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/notifications/unread/count');
            setUnreadCount(data.count);
        } catch {
            // The badge is supplementary UI. Keep the last known value when the
            // API is temporarily unavailable instead of triggering Next's error
            // overlay for an otherwise usable dashboard.
        }
    };

    useEffect(() => {
        setMounted(true);
        const userStr = localStorage.getItem('user');

        if (!userStr) {
            router.push('/login');
            return;
        }

        let parsedUser;
        try {
            parsedUser = JSON.parse(userStr);
        } catch {
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }
        if (!parsedUser || typeof parsedUser !== 'object') {
            localStorage.removeItem('user');
            router.replace('/login');
            return;
        }
        api.get('/auth/me').then(({ data }) => {
            const current = data.data;
            const userData = { ...current, _id: current.id, role: normalizeRole(current.role) };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            if (!canOpenDashboardRoute(userData.role, window.location.pathname)) {
                router.replace(roleHome(userData.role));
                return;
            }
            setIsAuthorized(true);
        }).catch(() => {
            localStorage.removeItem('user');
            router.replace('/login');
        });

        fetchUnreadCount();

        const handleTenantUpdate = (e: CustomEvent) => {
            setTenant((prev: any) => ({
                ...prev,
                ...(e.detail.name !== undefined && { name: e.detail.name }),
                ...(e.detail.logoUrl !== undefined && { logoUrl: e.detail.logoUrl }),
                ...(e.detail.academicYear !== undefined && { academicYear: e.detail.academicYear }),
            }));
        };
        window.addEventListener('tenant-updated', handleTenantUpdate as EventListener);

        api.get('/tenants/me').then((res) => {
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
        }).catch(() => {});

        return () => {
            window.removeEventListener('tenant-updated', handleTenantUpdate as EventListener);
            disconnectSocket();
        };
    }, [router]);

    useEffect(() => {
        if (!user) return;
        if (!canOpenDashboardRoute(user.role, pathname)) {
            setIsAuthorized(false);
            router.replace(roleHome(user.role));
        } else {
            setIsAuthorized(true);
        }
    }, [pathname, router, user]);

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleKeyboard = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isSidebarOpen) {
                setIsSidebarOpen(false);
                menuButtonRef.current?.focus();
            }
            if (event.altKey && event.key.toLowerCase() === 'm') {
                event.preventDefault();
                setIsSidebarOpen(true);
                window.setTimeout(() => document.getElementById('dashboard-navigation')?.focus(), 0);
            }
        };
        document.addEventListener('keydown', handleKeyboard);
        return () => document.removeEventListener('keydown', handleKeyboard);
    }, [isSidebarOpen]);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('user');
        router.push('/login');
    };

    const getPageTitle = () => {
        const segments = pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (!last || last === 'dashboard') return t('Dashboard');
        const title = last
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        return t(title);
    };

    const navGroups = useMemo((): NavGroup[] => {
        if (!user) return [];

        const groups: NavGroup[] = [];
        const push = (group: NavGroup) => {
            if (group.items.length) groups.push(group);
        };

        if (user.role === 'school-admin' || user.role === 'receptionist') {
            push({
                id: 'overview',
                label: 'Overview',
                groupIcon: <LayoutDashboard className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
                    // { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'people',
                label: 'Academic Management',
                groupIcon: <Users className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Students', href: '/dashboard/students', icon: icon(<GraduationCap className="w-4 h-4" />) },
                    { name: 'Teachers', href: '/dashboard/teachers', icon: icon(<Users className="w-4 h-4" />) },
                    { name: 'Classes', href: '/dashboard/classes', icon: icon(<Building2 className="w-4 h-4" />) },
                    { name: 'School Grades', href: '/dashboard/school-grades', icon: icon(<Layers className="w-4 h-4" />) },
                    { name: 'Subjects', href: '/dashboard/subjects', icon: icon(<BookOpen className="w-4 h-4" />) },
                    { name: 'Subject Allocation', href: '/dashboard/subject-allocation', icon: icon(<ClipboardList className="w-4 h-4" />) },
                    { name: 'Promote Students', href: '/dashboard/students/promote', icon: icon(<ArrowUpCircle className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'teaching',
                label: 'Teaching',
                groupIcon: <BookOpen className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
                    { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) },
                    { name: 'Library', href: '/dashboard/materials', icon: icon(<BookCopy className="w-4 h-4" />) },
                    { name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'exams',
                label: 'Exams & Results',
                groupIcon: <ClipboardList className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Exams', href: '/dashboard/exams', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Grade Entry', href: '/dashboard/grade-entry', icon: icon(<ClipboardList className="w-4 h-4" />) },
                    { name: 'Multi-Subject Marks', href: '/dashboard/multi-marks', icon: icon(<Grid3x3 className="w-4 h-4" />) },
                    { name: 'Exam Results', href: '/dashboard/exam-results', icon: icon(<TrendingUp className="w-4 h-4" />) },
                    { name: 'Combined Results', href: '/dashboard/combined-results', icon: icon(<Layers className="w-4 h-4" />) },
                    { name: 'Top Students', href: '/dashboard/top-students', icon: icon(<Trophy className="w-4 h-4" />) },
                    { name: 'Grades', href: '/dashboard/grades', icon: icon(<BarChart3 className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'finance',
                label: 'Finance',
                groupIcon: <DollarSign className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees', href: '/dashboard/finance', icon: icon(<DollarSign className="w-4 h-4" />) },
                    { name: 'Fee & Payment Hub', href: '/dashboard/fee-hub', icon: icon(<Wallet className="w-4 h-4" />) },
                    { name: 'Invoice Generator', href: '/dashboard/fee-generator', icon: icon(<Receipt className="w-4 h-4" />) },
                    { name: 'Payroll', href: '/dashboard/payroll', icon: icon(<Banknote className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'operations',
                label: 'Operations',
                groupIcon: <Package className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Human Resources', href: '/dashboard/hr', icon: icon(<Users2 className="w-4 h-4" />) },
                    { name: 'Alumni', href: '/dashboard/alumni', icon: icon(<BriefcaseBusiness className="w-4 h-4" />) },
                    { name: 'Inventory', href: '/dashboard/inventory', icon: icon(<Package className="w-4 h-4" />) },
                    { name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) },
                    { name: 'Reports', href: '/dashboard/reports', icon: icon(<BarChart3 className="w-4 h-4" />) },
                    { name: 'Advanced Analytics', href: '/dashboard/analytics', icon: icon(<TrendingUp className="w-4 h-4" />) },
                    // { name: 'Branches & Workflows', href: '/dashboard/customization', icon: icon(<GitBranch className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'system',
                label: 'System',
                groupIcon: <Settings className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Logs & Security', href: '/dashboard/logs', icon: icon(<ShieldAlert className="w-4 h-4" />) },
                    { name: 'Settings', href: '/dashboard/settings', icon: icon(<Settings className="w-4 h-4" />) },
                    { name: 'Notifications', href: '/dashboard/notifications', icon: icon(<Bell className="w-4 h-4" />) },
                    { name: 'About School', href: '/dashboard/about', icon: icon(<Info className="w-4 h-4" />) },
                ],
            });
        }

        if (user.role === 'super-admin') {
            push({
                id: 'overview',
                label: 'Overview',
                groupIcon: <LayoutDashboard className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
                    { name: 'Contact Messages', href: '/dashboard/contact-messages', icon: icon(<MessageSquare className="w-4 h-4" />) },
                    { name: 'Settings', href: '/dashboard/settings', icon: icon(<Settings className="w-4 h-4" />) },
                    { name: 'Notifications', href: '/dashboard/notifications', icon: icon(<Bell className="w-4 h-4" />) },
                    { name: 'About School', href: '/dashboard/about', icon: icon(<Info className="w-4 h-4" />) },
                ],
            });
        }

        if (user.role === 'teacher') {
            push({
                id: 'overview',
                label: 'Overview',
                groupIcon: <LayoutDashboard className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Dashboard', href: '/dashboard', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
                    // { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'classes',
                label: 'My Classes',
                groupIcon: <Building2 className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Students', href: '/dashboard/students', icon: icon(<GraduationCap className="w-4 h-4" />) },
                    { name: 'Classes', href: '/dashboard/classes', icon: icon(<Building2 className="w-4 h-4" />) },
                    { name: 'Subjects', href: '/dashboard/subjects', icon: icon(<BookOpen className="w-4 h-4" />) },
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
                    { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) },
                    { name: 'Materials', href: '/dashboard/materials', icon: icon(<FolderOpen className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'exams',
                label: 'Exams & Results',
                groupIcon: <ClipboardList className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Exams', href: '/dashboard/exams', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Multi-Subject Marks', href: '/dashboard/multi-marks', icon: icon(<Grid3x3 className="w-4 h-4" />) },
                    { name: 'Exam Results', href: '/dashboard/exam-results', icon: icon(<TrendingUp className="w-4 h-4" />) },
                    { name: 'Combined Results', href: '/dashboard/combined-results', icon: icon(<Layers className="w-4 h-4" />) },
                    { name: 'Top Students', href: '/dashboard/top-students', icon: icon(<Trophy className="w-4 h-4" />) },
                    { name: 'Grades', href: '/dashboard/grades', icon: icon(<BarChart3 className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'more',
                label: 'More',
                groupIcon: <Layers className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) },
                    { name: 'Payslips', href: '/dashboard/payslips', icon: icon(<Receipt className="w-4 h-4" />) },
                    { name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) },
                    { name: 'Reports', href: '/dashboard/reports', icon: icon(<BarChart3 className="w-4 h-4" />) },
                    { name: 'Notifications', href: '/dashboard/notifications', icon: icon(<Bell className="w-4 h-4" />) },
                    { name: 'About School', href: '/dashboard/about', icon: icon(<Info className="w-4 h-4" />) },
                ],
            });
        }

        if (user.role === 'accountant') {
            push({
                id: 'finance',
                label: 'Finance',
                groupIcon: <DollarSign className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees & Finance', href: '/dashboard/finance', icon: icon(<DollarSign className="w-4 h-4" />) },
                    { name: 'Notifications', href: '/dashboard/notifications', icon: icon(<Bell className="w-4 h-4" />) },
                    { name: 'About School', href: '/dashboard/about', icon: icon(<Info className="w-4 h-4" />) },
                ],
            });
        }

        if (user.role === 'student' || user.role === 'parent') {
            push({
                id: 'overview',
                label: 'Overview',
                groupIcon: <LayoutDashboard className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Dashboard', href: user.role === 'student' ? '/dashboard/student' : '/dashboard', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
                    { name: 'My Profile', href: '/dashboard/profile', icon: icon(<Users className="w-4 h-4" />) },
                    // { name: 'AI Study Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'academic',
                label: 'Academics',
                groupIcon: <BookOpen className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
                    { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) },
                    { name: 'Exams', href: '/dashboard/exams', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'My Grades', href: '/dashboard/grades', icon: icon(<TrendingUp className="w-4 h-4" />) },
                    { name: 'Materials', href: '/dashboard/materials', icon: icon(<FolderOpen className="w-4 h-4" />) },
                    ...(user.role === 'student' ? [{ name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) }] : []),
                ],
            });
            push({
                id: 'account',
                label: 'Account',
                groupIcon: <Wallet className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees', href: '/dashboard/student-finance', icon: icon(<DollarSign className="w-4 h-4" />) },
                    { name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) },
                    ...(user.role === 'parent' ? [{ name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) }] : []),
                    { name: 'Notifications', href: '/dashboard/notifications', icon: icon(<Bell className="w-4 h-4" />) },
                    { name: 'About School', href: '/dashboard/about', icon: icon(<Info className="w-4 h-4" />) },
                ],
            });
        }

        if (user.role !== 'super-admin') {
            push({
                id: 'help',
                label: 'Help & Feedback',
                groupIcon: <HelpCircle className="w-3.5 h-3.5" />,
                items: [{ name: 'Help & Feedback', href: '/dashboard/help', icon: icon(<HelpCircle className="w-4 h-4" />) }],
            });
        }

        const limitedModules = tenant?.subscriptionAccess?.mode === 'limited'
            ? new Set<string>(tenant.subscriptionAccess.allowedModules || [])
            : null;
        return groups
            .map((group) => ({
                ...group,
                label: t(group.label),
                items: group.items
                    .filter((item) => item.name !== 'Dashboard')
                    .filter((item) => {
                        if (!limitedModules) return true;
                        const itemModule = moduleForRoute(item.href);
                        return !itemModule || limitedModules.has(itemModule);
                    })
                    .map((item) => ({ ...item, name: t(item.name) })),
            }))
            .filter((group) => group.items.length > 0);
    }, [user, tenant, t]);

    const dashboardItem: NavItem = {
        name: t('Dashboard'),
        href: user?.role === 'student' ? '/dashboard/student' : '/dashboard',
        icon: icon(<LayoutDashboard className="w-4 h-4" />),
    };
    const accessMode = tenant?.subscriptionAccess?.mode || tenant?.accessMode || 'full';
    const allowedModules: string[] = tenant?.subscriptionAccess?.allowedModules || tenant?.allowedModules || [];
    const currentModule = moduleForRoute(pathname);
    const currentModuleRestricted = accessMode === 'limited' && Boolean(currentModule) && !allowedModules.includes(currentModule as string);

    // Accordion group menu: keep active group open; others closed by default
    useEffect(() => {
        if (!navGroups.length) return;
        const activeGroup = navGroups.find((g) => groupContainsActive(pathname, g));
        setOpenGroups(() => {
            const next: Record<string, boolean> = {};
            navGroups.forEach((group) => {
                next[group.id] = activeGroup ? group.id === activeGroup.id : group.id === navGroups[0]?.id;
            });
            return next;
        });
    }, [pathname, navGroups]);

    const toggleGroup = (id: string) => {
        setOpenGroups((prev) => {
            const currentlyOpen = !!prev[id];
            const next: Record<string, boolean> = {};
            navGroups.forEach((g) => {
                next[g.id] = false;
            });
            // Accordion: open clicked group, or close if it was already open (unless it has active page)
            const activeInClicked = navGroups.find((g) => g.id === id && groupContainsActive(pathname, g));
            next[id] = currentlyOpen && !activeInClicked ? false : true;
            return next;
        });
    };

    if (!mounted || !isAuthorized || !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <a href="#main-content" className="skip-link">{t('Skip to main content')}</a>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                aria-label="Dashboard navigation"
                className={`
                fixed inset-y-0 left-0 w-[17rem] bg-slate-900 dark:bg-slate-950 flex flex-col z-50 shadow-xl border-r border-white/10
                transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-full
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            >
                <div className="relative px-3.5 py-4 border-b border-white/10">
                    <div className="flex items-start">
                        <Link href="/dashboard" className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-white/5 transition-colors">
                            <div className="h-20 w-full max-w-[13rem] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white shadow-md">
                                {tenant?.logoUrl ? (
                                    <img src={tenant.logoUrl} alt="School Logo" className="h-full w-full object-contain p-1" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
                                        {tenant?.name?.charAt(0) || 'S'}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 max-w-full">
                                <p className="text-base font-bold leading-snug text-white break-words">{tenant?.name || 'School Registry'}</p>
                                <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/50">
                                    {tenant?.academicYear || t('School Management')}
                                </p>
                            </div>
                        </Link>
                        <button
                            type="button"
                            aria-label={t('Close navigation menu')}
                            className="absolute right-2 top-2 lg:hidden rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <nav id="dashboard-navigation" tabIndex={-1} className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <Link
                            href={dashboardItem.href}
                            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] transition-all duration-150 ${
                                isItemActive(pathname, dashboardItem.href)
                                    ? 'bg-indigo-500/90 text-white font-semibold shadow-sm shadow-indigo-950/30'
                                    : 'text-white/70 hover:bg-white/[0.07] hover:text-white'
                            }`}
                        >
                            <span className={isItemActive(pathname, dashboardItem.href) ? 'text-white' : 'text-white/45'}>
                                {dashboardItem.icon}
                            </span>
                            <span className="truncate">{dashboardItem.name}</span>
                        </Link>
                    {navGroups.map((group) => {
                        const isOpen = !!openGroups[group.id];
                        const activeInGroup = groupContainsActive(pathname, group);

                        return (
                            <div
                                key={group.id}
                                className={`rounded-xl overflow-hidden transition-colors ${
                                    activeInGroup || isOpen
                                        ? 'bg-white/[0.05]'
                                        : 'bg-transparent'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={isOpen}
                                    aria-controls={`nav-group-${group.id}`}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl transition-colors ${
                                        activeInGroup
                                            ? 'text-indigo-200'
                                            : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <span
                                        className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                                            activeInGroup
                                                ? 'bg-indigo-500/30 text-indigo-200'
                                                : 'bg-white/5 text-white/45'
                                        }`}
                                    >
                                        {group.groupIcon}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-xs font-bold tracking-wide truncate">
                                            {group.label}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 shrink-0 text-white/35 transition-transform ${
                                            isOpen ? 'rotate-0' : '-rotate-90'
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div id={`nav-group-${group.id}`} className="ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-2 pb-1">
                                        {group.items.map((item) => {
                                            const active = isItemActive(pathname, item.href);
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group text-[13px] ${
                                                        active
                                                            ? 'bg-indigo-500/90 text-white font-semibold shadow-sm shadow-indigo-950/30 before:absolute before:-left-[11px] before:h-5 before:w-0.5 before:rounded-full before:bg-indigo-400'
                                                            : 'text-white/65 hover:text-white hover:bg-white/[0.07]'
                                                    }`}
                                                >
                                                    <span
                                                        className={`${
                                                            active
                                                                ? 'text-white'
                                                                : 'text-white/40 group-hover:text-white/75'
                                                        } transition-colors`}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    <span className="truncate">{item.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {navGroups.length === 0 && (
                        <p className="px-3 py-8 text-center text-xs text-white/35">{t('No menu items found')}</p>
                    )}
                </nav>

                <div className="p-3 border-t border-white/10 bg-black/10">
                    <div className="flex items-center gap-2 rounded-xl px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-200 font-semibold text-sm shrink-0">
                            {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                                {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[10px] text-white/40 capitalize truncate">
                                {user.role.replace('-', ' ')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-white/5 text-white/50 hover:text-rose-300 hover:border-rose-400/20 hover:bg-rose-500/10 transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>{t('Logout')}</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-slate-900 sticky top-0 z-30 gap-3">
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            ref={menuButtonRef}
                            type="button"
                            aria-label="Open navigation menu"
                            aria-expanded={isSidebarOpen}
                            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="text-base font-bold text-slate-800 dark:text-white">
                            {getPageTitle()}
                        </h1>
                    </div>

                    <div className="flex-1 max-w-sm hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder={t('Search students, records, or files...')}
                            className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none flex-1 min-w-0"
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
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

                        <Link
                            href="/dashboard/about"
                            aria-label={t('Help and system information')}
                            className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </Link>

                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

                        {tenant?.academicYear && (
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    {t('Academic Year')}
                                </span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {tenant.academicYear}
                                </span>
                            </div>
                        )}

                        <AccessibilityControls />
                        <LanguageToggle />
                        <ThemeToggle />
                    </div>
                </header>

                <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
                    {tenant?.subscriptionAccess?.showWarning && accessMode !== 'suspended' && (
                        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                            <strong>Digniin lacag-bixin:</strong> Adeegga school-ka wuxuu dhacayaa {tenant.subscriptionValid ? new Date(tenant.subscriptionValid).toLocaleDateString() : 'dhowaan'}.
                            {tenant.subscriptionAccess.overdue && tenant.subscriptionAccess.graceUntil ? ` Grace period-ku wuxuu ku egyahay ${new Date(tenant.subscriptionAccess.graceUntil).toLocaleDateString()}.` : ''}
                        </div>
                    )}
                    {accessMode === 'suspended' ? (
                        <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-red-200 bg-white p-8 text-center shadow-xl dark:border-red-500/30 dark:bg-slate-900">
                            <ShieldAlert className="mx-auto mb-4 h-14 w-14 text-red-500" />
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white">School-ka waa la xiray</h1>
                            <p className="mt-3 text-slate-600 dark:text-slate-300">Mudadii lacag-bixinta ayaa dhammaatay. Fadlan la xiriir Super Admin-ka si adeegga dib loogu furo.</p>
                            {tenant?.subscriptionValid && <p className="mt-3 text-sm font-semibold text-red-600">Taariikhda dhacday: {new Date(tenant.subscriptionValid).toLocaleDateString()}</p>}
                        </div>
                    ) : currentModuleRestricted ? (
                        <div className="mx-auto mt-16 max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl dark:border-amber-500/30 dark:bg-slate-900">
                            <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">Qaybtan lama fasixin</h1>
                            <p className="mt-3 text-slate-600 dark:text-slate-300">School-ku wuxuu hadda ku jiraa Limited Access. La xiriir Super Admin-ka si qaybtan loo furo.</p>
                            <Link href="/dashboard" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Ku noqo Dashboard</Link>
                        </div>
                    ) : children}
                </div>
            </main>
        </div>
    );
}
