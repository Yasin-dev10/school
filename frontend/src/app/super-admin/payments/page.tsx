"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Loader2, Search, TrendingUp, AlertTriangle, XCircle,
    Filter, ChevronDown, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Download, Plus,
    CreditCard, CheckCircle2, Clock, X
} from 'lucide-react';

interface Tenant {
    id: string; name: string; tenantId: string; status: string;
    subscriptionPlan?: string; subscriptionActive?: boolean;
    subscriptionValid?: string; billingCycle?: string;
    createdAt: string; updatedAt: string; config?: { logoUrl?: string };
}
interface PaymentRow {
    id: string; transactionId: string; schoolName: string; logoUrl?: string;
    tenantDbId: string; amount: number; method: string;
    date: string; status: 'success' | 'pending' | 'failed'; plan: string;
}

function toRow(t: Tenant): PaymentRow {
    const plan    = (t.subscriptionPlan || 'basic').toLowerCase();
    const amount  = plan === 'enterprise' ? 999 : plan === 'pro' ? 199 : 99;
    const billing = (t.billingCycle || 'monthly').toLowerCase();
    const isActive = t.status === 'active' && t.subscriptionActive !== false;
    let status: 'success' | 'pending' | 'failed' = 'success';
    if (!isActive) status = 'failed';
    else if (t.subscriptionValid && new Date(t.subscriptionValid) < new Date()) status = 'pending';
    return {
        id: t.id, tenantDbId: t.id,
        transactionId: `TXN-${(t.tenantId || t.id).slice(0, 8).toUpperCase()}`,
        schoolName: t.name, logoUrl: t.config?.logoUrl,
        amount: billing === 'annual' ? amount * 12 : amount,
        method: 'credit_card',
        date: t.subscriptionValid || t.updatedAt || t.createdAt,
        status, plan,
    };
}

