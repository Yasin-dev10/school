"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'super-admin') {
            router.push('/login');
            return;
        }

        setUserName(`${user.firstName} ${user.lastName}`);
        setIsAuthorized(true);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
    };

    if (!isAuthorized) return null;

    const navItems = [
        { name: 'Dashboard', href: '/super-admin/dashboard', icon: '📊' },
        { name: 'Schools', href: '/super-admin/tenants', icon: '🏫' },
        { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: '💳' },
        { name: 'Contact Messages', href: '/super-admin/contact-messages', icon: '💬' },
        { name: 'Global Settings', href: '/super-admin/settings', icon: '⚙️' },
        { name: 'Audit Logs', href: '/super-admin/logs', icon: '📜' },
    ];


    return (
        <div className="flex min-h-screen bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900/50 border-r border-white/5 flex flex-col sticky top-0 h-screen">
                <div className="p-6 border-b border-white/5">
                    <div className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-serif italic">S</span>
                        </div>
                        <span>School<span className="text-indigo-400">OS</span> <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded uppercase">Admin</span></span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium ${isActive
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-indigo-400 font-bold">
                            {userName.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{userName}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Super Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition font-medium mt-2"
                    >
                        <span>🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
