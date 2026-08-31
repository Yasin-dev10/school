"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Search, Loader2, Pencil, Trash2, X, CheckCircle2,
    ChevronDown, AlertTriangle, CreditCard, Building2, Zap
} from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    tenantId: string;
    domain?: string;
    status: string;
    subscriptionPlan?: string;
    subscriptionActive?: boolean;
    subscriptionValid?: string;
    billingCycle?: string;
    accessMode?: 'full' | 'limited' | 'suspended';
    allowedModules?: string[];
    graceDays?: number;
    warningDays?: number;
    autoSuspend?: boolean;
    config?: { logoUrl?: string };
    subscription?: { plan?: string; billingCycle?: string; validUntil?: string };
    _count?: { users?: number };
}

const PLANS = [
    { value: 'basic',      label: 'Basic',      price: '$99/mo',   color: 'text-slate-300',  bg: 'bg-slate-500/15 border-slate-500/25' },
    { value: 'pro',        label: 'Pro',        price: '$199/mo',  color: 'text-blue-300',   bg: 'bg-blue-500/15 border-blue-500/25' },
    { value: 'enterprise', label: 'Enterprise', price: 'Custom',   color: 'text-purple-300', bg: 'bg-purple-500/15 border-purple-500/25' },
];

const BILLING_CYCLES = ['Monthly', 'Annual'];
const MODULES = [
    ['students', 'Students'], ['teachers', 'Teachers'], ['classes', 'Classes'],
    ['subjects', 'Subjects'], ['attendance', 'Attendance'], ['timetable', 'Timetable'],
    ['exams', 'Exams & Results'], ['learning', 'Learning'], ['finance', 'Finance'],
    ['payroll', 'Payroll'], ['inventory', 'Inventory'], ['certificates', 'Certificates'],
    ['reports', 'Reports & Analytics'], ['communication', 'Communication'],
    ['calendar', 'Calendar'], ['alumni', 'Alumni'], ['customization', 'Customization'],
    ['settings', 'Logs & Settings'], ['support', 'Help & Support'],
] as const;

