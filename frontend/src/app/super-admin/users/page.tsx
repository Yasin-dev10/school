"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search, Users, Loader2, TrendingUp, School,
    XCircle, ChevronDown, Filter
} from 'lucide-react';

export default function SuperAdminUsersPage() {
    const [users, setUsers]           = useState<any[]>([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [error, setError]           = useState('');
    const [selected, setSelected]     = useState<Set<string>>(new Set());

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get('/tenants');
            setUsers((data.data || []).map((t: any) => ({
                id:          t.id,
                schoolName:  t.name,
                tenantId:    t.tenantId,
                plan:        t.subscriptionPlan || 'basic',
                status:      t.status,
                createdAt:   t.createdAt,
                userCount:   t._count?.users ?? t.userCount ?? '—',
                logoUrl:     t.config?.logoUrl,
            })));
        } catch (e: any) {
            setError('Failed to load data. ' + (e?.response?.data?.message || e?.message || ''));
        } finally { setLoading(false); }
    };

    const planBadge = (plan: string) => {
        const p = (plan || '').toLowerCase();
        if (p === 'enterprise') return 'bg-purple-500/15 text-purple-300 border border-purple-500/25';
        if (p === 'pro' || p === 'premium') return 'bg-blue-500/15 text-blue-300 border border-blue-500/25';
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/20';
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchQ = !search || u.schoolName?.toLowerCase().includes(q) || u.tenantId?.toLowerCase().includes(q);
        const matchS = statusFilter === 'all' || u.status === statusFilter;
        const matchP = planFilter   === 'all' || u.plan.toLowerCase() === planFilter;
        return matchQ && matchS && matchP;
    });

    const toggleSelect = (id: string) => {
        setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleAll = () => {
        setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)));
    };

    const totalActive    = users.filter(u => u.status === 'active').length;
    const totalSuspended = users.filter(u => u.status === 'suspended').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                    <h1 className="text-2xl font-bold text-white">Users Overview</h1>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/60 to-blue-800/40 border border-blue-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-blue-300/80 text-xs font-medium uppercase tracking-wider">Total Schools</p>
                            <p className="text-3xl font-black text-white mt-1">{loading ? '—' : users.length}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +5%
                        </span>
                    </div>
                    <School className="absolute bottom-3 right-3 w-8 h-8 text-blue-500/20" />
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border border-emerald-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-300/80 text-xs font-medium uppercase tracking-wider">Active Schools</p>
                            <p className="text-3xl font-black text-white mt-1">{loading ? '—' : totalActive}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +8%
                        </span>
                    </div>
                    <Users className="absolute bottom-3 right-3 w-8 h-8 text-emerald-500/20" />
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/60 to-red-800/40 border border-red-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-red-300/80 text-xs font-medium uppercase tracking-wider">Suspended</p>
                            <p className="text-3xl font-black text-white mt-1">{loading ? '—' : totalSuspended}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-red-400/15 flex items-center justify-center border border-red-400/20">
                            <XCircle className="w-4 h-4 text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border-b border-white/8">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search schools…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select
                            value={planFilter}
                            onChange={e => setPlanFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Plans</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                {error ? (
                    <div className="p-8 text-center text-red-400">{error}</div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">No schools found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="py-3 px-4 text-left">
                                        <input
                                            type="checkbox"
                                            checked={selected.size === filtered.length && filtered.length > 0}
                                            onChange={toggleAll}
                                            className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">School Name</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Tenant ID</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Plan</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Users</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Joined</th>
                                    <th className="py-3 px-4 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, idx) => {
                                    const isSelected = selected.has(u.id);
                                    return (
                                        <tr
                                            key={u.id}
                                            className={`border-b border-white/5 last:border-0 transition ${isSelected ? 'bg-indigo-600/5' : idx % 2 === 1 ? 'bg-slate-800/20' : ''} hover:bg-slate-700/30`}
                                        >
                                            <td className="py-3.5 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(u.id)}
                                                    className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-700 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {u.logoUrl
                                                            ? <img src={u.logoUrl} alt="logo" className="w-full h-full object-cover" />
                                                            : <span className="text-white font-bold text-sm">{u.schoolName?.charAt(0) || 'S'}</span>
                                                        }
                                                    </div>
                                                    <span className="font-medium text-white">{u.schoolName}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{u.tenantId}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${planBadge(u.plan)}`}>
                                                    {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-300 font-medium">{u.userCount}</td>
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                                    u.status === 'active'
                                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                                        : 'bg-red-500/15 text-red-400 border-red-500/25'
                                                }`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-400 text-xs">
                                                {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <Link
                                                    href={`/super-admin/tenants/${u.id}/edit`}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
                                                >
                                                    Edit
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