const METHODS = [
    { value: 'credit_card',   label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Wire Transfer' },
    { value: 'cash',          label: 'Cash' },
    { value: 'cheque',        label: 'Cheque' },
    { value: 'ach',           label: 'ACH' },
];

const PAGE_SIZE = 10;

export default function SuperAdminPaymentsPage() {
    const [tenants, setTenants]           = useState<Tenant[]>([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [methodFilter, setMethodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage]                 = useState(1);
    const [selected, setSelected]         = useState<Set<string>>(new Set());

    // Add Payment modal
    const [modalOpen, setModalOpen]     = useState(false);
    const [modalTenant, setModalTenant] = useState<Tenant | null>(null);
    const [form, setForm]               = useState({
        tenantId: '', amount: '', paymentMethod: 'credit_card',
        transactionId: '', note: '', paymentDate: new Date().toISOString().slice(0, 10),
        renewMonths: '1',
    });
    const [saving, setSaving]   = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [saveErr, setSaveErr] = useState('');

    useEffect(() => { fetchTenants(); }, []);
    useEffect(() => { setPage(1); }, [search, methodFilter, statusFilter]);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/tenants');
            setTenants(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const allRows    = tenants.map(toRow);
    const mtdRevenue    = allRows.filter(r => r.status === 'success').reduce((s, r) => s + r.amount, 0);
    const pendingAmount = allRows.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0);
    const failedCount   = allRows.filter(r => r.status === 'failed').length;

    const filtered = allRows.filter(r => {
        const q = search.toLowerCase();
        return (!search || r.schoolName.toLowerCase().includes(q) || r.transactionId.toLowerCase().includes(q))
            && (methodFilter === 'all' || r.method === methodFilter)
            && (statusFilter === 'all' || r.status === statusFilter);
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll    = () => setSelected(selected.size === pageRows.length ? new Set() : new Set(pageRows.map(r => r.id)));

    const openModal = (tenant?: Tenant) => {
        setModalTenant(tenant || null);
        setForm({
            tenantId:      tenant?.id || (tenants[0]?.id || ''),
            amount:        tenant ? String(tenant.subscriptionPlan?.toLowerCase() === 'enterprise' ? 999 : tenant.subscriptionPlan?.toLowerCase() === 'pro' ? 199 : 99) : '',
            paymentMethod: 'credit_card',
            transactionId: '',
            note:          '',
            paymentDate:   new Date().toISOString().slice(0, 10),
            renewMonths:   '1',
        });
        setSaveMsg(''); setSaveErr('');
        setModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setSaveErr(''); setSaveMsg('');
        try {
            const tid = modalTenant?.id || form.tenantId;
            const { data } = await api.post(`/tenants/${tid}/payments`, {
                amount:        Number(form.amount),
                paymentMethod: form.paymentMethod,
                transactionId: form.transactionId || undefined,
                note:          form.note || undefined,
                paymentDate:   form.paymentDate ? new Date(form.paymentDate + 'T00:00:00Z').toISOString() : undefined,
                renewMonths:   Number(form.renewMonths),
            });
            setSaveMsg(`Payment recorded! Subscription extended to ${new Date(data.data.newValidUntil).toLocaleDateString()}`);
            fetchTenants();
            setTimeout(() => setModalOpen(false), 2000);
        } catch (err: any) {
            setSaveErr(err?.response?.data?.message || 'Failed to record payment.');
        } finally { setSaving(false); }
    };

    const statusBadge = (s: string) => {
        if (s === 'failed')  return { label: 'Failed',  cls: 'bg-red-500/20 text-red-400 border border-red-500/30' };
        if (s === 'pending') return { label: 'Pending', cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
        return { label: 'Success', cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
    };
    const methodLabel = (m: string) => METHODS.find(x => x.value === m)?.label || m;
    const methodCls   = (m: string) => {
        if (m === 'credit_card') return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25';
        if (m === 'bank_transfer') return 'bg-blue-500/15 text-blue-300 border border-blue-500/25';
        if (m === 'cash') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25';
        return 'bg-slate-500/15 text-slate-300 border border-slate-500/20';
    };

    const inputCls = 'w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                    <h1 className="text-2xl font-bold text-white">Payment Transactions</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-indigo-500/20">
                        <Plus className="w-4 h-4" /> Add Payment
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-blue-500/20">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/60 to-emerald-800/40 border border-emerald-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-emerald-300/80 text-xs font-medium uppercase tracking-wider">Revenue (MTD)</p>
                            <p className="text-2xl font-black text-white mt-1">{loading ? '—' : '$' + mtdRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/20">
                            <TrendingUp className="w-3 h-3" /> +12.5%
                        </span>
                    </div>
                    <CheckCircle2 className="absolute bottom-3 right-3 w-8 h-8 text-emerald-500/15" />
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/60 to-amber-800/40 border border-amber-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-amber-300/80 text-xs font-medium uppercase tracking-wider">Pending Payouts</p>
                            <p className="text-2xl font-black text-white mt-1">{loading ? '—' : '$' + pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center border border-amber-400/20"><AlertTriangle className="w-4 h-4 text-amber-400" /></div>
                    </div>
                    <Clock className="absolute bottom-3 right-3 w-8 h-8 text-amber-500/15" />
                </div>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-900/60 to-red-800/40 border border-red-700/30 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-red-300/80 text-xs font-medium uppercase tracking-wider">Failed Transactions</p>
                            <p className="text-2xl font-black text-white mt-1">{loading ? '—' : failedCount}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-red-400/15 flex items-center justify-center border border-red-400/20"><XCircle className="w-4 h-4 text-red-400" /></div>
                    </div>
                    <CreditCard className="absolute bottom-3 right-3 w-8 h-8 text-red-500/15" />
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border-b border-white/8">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition" />
                    </div>
                    <div className="relative">
                        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm outline-none cursor-pointer">
                            <option value="all">Filter by</option>
                            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm outline-none cursor-pointer">
                            <option value="all">All Status</option>
                            <option value="success">Success</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
                ) : pageRows.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">No payments found.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/8">
                                        <th className="py-3 px-4 text-left">
                                            <input type="checkbox" checked={selected.size === pageRows.length && pageRows.length > 0} onChange={toggleAll}
                                                className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500" />
                                        </th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Transaction ID</th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">School Name</th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Amount</th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Method</th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Date</th>
                                        <th className="py-3 px-4 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                                        <th className="py-3 px-4 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map((row, idx) => {
                                        const sb = statusBadge(row.status);
                                        const isSel = selected.has(row.id);
                                        return (
                                            <tr key={row.id} className={`border-b border-white/5 last:border-0 transition ${isSel ? 'bg-blue-600/5' : idx % 2 === 1 ? 'bg-slate-800/20' : ''} hover:bg-slate-700/30`}>
                                                <td className="py-3.5 px-4"><input type="checkbox" checked={isSel} onChange={() => toggleSelect(row.id)} className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500" /></td>
                                                <td className="py-3.5 px-4"><span className="font-mono text-blue-400 text-xs font-medium">{row.transactionId}</span></td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-700 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {row.logoUrl ? <img src={row.logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-xs">{row.schoolName.charAt(0)}</span>}
                                                        </div>
                                                        <span className="font-medium text-white">{row.schoolName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-white font-semibold">${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${methodCls(row.method)}`}>{methodLabel(row.method)}</span></td>
                                                <td className="py-3.5 px-4 text-slate-400 text-xs">{row.date ? new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                                                <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${sb.cls}`}>{sb.label}</span></td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <button onClick={() => openModal(tenants.find(t => t.id === row.tenantDbId))}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition ml-auto">
                                                        <Plus className="w-3.5 h-3.5" /> Pay
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="px-5 py-3.5 border-t border-white/8 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Showing <span className="text-slate-300 font-medium">{(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)}</span> of <span className="text-slate-300 font-medium">{filtered.length}</span></p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(1)} disabled={page===1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition border border-white/8"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition border border-white/8"><ChevronLeft className="w-3.5 h-3.5" /></button>
                                {Array.from({length:Math.min(5,totalPages)},(_,i)=>{let p=totalPages<=5?i+1:page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i;return(<button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition border ${page===p?'bg-blue-600 text-white border-blue-600':'bg-slate-700/50 hover:bg-slate-600 text-slate-300 border-white/8'}`}>{p}</button>);})}
                                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition border border-white/8"><ChevronRight className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setPage(totalPages)} disabled={page===totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-slate-600 disabled:opacity-30 text-slate-300 transition border border-white/8"><ChevronsRight className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Add Payment Modal ─────────────────────────────────────── */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                        <div className="p-6">
                            {/* Modal header */}
                            <div className="flex items-start justify-between mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Add Payment Transaction</h2>
                                    <p className="text-slate-400 text-sm mt-0.5">{modalTenant ? modalTenant.name : 'Select a school'}</p>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white p-1"><X className="w-5 h-5" /></button>
                            </div>

                            {saveMsg && (
                                <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" /> {saveMsg}
                                </div>
                            )}
                            {saveErr && (
                                <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                                    <XCircle className="w-4 h-4 shrink-0" /> {saveErr}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* School selector (only when not pre-selected) */}
                                {!modalTenant && (
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">School</label>
                                        <select value={form.tenantId} onChange={e => setForm(f => ({...f, tenantId: e.target.value}))} className={inputCls} required>
                                            <option value="">Select school…</option>
                                            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amount ($)</label>
                                        <input type="number" min="1" step="0.01" required value={form.amount}
                                            onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                                            placeholder="99.00" className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Renew (months)</label>
                                        <input type="number" min="1" max="24" value={form.renewMonths}
                                            onChange={e => setForm(f => ({...f, renewMonths: e.target.value}))}
                                            className={inputCls} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {METHODS.map(m => (
                                            <button key={m.value} type="button"
                                                onClick={() => setForm(f => ({...f, paymentMethod: m.value}))}
                                                className={`py-2 rounded-xl text-xs font-semibold border transition ${form.paymentMethod === m.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}>
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Transaction ID (optional)</label>
                                    <input type="text" value={form.transactionId} onChange={e => setForm(f => ({...f, transactionId: e.target.value}))}
                                        placeholder="e.g. ch_3Nxx..." className={inputCls} />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Payment Date</label>
                                    <input type="date" value={form.paymentDate} onChange={e => setForm(f => ({...f, paymentDate: e.target.value}))} className={inputCls} />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Note (optional)</label>
                                    <textarea rows={2} value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))}
                                        placeholder="Internal note…" className={inputCls + ' resize-none'} />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button type="submit" disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
                                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Record Payment</>}
                                    </button>
                                    <button type="button" onClick={() => setModalOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl text-sm font-semibold transition">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