export default function SubscriptionsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('all');

    // Edit modal
    const [editOpen, setEditOpen] = useState(false);
    const [editTenant, setEditTenant] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState({
        plan: 'basic', billingCycle: 'Monthly', validUntil: '', accessMode: 'full',
        allowedModules: [] as string[], graceDays: 0, warningDays: 5, autoSuspend: true,
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Delete confirm
    const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchTenants = async () => {
        try {
            const { data } = await api.get('/tenants');
            setTenants(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTenants(); }, []);

    // Plan counts for stat cards
    const basicCount      = tenants.filter(t => (t.subscriptionPlan || 'basic').toLowerCase() === 'basic').length;
    const proCount        = tenants.filter(t => (t.subscriptionPlan || '').toLowerCase() === 'pro').length;
    const enterpriseCount = tenants.filter(t => (t.subscriptionPlan || '').toLowerCase() === 'enterprise').length;

    const getPlanMeta = (plan?: string) => {
        const p = (plan || 'basic').toLowerCase();
        if (p === 'enterprise') return { label: 'Enterprise', cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/25' };
        if (p === 'pro' || p === 'premium') return { label: 'Pro', cls: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' };
        return { label: 'Basic', cls: 'bg-slate-500/15 text-slate-300 border border-slate-500/20' };
    };

    const getStatusMeta = (t: Tenant) => {
        if (t.accessMode === 'suspended' || t.status === 'suspended') return { label: 'Suspended', cls: 'bg-red-500/15 text-red-400 border border-red-500/25' };
        if (t.accessMode === 'limited') return { label: 'Limited', cls: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' };
        if (!t.subscriptionActive && t.subscriptionValid && new Date(t.subscriptionValid) < new Date())
            return { label: 'Expired', cls: 'bg-red-500/15 text-red-400 border border-red-500/25' };
        if (t.subscriptionActive || t.status === 'active')
            return { label: 'Active', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' };
        return { label: 'Inactive', cls: 'bg-slate-600/30 text-slate-400 border border-slate-500/20' };
    };

    const filtered = tenants.filter(t => {
        const q = search.toLowerCase();
        const matchQ = !search || t.name.toLowerCase().includes(q) || (t.tenantId || '').toLowerCase().includes(q);
        const matchP = planFilter === 'all' || (t.subscriptionPlan || 'basic').toLowerCase() === planFilter;
        return matchQ && matchP;
    });

    // ── Open Edit Modal ─────────────────────────────────────────────────────────
    const openEdit = (tenant: Tenant) => {
        setEditTenant(tenant);
        setEditForm({
            plan:         (tenant.subscriptionPlan || tenant.subscription?.plan || 'basic').toLowerCase(),
            billingCycle: tenant.billingCycle || tenant.subscription?.billingCycle || 'Monthly',
            validUntil:   tenant.subscriptionValid
                ? new Date(tenant.subscriptionValid).toISOString().slice(0, 10)
                : tenant.subscription?.validUntil
                    ? new Date(tenant.subscription.validUntil).toISOString().slice(0, 10)
                    : '',
            accessMode: tenant.accessMode || (tenant.status === 'suspended' ? 'suspended' : 'full'),
            allowedModules: tenant.allowedModules || [],
            graceDays: tenant.graceDays ?? 0,
            warningDays: tenant.warningDays ?? 5,
            autoSuspend: tenant.autoSuspend !== false,
        });
        setSaveError('');
        setEditOpen(true);
    };

    const handleSave = async () => {
        if (!editTenant) return;
        setSaving(true);
        setSaveError('');
        try {
            await api.put(`/tenants/${editTenant.id}`, {
                status: editForm.accessMode === 'suspended' ? 'suspended' : 'active',
                subscription: {
                    plan:         editForm.plan,
                    billingCycle: editForm.billingCycle,
                    accessMode: editForm.accessMode,
                    allowedModules: editForm.allowedModules,
                    graceDays: editForm.graceDays,
                    warningDays: editForm.warningDays,
                    autoSuspend: editForm.autoSuspend,
                    isActive: editForm.accessMode !== 'suspended',
                    // Convert "YYYY-MM-DD" → full ISO string so Prisma accepts it
                    ...(editForm.validUntil
                        ? { validUntil: new Date(editForm.validUntil + 'T23:59:59.999Z').toISOString() }
                        : {}
                    ),
                },
            });
            setTenants(prev => prev.map(t =>
                t.id === editTenant.id
                    ? { ...t, status: editForm.accessMode === 'suspended' ? 'suspended' : 'active', accessMode: editForm.accessMode as Tenant['accessMode'], allowedModules: editForm.allowedModules, graceDays: editForm.graceDays, warningDays: editForm.warningDays, autoSuspend: editForm.autoSuspend, subscriptionPlan: editForm.plan, billingCycle: editForm.billingCycle, subscriptionValid: editForm.validUntil || t.subscriptionValid }
                    : t
            ));
            setEditOpen(false);
        } catch (err: any) {
            setSaveError(err?.response?.data?.message || 'Failed to save changes.');
        } finally { setSaving(false); }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/tenants/${deleteTarget.id}`);
            setTenants(prev => prev.filter(t => t.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch { alert('Failed to delete.'); }
        finally { setDeleting(false); }
    };

    const inputCls = 'w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Subscription Management</h1>
            </div>

            {/* Plan Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Basic Plan */}
                <div className="rounded-2xl border border-emerald-500/30 bg-slate-800/60 p-5 relative overflow-hidden">
                    <div className="h-1 absolute top-0 left-0 right-0 bg-emerald-500 rounded-t-2xl" />
                    <div className="flex items-start justify-between mt-1">
                        <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Basic Plan</p>
                            <p className="text-3xl font-black text-white">$99<span className="text-base font-semibold text-slate-400">/mo</span></p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                            <CreditCard className="w-4.5 h-4.5 text-emerald-400" />
                        </div>
                    </div>
                    <button
                        onClick={() => setPlanFilter(planFilter === 'basic' ? 'all' : 'basic')}
                        className={`mt-3 px-3 py-1 rounded-full text-xs font-bold transition border ${planFilter === 'basic' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25'}`}
                    >
                        {basicCount} Schools
                    </button>
                </div>

                {/* Pro Plan */}
                <div className="rounded-2xl border border-blue-500/30 bg-slate-800/60 p-5 relative overflow-hidden">
                    <div className="h-1 absolute top-0 left-0 right-0 bg-blue-500 rounded-t-2xl" />
                    <div className="flex items-start justify-between mt-1">
                        <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Pro Plan</p>
                            <p className="text-3xl font-black text-white">$199<span className="text-base font-semibold text-slate-400">/mo</span></p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                            <Zap className="w-4.5 h-4.5 text-blue-400" />
                        </div>
                    </div>
                    <button
                        onClick={() => setPlanFilter(planFilter === 'pro' ? 'all' : 'pro')}
                        className={`mt-3 px-3 py-1 rounded-full text-xs font-bold transition border ${planFilter === 'pro' ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25'}`}
                    >
                        {proCount} Schools
                    </button>
                </div>

                {/* Enterprise Plan */}
                <div className="rounded-2xl border border-purple-500/30 bg-slate-800/60 p-5 relative overflow-hidden">
                    <div className="h-1 absolute top-0 left-0 right-0 bg-purple-500 rounded-t-2xl" />
                    <div className="flex items-start justify-between mt-1">
                        <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Enterprise Plan</p>
                            <p className="text-3xl font-black text-white">Custom</p>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                            <Building2 className="w-4.5 h-4.5 text-purple-400" />
                        </div>
                    </div>
                    <button
                        onClick={() => setPlanFilter(planFilter === 'enterprise' ? 'all' : 'enterprise')}
                        className={`mt-3 px-3 py-1 rounded-full text-xs font-bold transition border ${planFilter === 'enterprise' ? 'bg-purple-500 text-white border-purple-500' : 'bg-purple-500/15 text-purple-400 border-purple-500/25 hover:bg-purple-500/25'}`}
                    >
                        {enterpriseCount} Schools
                    </button>
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
                            placeholder="Search subscriptions..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={planFilter}
                            onChange={e => setPlanFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                        >
                            <option value="all">Plan Type</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">No subscriptions found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">School Name</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Plan</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Billing Cycle</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Next Renewal Date</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                                    <th className="py-3 px-5 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((tenant, idx) => {
                                    const planMeta   = getPlanMeta(tenant.subscriptionPlan);
                                    const statusMeta = getStatusMeta(tenant);
                                    const renewal    = tenant.subscriptionValid || tenant.subscription?.validUntil;
                                    const billing    = tenant.billingCycle || tenant.subscription?.billingCycle || '—';
                                    return (
                                        <tr
                                            key={tenant.id}
                                            className={`border-b border-white/5 last:border-0 transition hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-800/20' : ''}`}
                                        >
                                            {/* School Name */}
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-700 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                        {tenant.config?.logoUrl
                                                            ? <img src={tenant.config.logoUrl} alt="logo" className="w-full h-full object-cover" />
                                                            : <span className="text-white font-bold text-sm">{tenant.name?.charAt(0)}</span>
                                                        }
                                                    </div>
                                                    <span className="font-medium text-white">{tenant.name}</span>
                                                </div>
                                            </td>

                                            {/* Plan */}
                                            <td className="py-3.5 px-5">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${planMeta.cls}`}>
                                                    {planMeta.label}
                                                </span>
                                            </td>

                                            {/* Billing Cycle */}
                                            <td className="py-3.5 px-5 text-slate-300">
                                                {typeof billing === 'string' ? billing.charAt(0).toUpperCase() + billing.slice(1).toLowerCase() : '—'}
                                            </td>

                                            {/* Next Renewal */}
                                            <td className="py-3.5 px-5 text-slate-400">
                                                {renewal
                                                    ? new Date(renewal).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
                                                    : '—'}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-5">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusMeta.cls}`}>
                                                    {statusMeta.label}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(tenant)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                                                        title="Edit subscription"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(tenant)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition"
                                                        title="Delete school"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
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

            {/* ── Edit Modal ──────────────────────────────────────────────────── */}
            {editOpen && editTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
                    {/* Panel */}
                    <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl">
                        {/* Top accent */}
                        <div className="h-1 bg-gradient-to-r from-indigo-600 to-purple-600" />

                        <div className="p-6">
                            {/* Modal header */}
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Edit Subscription</h2>
                                    <p className="text-slate-400 text-sm mt-0.5">{editTenant.name}</p>
                                </div>
                                <button onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-white transition p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {saveError && (
                                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                                    <AlertTriangle className="w-4 h-4 shrink-0" /> {saveError}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Plan */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subscription Plan</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PLANS.map(p => (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setEditForm(f => ({ ...f, plan: p.value }))}
                                                className={`py-2.5 rounded-xl text-sm font-semibold border transition ${editForm.plan === p.value ? `${p.bg} ${p.color}` : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Billing Cycle */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billing Cycle</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BILLING_CYCLES.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setEditForm(f => ({ ...f, billingCycle: c }))}
                                                className={`py-2.5 rounded-xl text-sm font-semibold border transition ${editForm.billingCycle === c ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Next Renewal Date */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Next Renewal Date</label>
                                    <input
                                        type="date"
                                        value={editForm.validUntil}
                                        onChange={e => setEditForm(f => ({ ...f, validUntil: e.target.value }))}
                                        className={inputCls}
                                    />
                                </div>

                                {/* Access mode */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">School Access</label>
                                    <select
                                        value={editForm.accessMode}
                                        onChange={e => setEditForm(f => ({ ...f, accessMode: e.target.value }))}
                                        className={inputCls}
                                    >
                                        <option value="full">Full Access</option>
                                        <option value="limited">Limited Access</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>

                                {editForm.accessMode === 'limited' && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Allowed Modules</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                                            {MODULES.map(([value, label]) => (
                                                <label key={value} className="flex items-center gap-2 rounded-lg p-2 text-sm text-slate-300 hover:bg-white/5 cursor-pointer">
                                                    <input type="checkbox" checked={editForm.allowedModules.includes(value)} onChange={() => setEditForm(f => ({ ...f, allowedModules: f.allowedModules.includes(value) ? f.allowedModules.filter(m => m !== value) : [...f.allowedModules, value] }))} className="accent-amber-500" />
                                                    {label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Grace Days</label>
                                        <input type="number" min="0" value={editForm.graceDays} onChange={e => setEditForm(f => ({ ...f, graceDays: Math.max(0, Number(e.target.value)) }))} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Warning Days</label>
                                        <input type="number" min="0" value={editForm.warningDays} onChange={e => setEditForm(f => ({ ...f, warningDays: Math.max(0, Number(e.target.value)) }))} className={inputCls} />
                                    </div>
                                </div>

                                <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800 p-3 text-sm text-slate-300 cursor-pointer">
                                    <span><strong className="block text-white">Automatic suspension</strong>Lock the school after renewal date + grace days.</span>
                                    <input type="checkbox" checked={editForm.autoSuspend} onChange={e => setEditForm(f => ({ ...f, autoSuspend: e.target.checked }))} className="h-4 w-4 accent-red-500" />
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                                >
                                    {saving
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                                        : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>
                                    }
                                </button>
                                <button
                                    onClick={() => setEditOpen(false)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition border border-white/10"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ────────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-red-600 to-rose-600" />
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">Delete School</h2>
                                    <p className="text-slate-400 text-sm">This cannot be undone.</p>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm mb-6">
                                Are you sure you want to delete <span className="font-semibold text-white">"{deleteTarget.name}"</span> and all its data?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                                >
                                    {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Delete</>}
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition border border-white/10"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
