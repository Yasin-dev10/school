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
    Bot,
    Trophy,
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
    const [navQuery, setNavQuery] = useState('');
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
            setIsAuthorized(true);
        }).catch(() => {
            localStorage.removeItem('user');
            router.replace('/login');
        });

        fetchUnreadCount();

        const handleTenantUpdate = (e: CustomEvent) => {
            setTenant((prev: any) => ({
                ...prev,
                name: e.detail.name,
                logoUrl: e.detail.logoUrl,
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
                    { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
                ],
            });
            push({
                id: 'people',
                label: 'People & Structure',
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
                    { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
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
                    { name: 'Dashboard', href: '/dashboard', icon: icon(<LayoutDashboard className="w-4 h-4" />) },
                    { name: 'My Profile', href: '/dashboard/profile', icon: icon(<Users className="w-4 h-4" />) },
                    { name: 'AI Study Assistant', href: '/dashboard/ai-assistant', icon: icon(<Bot className="w-4 h-4" />) },
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

        return groups.map((group) => ({
            ...group,
            label: t(group.label),
            items: group.items.map((item) => ({ ...item, name: t(item.name) })),
        }));
    }, [user, t]);

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

    const filteredGroups = useMemo(() => {
        const q = navQuery.trim().toLowerCase();
        if (!q) return navGroups;
        return navGroups
            .map((group) => ({
                ...group,
                items: group.items.filter(
                    (item) =>
                        item.name.toLowerCase().includes(q) ||
                        group.label.toLowerCase().includes(q)
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [navGroups, navQuery]);

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

    const expandAllMenus = () => {
        const next: Record<string, boolean> = {};
        navGroups.forEach((g) => {
            next[g.id] = true;
        });
        setOpenGroups(next);
    };

    const collapseAllMenus = () => {
        const next: Record<string, boolean> = {};
        navGroups.forEach((g) => {
            next[g.id] = groupContainsActive(pathname, g);
        });
        setOpenGroups(next);
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
                <div className="px-3.5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 hover:bg-white/5 transition-colors">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white shadow-sm">
                                {tenant?.logoUrl ? (
                                    <img src={tenant.logoUrl} alt="School Logo" className="h-full w-full object-contain" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
                                        {tenant?.name?.charAt(0) || 'S'}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{tenant?.name || 'School Registry'}</p>
                                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-white/40">
                                    {tenant?.academicYear || t('School Management')}
                                </p>
                            </div>
                        </Link>
                        <button
                            type="button"
                            aria-label={t('Close navigation menu')}
                            className="lg:hidden rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Group Menu header */}
                <div className="px-3 pt-3 pb-2.5 space-y-2 border-b border-white/5">
                    <div className="flex items-center justify-between px-0.5">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/50 flex items-center gap-1.5">
                            <Menu className="w-3.5 h-3.5" />
                            {t('Group Menu')}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={expandAllMenus}
                                className="text-[10px] font-semibold text-indigo-300/80 hover:text-indigo-200"
                            >
                                {t('Expand')}
                            </button>
                            <span className="text-white/20">·</span>
                            <button
                                type="button"
                                onClick={collapseAllMenus}
                                className="text-[10px] font-semibold text-white/40 hover:text-white/70"
                            >
                                {t('Collapse')}
                            </button>
                        </div>
                    </div>
                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <input
                            type="text"
                            value={navQuery}
                            onChange={(e) => setNavQuery(e.target.value)}
                            placeholder={t('Search group menu...')}
                            className="bg-transparent text-xs text-white/80 placeholder-white/35 outline-none flex-1 min-w-0"
                        />
                        {navQuery && (
                            <button
                                type="button"
                                onClick={() => setNavQuery('')}
                                className="text-white/40 hover:text-white/70"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </label>
                </div>

                <nav id="dashboard-navigation" tabIndex={-1} className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredGroups.map((group) => {
                        const isOpen = navQuery ? true : !!openGroups[group.id];
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
                    {filteredGroups.length === 0 && (
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

                <div id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">{children}</div>
            </main>
        </div>
    );
}
