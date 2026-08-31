"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search, Plus, Pencil, Trash2, Loader2,
    TrendingUp, TrendingDown, Users, School, Activity,
    MoreHorizontal, Filter, ChevronDown, ShieldAlert, X, CheckCircle2
} from 'lucide-react';

const ACCESS_MODULES = [
    ['students', 'Students'], ['teachers', 'Teachers'], ['classes', 'Classes'],
    ['subjects', 'Subjects'], ['attendance', 'Attendance'], ['timetable', 'Timetable'],
    ['exams', 'Exams & Results'], ['learning', 'Learning'], ['finance', 'Finance'],
    ['payroll', 'Payroll'], ['inventory', 'Inventory'], ['certificates', 'Certificates'],
    ['reports', 'Reports & Analytics'], ['communication', 'Communication'],
    ['calendar', 'Calendar'], ['alumni', 'Alumni'], ['customization', 'Customization'],
    ['settings', 'Logs & Settings'], ['support', 'Help & Support'],
] as const;

export default function TenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [planFilter, setPlanFilter] = useState('all');
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const menuRef = useRef<HTMLDivElement>(null);
    const [accessTenant, setAccessTenant] = useState<any | null>(null);
    const [accessForm, setAccessForm] = useState({ accessMode: 'full', allowedModules: [] as string[], validUntil: '', graceDays: 0, warningDays: 5, autoSuspend: true });
    const [savingAccess, setSavingAccess] = useState(false);
    const [accessError, setAccessError] = useState('');

    const fetchTenants = async () => {
        try {
            const { data } = await api.get('/tenants');
            setTenants(data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTenants(); }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleDelete = async (id: string, name: string) => {
        setOpenMenu(null);
        if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/tenants/${id}`);
            setTenants(prev => prev.filter((t: any) => t.id !== id));
        } catch { alert('Failed to delete school.'); }
    };

    const openAccess = (tenant: any) => {
        setOpenMenu(null);
        setAccessTenant(tenant);
        setAccessForm({
            accessMode: tenant.accessMode || (tenant.status === 'suspended' ? 'suspended' : 'full'),
            allowedModules: tenant.allowedModules || [],
            validUntil: tenant.subscriptionValid ? new Date(tenant.subscriptionValid).toISOString().slice(0, 10) : '',
            graceDays: tenant.graceDays ?? 0,
            warningDays: tenant.warningDays ?? 5,
            autoSuspend: tenant.autoSuspend !== false,
        });
        setAccessError('');
    };

    const saveAccess = async () => {
        if (!accessTenant) return;
        setSavingAccess(true);
        setAccessError('');
        try {
            const { data } = await api.put(`/tenants/${accessTenant.id}`, {
                status: accessForm.accessMode === 'suspended' ? 'suspended' : 'active',
                subscription: {
                    accessMode: accessForm.accessMode,
                    allowedModules: accessForm.allowedModules,
                    graceDays: accessForm.graceDays,
                    warningDays: accessForm.warningDays,
                    autoSuspend: accessForm.autoSuspend,
                    isActive: accessForm.accessMode !== 'suspended',
                    ...(accessForm.validUntil ? { validUntil: new Date(`${accessForm.validUntil}T23:59:59.999Z`).toISOString() } : {}),
                },
            });
            setTenants(prev => prev.map(t => t.id === accessTenant.id ? data.data : t));
            setAccessTenant(null);
        } catch (error: any) {
            setAccessError(error?.response?.data?.message || 'Failed to update school access.');
        } finally {
            setSavingAccess(false);
        }
    };

    const toggleSchool = async (tenant: any) => {
        const suspended = tenant.accessMode === 'suspended' || tenant.status === 'suspended';
        const nextMode = suspended ? 'full' : 'suspended';
        try {
            const { data } = await api.put(`/tenants/${tenant.id}`, {
                status: nextMode === 'suspended' ? 'suspended' : 'active',
                subscription: { accessMode: nextMode, isActive: nextMode !== 'suspended' },
            });
            setTenants(prev => prev.map(t => t.id === tenant.id ? data.data : t));
        } catch { alert('Failed to change school access.'); }
    };

    const filtered = tenants.filter(t => {
        const q = search.toLowerCase();
        const matchQ = !search || t.name.toLowerCase().includes(q) || t.tenantId.toLowerCase().includes(q);
        const matchF = filter === 'all' || t.status === filter;
        const matchP = planFilter === 'all' || (t.subscriptionPlan || '').toLowerCase() === planFilter;
        return matchQ && matchF && matchP;
    });

    // Stats
    const totalSchools = tenants.length;
    const activeCount = tenants.filter(t => t.status === 'active').length;
    const trialCount = tenants.filter(t =>
        (t.subscriptionPlan || '').toLowerCase() === 'starter' ||
        (t.subscriptionPlan || '').toLowerCase() === 'trial'
    ).length;

    const planBadge = (plan?: string) => {
        const p = (plan || '').toLowerCase();
        if (p === 'enterprise') return { cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/25', label: 'Enterprise' };
        if (p === 'pro' || p === 'premium') return { cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/25', label: 'Pro' };
        if (p === 'starter') return { cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25', label: 'Starter' };
        return { cls: 'bg-slate-600/30 text-slate-400 border border-slate-500/20', label: plan || 'Basic' };
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(t => t.id)));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                    <h1 className="text-2xl font-bold text-white">School Management</h1>
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
                            <p className="text-3xl font-bold text-white mt-1">{totalSchools}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +5%
                        </span>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-blue-500/10" />
                    <School className="absolute bottom-3 right-3 w-8 h-8 text-blue-500/20" />
                </div>

                {/* Active Tenants */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border border-emerald-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-300/80 text-xs font-medium uppercase tracking-wider">Active Tenants</p>
                            <p className="text-3xl font-bold text-white mt-1">{activeCount}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +10%
                        </span>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-emerald-500/10" />
                    <Activity className="absolute bottom-3 right-3 w-8 h-8 text-emerald-500/20" />
                </div>

                {/* Trialing */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/60 to-amber-800/40 border border-amber-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-amber-300/80 text-xs font-medium uppercase tracking-wider">Trialing</p>
                            <p className="text-3xl font-bold text-white mt-1">{trialCount}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-red-400 bg-red-400/10 px-2 py-1 rounded-full border border-red-400/20">
                            <TrendingDown className="w-3 h-3" /> -2%
                        </span>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-amber-500/10" />
                    <Users className="absolute bottom-3 right-3 w-8 h-8 text-amber-500/20" />
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
                            placeholder="Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>

                    {/* Filter by plan */}
                    <div className="relative">
                        <select
                            value={planFilter}
                            onChange={e => setPlanFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="all">Filter by</option>
                            <option value="starter">Starter</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Filter by status */}
                    <button
                        onClick={() => setFilter(f => f === 'all' ? 'active' : f === 'active' ? 'suspended' : 'all')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 hover:text-white text-sm font-medium transition"
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                        {filter !== 'all' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        )}
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 text-center text-slate-500">
                        No schools matching your search.
                    </div>
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
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold">School Name</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold">Location</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold">Current Plan</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold">Users Count</th>
                                    <th className="py-3 px-4 text-left text-slate-400 font-semibold">Status</th>
                                    <th className="py-3 px-4 text-right text-slate-400 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody ref={menuRef as any}>
                                {filtered.map((tenant: any, idx: number) => {
                                    const badge = planBadge(tenant.subscriptionPlan);
                                    const accessMode = tenant.accessMode || (tenant.status === 'suspended' ? 'suspended' : 'full');
                                    const isActive = accessMode !== 'suspended';
                                    const isSelected = selected.has(tenant.id);
                                    return (
                                        <tr
                                            key={tenant.id}
                                            className={`border-b border-white/5 last:border-0 transition ${isSelected ? 'bg-indigo-600/5' : idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'} hover:bg-slate-700/30`}
                                        >
                                            {/* Checkbox */}
                                            <td className="py-3.5 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(tenant.id)}
                                                    className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                                                />
                                            </td>

                                            {/* School Name */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-700 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                        {tenant.logoUrl
                                                            ? <img src={tenant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                            : <span className="text-white font-bold text-sm">{tenant.name?.charAt(0) || 'S'}</span>
                                                        }
                                                    </div>
                                                    <span className="font-medium text-white">{tenant.name}</span>
                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="py-3.5 px-4 text-slate-400">
                                                {tenant.address || tenant.location || '—'}
                                            </td>

                                            {/* Plan */}
                                            <td className="py-3.5 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </td>

                                            {/* Users Count */}
                                            <td className="py-3.5 px-4 text-slate-300 font-medium">
                                                {tenant.userCount ?? tenant._count?.users ?? '—'}
                                            </td>

                                            {/* Status Toggle */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Toggle switch visual */}
                                                    <button
                                                        onClick={() => toggleSchool(tenant)}
                                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                                        title={isActive ? 'Active' : 'Inactive'}
                                                    >
                                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                    </button>
                                                    <span className={`text-sm font-medium ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                        {accessMode === 'limited' ? 'Limited' : isActive ? 'Full Access' : 'Suspended'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 text-xs font-medium transition border border-white/8"
                                                    >
                                                        Actions <MoreHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                    {openMenu === tenant.id && (
                                                        <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                                                            <Link
                                                                href={`/super-admin/tenants/${tenant.id}/edit`}
                                                                onClick={() => setOpenMenu(null)}
                                                                className="flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:bg-slate-700 hover:text-white text-sm transition"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" /> Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => openAccess(tenant)}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-amber-300 hover:bg-amber-500/10 text-sm transition"
                                                            >
                                                                <ShieldAlert className="w-3.5 h-3.5" /> Manage Access
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(tenant.id, tenant.name)}
                                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-400 hover:bg-red-500/10 text-sm transition"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {accessTenant && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAccessTenant(null)} />
                    <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                        <div className="h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-red-500" />
                        <div className="p-6">
                            <div className="mb-5 flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-400">School Access Control</p>
                                    <h2 className="mt-1 text-xl font-bold text-white">{accessTenant.name}</h2>
                                </div>
                                <button onClick={() => setAccessTenant(null)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
                            </div>

                            {accessError && <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{accessError}</div>}

                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Access Level</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[['full', 'Full Access'], ['limited', 'Limited Access'], ['suspended', 'Suspended']].map(([value, label]) => (
                                            <button key={value} type="button" onClick={() => setAccessForm(f => ({ ...f, accessMode: value }))} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${accessForm.accessMode === value ? value === 'full' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : value === 'limited' ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-red-500 bg-red-500/15 text-red-300' : 'border-white/10 bg-slate-800 text-slate-400'}`}>{label}</button>
                                        ))}
                                    </div>
                                </div>

                                {accessForm.accessMode === 'limited' && (
                                    <div>
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Meelaha loo fasaxayo</label>
                                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 sm:grid-cols-3">
                                            {ACCESS_MODULES.map(([value, label]) => (
                                                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm text-slate-300 hover:bg-white/5">
                                                    <input type="checkbox" checked={accessForm.allowedModules.includes(value)} onChange={() => setAccessForm(f => ({ ...f, allowedModules: f.allowedModules.includes(value) ? f.allowedModules.filter(m => m !== value) : [...f.allowedModules, value] }))} className="accent-amber-500" />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Payment Deadline</label><input type="date" value={accessForm.validUntil} onChange={e => setAccessForm(f => ({ ...f, validUntil: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                                    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Grace Days</label><input type="number" min="0" value={accessForm.graceDays} onChange={e => setAccessForm(f => ({ ...f, graceDays: Math.max(0, Number(e.target.value)) }))} className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                                    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Warning Days</label><input type="number" min="0" value={accessForm.warningDays} onChange={e => setAccessForm(f => ({ ...f, warningDays: Math.max(0, Number(e.target.value)) }))} className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                                </div>

                                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-slate-800 p-4 text-sm text-slate-300">
                                    <span><strong className="block text-white">Automatic suspension</strong>Deadline + grace days kadib school-ka otomaatig u xir.</span>
                                    <input type="checkbox" checked={accessForm.autoSuspend} onChange={e => setAccessForm(f => ({ ...f, autoSuspend: e.target.checked }))} className="h-4 w-4 accent-red-500" />
                                </label>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button onClick={saveAccess} disabled={savingAccess || (accessForm.accessMode === 'limited' && accessForm.allowedModules.length === 0)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50">{savingAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Save Access</button>
                                <button onClick={() => setAccessTenant(null)} className="flex-1 rounded-xl border border-white/10 bg-slate-800 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-700">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
