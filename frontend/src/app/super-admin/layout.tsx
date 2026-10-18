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
    Bell,
    Search,
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
    const [pageSearch, setPageSearch]     = useState('');

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

    const currentTitle = navItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.name || 'Platform';
    const matchingPages = navItems.filter((item) => item.name.toLowerCase().includes(pageSearch.trim().toLowerCase()));

    if (!isAuthorized) return (
        <div className="flex h-screen items-center justify-center bg-[#0d1b2e]">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#0b1730] text-slate-200">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-60 bg-[#1e3a8a] border-r border-white/10 flex flex-col z-50
                transition-transform duration-300 lg:translate-x-0 lg:static lg:h-full
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-300 rounded-lg flex items-center justify-center shrink-0">
                            <span className="text-[#1e3a8a] font-black text-sm">S</span>
                        </div>
                        <span className="text-white font-semibold text-sm">
                            School<span className="text-cyan-300">Registry</span>
                        </span>
                        <span className="text-[9px] bg-cyan-300/10 text-cyan-200 border border-cyan-300/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
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
                                        ? 'bg-cyan-500 text-[#07152e] border border-cyan-300/60 shadow-sm shadow-cyan-950/20'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className={isActive ? 'text-[#07152e]' : 'text-blue-200/60 group-hover:text-cyan-100'}>
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
                <header className="relative z-30 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0b1730] px-4 lg:px-7">
                    <div className="flex min-w-0 items-center gap-3">
                        <button aria-label="Open navigation menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"><Menu className="h-5 w-5" /></button>
                        <div className="min-w-0"><p className="hidden text-xs text-slate-400 sm:block">Platform control</p><h1 className="truncate text-base font-bold text-white">{currentTitle}</h1></div>
                    </div>
                    <div className="relative hidden max-w-md flex-1 md:block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input aria-label="Search platform pages" value={pageSearch} onChange={(event) => setPageSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setPageSearch(''); if (event.key === 'Enter' && matchingPages[0]) { router.push(matchingPages[0].href); setPageSearch(''); } }} placeholder="Search platform pages…" className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400" />
                        {pageSearch.trim() && <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">{matchingPages.length ? matchingPages.map((item) => <Link key={item.href} href={item.href} onClick={() => setPageSearch('')} className="block rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">{item.name}</Link>) : <p className="px-3 py-2 text-sm text-slate-400">No matching pages</p>}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <Link aria-label="View platform announcements" href="/super-admin/announcements" className="relative rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="h-4 w-4" /></Link>
                        <span className="hidden text-right sm:block"><span className="block max-w-36 truncate text-xs font-semibold text-white">{userName}</span><span className="text-[10px] text-cyan-200">Super Admin</span></span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-sm font-bold text-cyan-100">{userInitial}</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}
