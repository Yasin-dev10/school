"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    TrendingUp, Plus, School, Activity,
    Users, CreditCard, ChevronRight
} from 'lucide-react';

export default function SuperAdminDashboard() {
    const [stats, setStats]                 = useState({ tenants: 0, active: 0, suspended: 0 });
    const [recentTenants, setRecentTenants] = useState<any[]>([]);
    const [loading, setLoading]             = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/tenants');
                const list: any[] = data.data || [];
                setStats({
                    tenants:   data.count || list.length,
                    active:    list.filter(t => t.status === 'active').length,
                    suspended: list.filter(t => t.status === 'suspended').length,
                });
                setRecentTenants(list.slice(0, 8));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    const planBadge = (plan?: string) => {
        const p = (plan || 'basic').toLowerCase();
        if (p === 'enterprise') return 'bg-purple-500/15 text-purple-300 border border-purple-500/25';
        if (p === 'pro' || p === 'premium') return 'bg-blue-500/15 text-blue-300 border border-blue-500/25';
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/20';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                </div>
                <Link
                    href="/super-admin/tenants/add"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" /> Add New School
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Schools */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/60 to-blue-800/40 border border-blue-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-300/80 text-xs font-medium uppercase tracking-wider">Total Schools</p>
                            <p className="text-3xl font-black text-white mt-1">{loading ? '—' : stats.tenants}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +5%
                        </span>
                    </div>
                    <School className="absolute bottom-3 right-3 w-8 h-8 text-blue-500/20" />
                </div>

                {/* Active Schools */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border border-emerald-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-300/80 text-xs font-medium uppercase tracking-wider">Active Schools</p>
                            <p className="text-3xl font-black text-white mt-1">{loading ? '—' : stats.active}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +10%
                        </span>
                    </div>
                    <Activity className="absolute bottom-3 right-3 w-8 h-8 text-emerald-500/20" />
                </div>

                {/* System Status */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/50 border border-slate-700/40 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">System Status</p>
                            <p className="text-2xl font-black text-white mt-1">Operational</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </div>
                    </div>
                    <Users className="absolute bottom-3 right-3 w-8 h-8 text-slate-500/20" />
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Manage Schools',    href: '/super-admin/tenants',       icon: <School className="w-4 h-4" />,   color: 'text-blue-400' },
                    { label: 'Subscriptions',      href: '/super-admin/subscriptions', icon: <CreditCard className="w-4 h-4" />, color: 'text-purple-400' },
                    { label: 'Payments',           href: '/super-admin/payments',      icon: <CreditCard className="w-4 h-4" />, color: 'text-emerald-400' },
                    { label: 'Users Overview',     href: '/super-admin/users',         icon: <Users className="w-4 h-4" />,   color: 'text-amber-400' },
                ].map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-800/60 hover:bg-slate-700/60 border border-white/8 rounded-xl transition group"
                    >
                        <div className="flex items-center gap-2">
                            <span className={item.color}>{item.icon}</span>
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition">{item.label}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                    </Link>
                ))}
            </div>

            {/* Recent Schools */}
            <div className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white">Recent Schools</h2>
                    <Link href="/super-admin/tenants" className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition flex items-center gap-1">
                        View All <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/8">
                                <th className="px-6 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">School Name</th>
                                <th className="px-6 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Domain</th>
                                <th className="px-6 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                                <th className="px-6 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Plan</th>
                                <th className="px-6 py-3 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Created</th>
                                <th className="px-6 py-3 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 animate-pulse">Loading…</td></tr>
                            ) : recentTenants.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No schools yet.</td></tr>
                            ) : recentTenants.map((tenant, idx) => (
                                <tr key={tenant.id} className={`border-b border-white/5 last:border-0 transition hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-800/20' : ''}`}>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-lg bg-slate-700 border border-white/10 flex items-center justify-center shrink-0 text-white font-bold text-xs">
                                                {tenant.name?.charAt(0) || 'S'}
                                            </div>
                                            <span className="font-medium text-white">{tenant.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-400 font-mono text-xs">{tenant.domain || tenant.tenantId || '—'}</td>
                                    <td className="px-6 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                            tenant.status === 'active'
                                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                                : 'bg-red-500/15 text-red-400 border-red-500/25'
                                        }`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${planBadge(tenant.subscriptionPlan)}`}>
                                            {tenant.subscriptionPlan || 'Basic'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-400 text-xs">
                                        {new Date(tenant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-3.5 text-right">
                                        <Link
                                            href={`/super-admin/tenants/${tenant.id}/edit`}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                                        >
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
