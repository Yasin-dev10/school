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
} from 'lucide-react';

type NavItem = {
    name: string;
    href: string;
    icon: ReactNode;
    category?: string;
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
    parent: [
        '/dashboard', '/dashboard/parent', '/dashboard/profile', '/dashboard/grades',
        '/dashboard/student-finance',
        '/dashboard/communication', '/dashboard/notifications', '/dashboard/help',
        '/dashboard/assignments', '/dashboard/materials',
    ],
    'super-admin': ['/super-admin'],
};

function roleHome(role: string) {
    if (role === 'super-admin') return '/super-admin/dashboard';
    return role === 'student' ? '/dashboard/student' : '/dashboard';
}

function canOpenDashboardRoute(role: string, pathname: string) {
    const allowed = ROLE_ROUTES[role];
    if (!allowed) return true;
    return allowed.some((route) => route === '/dashboard'
        ? pathname === route
        : pathname === route || pathname.startsWith(`${route}/`));
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
    const [sidebarWidth, setSidebarWidth] = useState(272);
    const [unreadCount, setUnreadCount] = useState(0);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [pageSearch, setPageSearch] = useState('');
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

    useEffect(() => {
        const savedWidth = Number(localStorage.getItem('dashboard-sidebar-width'));
        if (Number.isFinite(savedWidth) && savedWidth > 0) {
            setSidebarWidth(Math.min(400, Math.max(240, savedWidth)));
        }
    }, []);

    const handleSidebarResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (window.innerWidth < 1024) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        sidebarResizeRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    };

    const handleSidebarResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
        const resize = sidebarResizeRef.current;
        if (!resize) return;
        const nextWidth = Math.min(400, Math.max(240, resize.startWidth + event.clientX - resize.startX));
        setSidebarWidth(nextWidth);
        localStorage.setItem('dashboard-sidebar-width', String(nextWidth));
    };

    const handleSidebarResizeEnd = () => {
        sidebarResizeRef.current = null;
    };

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
                label: 'People & Academics',
                groupIcon: <Users className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Students', href: '/dashboard/students', category: 'People', icon: icon(<GraduationCap className="w-4 h-4" />) },
                    { name: 'Teachers', href: '/dashboard/teachers', category: 'People', icon: icon(<Users className="w-4 h-4" />) },
                    { name: 'Classes', href: '/dashboard/classes', category: 'Academics', icon: icon(<Building2 className="w-4 h-4" />) },
                    { name: 'Grade Levels', href: '/dashboard/school-grades', category: 'Academics', icon: icon(<Layers className="w-4 h-4" />) },
                    { name: 'Subjects', href: '/dashboard/subjects', category: 'Academics', icon: icon(<BookOpen className="w-4 h-4" />) },
                    { name: 'Subject Allocation', href: '/dashboard/subject-allocation', category: 'Academics', icon: icon(<ClipboardList className="w-4 h-4" />) },
                    { name: 'Promote Students', href: '/dashboard/students/promote', category: 'Progression', icon: icon(<ArrowUpCircle className="w-4 h-4" />) },
                ],
            });
            // push({
            //     id: 'learning',
            //     label: 'Teaching & Learning',
            //     groupIcon: <BookOpen className="w-3.5 h-3.5" />,
            //     items: [
            //         { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
            //         { name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) },
            //         { name: 'Library', href: '/dashboard/materials', icon: icon(<BookCopy className="w-4 h-4" />) },
            //         { name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) },
            //     ],
            // });
            push({
                id: 'schedule',
                label: 'Schedule & Attendance',
                groupIcon: <CalendarCheck className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
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
                ],
            });
            push({
                id: 'finance',
                label: 'Finance',
                groupIcon: <DollarSign className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees', href: '/dashboard/finance', icon: icon(<DollarSign className="w-4 h-4" />) },
                    { name: 'Invoice Generator', href: '/dashboard/fee-generator', icon: icon(<Receipt className="w-4 h-4" />) },
                    { name: 'Payroll', href: '/dashboard/payroll', icon: icon(<Banknote className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'operations',
                label: 'Reports & Operations',
                groupIcon: <Package className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Human Resources', href: '/dashboard/hr', icon: icon(<Users2 className="w-4 h-4" />) },
                    { name: 'Alumni', href: '/dashboard/alumni', icon: icon(<BriefcaseBusiness className="w-4 h-4" />) },
                    { name: 'Inventory', href: '/dashboard/inventory', icon: icon(<Package className="w-4 h-4" />) },
                    { name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) },
                    // { name: 'Branches & Workflows', href: '/dashboard/customization', icon: icon(<GitBranch className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'reports',
                label: 'Reports & Analytics',
                groupIcon: <BarChart3 className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Reports', href: '/dashboard/reports', icon: icon(<BarChart3 className="w-4 h-4" />) },
                    { name: 'Advanced Analytics', href: '/dashboard/analytics', icon: icon(<TrendingUp className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'system',
                label: 'System & Information',
                groupIcon: <Settings className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Logs & Security', href: '/dashboard/logs', icon: icon(<ShieldAlert className="w-4 h-4" />) },
                    { name: 'Settings', href: '/dashboard/settings', icon: icon(<Settings className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'information',
                label: 'School Information',
                groupIcon: <Building2 className="w-3.5 h-3.5" />,
                items: [{ name: 'About School', href: '/dashboard/about', icon: icon(<Building2 className="w-4 h-4" />) }],
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
                label: 'Classes & Learning',
                groupIcon: <Building2 className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Students', href: '/dashboard/students', icon: icon(<GraduationCap className="w-4 h-4" />) },
                    { name: 'Classes', href: '/dashboard/classes', icon: icon(<Building2 className="w-4 h-4" />) },
                    { name: 'Subjects', href: '/dashboard/subjects', icon: icon(<BookOpen className="w-4 h-4" />) },
                    { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
                    { name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) },
                    { name: 'Materials', href: '/dashboard/materials', icon: icon(<FolderOpen className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'schedule',
                label: 'Schedule & Attendance',
                groupIcon: <CalendarCheck className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
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
                ],
            });
            push({
                id: 'work',
                label: 'Communication & Records',
                groupIcon: <Layers className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) },
                    { name: 'Payslips', href: '/dashboard/payslips', icon: icon(<Receipt className="w-4 h-4" />) },
                    { name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'reports',
                label: 'Reports & Results',
                groupIcon: <BarChart3 className="w-3.5 h-3.5" />,
                items: [{ name: 'Reports', href: '/dashboard/reports', icon: icon(<BarChart3 className="w-4 h-4" />) }],
            });
        }

        if (user.role === 'accountant') {
            push({
                id: 'finance',
                label: 'Finance',
                groupIcon: <DollarSign className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees & Finance', href: '/dashboard/finance', icon: icon(<DollarSign className="w-4 h-4" />) },
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
                label: 'Learning & Academics',
                groupIcon: <BookOpen className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Assignments', href: '/dashboard/assignments', icon: icon(<FileText className="w-4 h-4" />) },
                    ...(user.role === 'student' ? [{ name: 'Online Learning', href: '/dashboard/online-learning', icon: icon(<CirclePlay className="w-4 h-4" />) }] : []),
                    ...(user.role === 'student' ? [{ name: 'Exams', href: '/dashboard/exams', icon: icon(<FileText className="w-4 h-4" />) }] : []),
                    { name: 'My Grades', href: '/dashboard/grades', icon: icon(<TrendingUp className="w-4 h-4" />) },
                    { name: 'Materials', href: '/dashboard/materials', icon: icon(<FolderOpen className="w-4 h-4" />) },
                    ...(user.role === 'student' ? [{ name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) }] : []),
                ],
            });
            if (user.role === 'student') push({
                id: 'schedule',
                label: 'Schedule & Attendance',
                groupIcon: <CalendarCheck className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Timetable', href: '/dashboard/timetable', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Calendar & Events', href: '/dashboard/calendar', icon: icon(<CalendarDays className="w-4 h-4" />) },
                    { name: 'Attendance', href: '/dashboard/attendance', icon: icon(<CalendarCheck className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'account',
                label: 'Account',
                groupIcon: <Wallet className="w-3.5 h-3.5" />,
                items: [
                    { name: 'Fees', href: '/dashboard/student-finance', icon: icon(<DollarSign className="w-4 h-4" />) },
                    ...(user.role === 'student' ? [{ name: 'Certificates', href: '/dashboard/certificates', icon: icon(<FileBadge className="w-4 h-4" />) }] : []),
                    ...(user.role === 'parent' ? [{ name: 'Communication', href: '/dashboard/communication', icon: icon(<MessageSquare className="w-4 h-4" />) }] : []),
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
        href: roleHome(user?.role || ''),
        icon: icon(<LayoutDashboard className="w-4 h-4" />),
    };
    const searchablePages = [dashboardItem, ...navGroups.flatMap((group) => group.items)];
    const matchingPages = pageSearch.trim()
        ? searchablePages.filter((item) => item.name.toLowerCase().includes(pageSearch.trim().toLowerCase())).slice(0, 7)
        : [];
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
                fixed inset-y-0 left-0 w-[var(--dashboard-sidebar-width)] lg:shrink-0 bg-[#1e3a8a] flex flex-col z-50 shadow-xl border-r border-white/10
                transition-transform duration-300 transform lg:translate-x-0 lg:static lg:h-full
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
                style={{ '--dashboard-sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
            >
                <div className="relative px-3.5 py-4 border-b border-white/10">
                    <div className="flex items-start">
                        <Link href="/dashboard" className="flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-white/5 transition-colors">
                            <div className="h-20 w-full max-w-[13rem] shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white shadow-md">
                                {tenant?.logoUrl ? (
                                    <img src={tenant.logoUrl} alt="School Logo" className="h-full w-full object-contain p-1" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#06b6d4] text-lg font-bold text-white">
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
                                    ? 'bg-cyan-600 text-white font-semibold shadow-sm shadow-blue-950/30'
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
                        const isPeopleGroup = group.id === 'people';

                        return (
                            <div
                                key={group.id}
                                className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                                    isPeopleGroup
                                        ? activeInGroup || isOpen
                                            ? 'bg-gradient-to-br from-cyan-400/[0.12] via-indigo-400/[0.08] to-white/[0.03] ring-1 ring-cyan-200/15 shadow-lg shadow-blue-950/10'
                                            : 'bg-white/[0.025] ring-1 ring-white/[0.06] hover:bg-white/[0.045]'
                                        : activeInGroup || isOpen
                                            ? 'bg-white/[0.05]'
                                            : 'bg-transparent'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={isOpen}
                                    aria-controls={`nav-group-${group.id}`}
                                    className={`w-full flex items-center gap-2.5 text-left transition-all ${
                                        isPeopleGroup
                                            ? 'px-3 py-3 rounded-2xl'
                                            : 'px-2.5 py-2 rounded-xl'
                                    } ${
                                        activeInGroup
                                            ? isPeopleGroup ? 'text-white' : 'text-indigo-200'
                                            : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <span
                                        className={`flex items-center justify-center shrink-0 transition-colors ${
                                            isPeopleGroup ? 'w-10 h-10 rounded-xl' : 'w-7 h-7 rounded-lg'
                                        } ${
                                            activeInGroup
                                                ? isPeopleGroup
                                                    ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-950/30'
                                                    : 'bg-indigo-500/30 text-indigo-200'
                                                : isPeopleGroup
                                                    ? 'bg-white/[0.08] text-cyan-100/80 ring-1 ring-white/10'
                                                    : 'bg-white/5 text-white/45'
                                        }`}
                                    >
                                        {group.groupIcon}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className={`block font-bold tracking-wide truncate ${isPeopleGroup ? 'text-[13px]' : 'text-xs'}`}>
                                            {group.label}
                                        </span>
                                        {isPeopleGroup && <span className="mt-0.5 block text-[10px] font-medium text-white/45">Students, staff & curriculum</span>}
                                    </span>
                                    {isPeopleGroup && <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold tabular-nums text-cyan-100/75">{group.items.length}</span>}
                                    <ChevronDown
                                        className={`w-4 h-4 shrink-0 transition-transform ${isPeopleGroup ? 'text-cyan-100/50' : 'text-white/35'} ${
                                            isOpen ? 'rotate-0' : '-rotate-90'
                                        }`}
                                    />
                                </button>
                                {isOpen && (
                                    <div id={`nav-group-${group.id}`} className={isPeopleGroup ? 'mx-2 mb-2 rounded-xl bg-slate-950/15 p-2' : 'ml-5 mt-0.5 space-y-0.5 border-l border-white/10 pl-2 pb-1'}>
                                        {group.items.map((item, index) => {
                                            const active = isItemActive(pathname, item.href);
                                            return (
                                                <div key={item.href}>
                                                    {isPeopleGroup && (index === 0 || group.items[index - 1].category !== item.category) && (
                                                        <p className={`px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/35 ${index === 0 ? '' : 'pt-2'}`}>
                                                            {item.category}
                                                        </p>
                                                    )}
                                                    <Link
                                                        href={item.href}
                                                        className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-150 group text-[12px] ${
                                                            active
                                                                ? isPeopleGroup
                                                                    ? 'bg-cyan-400/15 text-white font-semibold ring-1 ring-cyan-200/20 shadow-sm shadow-blue-950/20'
                                                                    : 'bg-cyan-600 text-white font-semibold shadow-sm shadow-blue-950/30 before:absolute before:-left-[11px] before:h-5 before:w-0.5 before:rounded-full before:bg-cyan-300'
                                                                : 'text-white/65 hover:text-white hover:bg-white/[0.07]'
                                                        }`}
                                                    >
                                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${active ? 'bg-cyan-300/15 text-cyan-100' : 'bg-white/[0.045] text-white/45 group-hover:bg-white/10 group-hover:text-white/80'}`}>
                                                            {item.icon}
                                                        </span>
                                                        <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                                        {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.9)]" />}
                                                    </Link>
                                                </div>
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
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-300/30 flex items-center justify-center text-cyan-100 font-semibold text-sm shrink-0">
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
                <button
                    type="button"
                    aria-label={t('Resize navigation sidebar')}
                    title={t('Drag to resize sidebar')}
                    className="absolute inset-y-0 right-0 z-10 hidden w-1.5 cursor-col-resize touch-none bg-transparent transition-colors hover:bg-indigo-400/60 active:bg-indigo-400 lg:block"
                    onPointerDown={handleSidebarResizeStart}
                    onPointerMove={handleSidebarResizeMove}
                    onPointerUp={handleSidebarResizeEnd}
                    onPointerCancel={handleSidebarResizeEnd}
                />
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
                        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
                            <Link href={roleHome(user?.role || '')} className="hidden text-slate-500 hover:text-[#1e3a8a] dark:text-slate-400 dark:hover:text-cyan-300 sm:inline">Home</Link>
                            <span aria-hidden="true" className="hidden text-slate-300 dark:text-slate-600 sm:inline">/</span>
                            <h1 className="font-bold text-slate-800 dark:text-white">{getPageTitle()}</h1>
                        </nav>
                    </div>

                    <div className="relative hidden flex-1 max-w-sm sm:block">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                            <Search className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                                type="search"
                                value={pageSearch}
                                onChange={(event) => setPageSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') setPageSearch('');
                                    if (event.key === 'Enter' && matchingPages[0]) {
                                        router.push(matchingPages[0].href);
                                        setPageSearch('');
                                    }
                                }}
                                aria-label={t('Search dashboard pages')}
                                aria-controls="dashboard-search-results"
                                placeholder={t('Search pages...')}
                                className="min-w-0 flex-1 bg-transparent text-sm text-slate-600 outline-none placeholder-slate-400 dark:text-slate-300"
                            />
                        </div>
                        {pageSearch.trim() && (
                            <div id="dashboard-search-results" role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                {matchingPages.length ? matchingPages.map((item) => (
                                    <Link key={item.href} href={item.href} role="option" onClick={() => setPageSearch('')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                                        <span className="text-slate-400">{item.icon}</span>{item.name}
                                    </Link>
                                )) : <p className="px-3 py-2 text-sm text-slate-500">{t('No matching pages')}</p>}
                            </div>
                        )}
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
                        {user && (
                            <div className="relative">
                                <button type="button" aria-haspopup="menu" aria-expanded={isProfileMenuOpen} onClick={() => setIsProfileMenuOpen((open) => !open)} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e3a8a] text-[11px] font-bold text-white">{user.firstName?.charAt(0) || 'U'}</span>
                                    <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-700 dark:text-slate-200 md:inline">{user.firstName}</span>
                                    <ChevronDown className="h-3 w-3 text-slate-400" />
                                </button>
                                {isProfileMenuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                    <Link role="menuitem" href="/dashboard/profile" onClick={() => setIsProfileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">My profile</Link>
                                    {['school-admin', 'super-admin', 'receptionist'].includes(user.role) && <Link role="menuitem" href="/dashboard/settings" onClick={() => setIsProfileMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">Settings</Link>}
                                    <button role="menuitem" onClick={handleLogout} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">Sign out</button>
                                </div>}
                            </div>
                        )}
                    </div>
                </header>

                <div id="main-content" tabIndex={-1} className="dashboard-shell flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
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
