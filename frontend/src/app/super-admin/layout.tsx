"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/app/utils/api';
import {
    LayoutDashboard,
    School,
    Users,
    CreditCard,
    MessageSquare,
    Settings,
    ScrollText,
    HardDriveDownload,
    LogOut,
    Menu,
    X,
    ChevronRight,
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard',        href: '/super-admin/dashboard',        icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Schools',          href: '/super-admin/tenants',          icon: <School className="w-4 h-4" /> },
    { name: 'Users',            href: '/super-admin/users',            icon: <Users className="w-4 h-4" /> },
    { name: 'Subscriptions',    href: '/super-admin/subscriptions',    icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Payments',         href: '/super-admin/payments',         icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Contact Messages', href: '/super-admin/contact-messages', icon: <MessageSquare className="w-4 h-4" /> },
    { name: 'Announcements',    href: '/super-admin/announcements',    icon: <ScrollText className="w-4 h-4" /> },
    { name: 'Audit Logs',       href: '/super-admin/logs',             icon: <ScrollText className="w-4 h-4" /> },
    { name: 'Backups',          href: '/super-admin/backups',          icon: <HardDriveDownload className="w-4 h-4" /> },
    { name: 'Global Settings',  href: '/super-admin/settings',         icon: <Settings className="w-4 h-4" /> },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const router   = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [userName, setUserName]         = useState('');
    const [userInitial, setUserInitial]   = useState('S');
    const [sidebarOpen, setSidebarOpen]   = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) { router.push('/login'); return; }
        api.get('/auth/me').then(({ data }) => {
            const user = data.data;
            if (user.role !== 'super-admin' && user.role !== 'super_admin') { router.push('/login'); return; }
            localStorage.setItem('user', JSON.stringify(user));
            setUserName(`${user.firstName} ${user.lastName}`);
            setUserInitial(user.firstName?.charAt(0) || 'S');
            setIsAuthorized(true);
        }).catch(() => router.push('/login'));
    }, [router]);

    useEffect(() => { setSidebarOpen(false); }, [pathname]);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (!isAuthorized) return (
        <div className="flex h-screen items-center justify-center bg-[#0d1b2e]">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#0d1b2e] text-slate-200">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-56 bg-[#0d1b2e] border-r border-white/5 flex flex-col z-50
                transition-transform duration-300 lg:translate-x-0 lg:static lg:h-full
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-white font-semibold text-sm">S</span>
                        </div>
                        <span className="text-white font-semibold text-sm">
                            School<span className="text-indigo-400">Registry</span>
                        </span>
                        <span className="text-[9px] bg-indigo-900/60 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            ADMIN
                        </span>
                    </div>
                    <button className="lg:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(false)}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${
                                    isActive
                                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}>
                                    {item.icon}
                                </span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="px-3 py-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                            {userInitial}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{userName}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Super Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile topbar */}
                <div className="lg:hidden h-14 bg-[#0d1b2e] border-b border-white/5 flex items-center px-4 gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="text-white font-bold text-sm">SchoolOS Admin</span>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
