"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/api';
import Link from 'next/link';
import {
    Search, ChevronDown, X, Plus, Loader2,
    CheckCircle2, AlertCircle, Clock, MessageSquare
} from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Payment = { id: string; amount: number; paymentDate: string; paymentMethod?: string; transactionId?: string };
type Invoice = {
    _id: string; invoiceNumber: string; totalAmount: number; paidAmount: number;
    status: string; dueDate: string; discount?: number;
    student?: { _id?: string; id?: string; firstName: string; lastName: string; admissionNo?: string };
    class?: { name: string; section?: string };
    items?: { name: string; amount: number }[];
    payments?: Payment[];
};
type AClass = { _id: string; name: string; section?: string };

const STATUS_OPTIONS = ['All Statuses', 'paid', 'unpaid', 'partially_paid'];
const fmt = (n: number) => `$${n.toLocaleString()}`;

/* ─── Dropdown helper ─────────────────────────────────────────────────────── */
function Dropdown({ label, options, value, onChange }: {
    label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div ref={ref} className="relative">
            <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 transition min-w-[150px] justify-between">
                {value || label} <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 overflow-hidden">
                    {options.map(o => (
                        <button key={o} onClick={() => { onChange(o); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition ${value === o ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {o === 'partially_paid' ? 'Partial' : o.charAt(0).toUpperCase() + o.slice(1)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Payment History Panel ───────────────────────────────────────────────── */
function PaymentPanel({ invoice, onClose, onPay, isAdmin, paying }: {
    invoice: Invoice; onClose: () => void;
    onPay: (inv: Invoice, amount: string, method: string) => void;
    isAdmin: boolean; paying: boolean;
}) {
    const [amount, setAmount]     = useState('');
    const [method, setMethod]     = useState('cash');
    const balance = invoice.totalAmount - (invoice.paidAmount || 0);

    return (
        <div className="w-72 shrink-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-white text-sm truncate">
                    {invoice.student?.firstName} {invoice.student?.lastName}
                </p>
                <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Payment History</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(invoice.payments || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No payments recorded yet.</p>
                    ) : (invoice.payments || []).map((p, i) => (
                        <div key={p.id || i} className="text-xs text-slate-600 dark:text-slate-300 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            {new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} — {fmt(p.amount)} ({p.paymentMethod || 'cash'})
                        </div>
                    ))}
                    {invoice.discount ? (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 py-1.5 font-semibold">
                            Discount Applied: {fmt(invoice.discount)}
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Fee items */}
            {(invoice.items || []).length > 0 && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Fee Structure</p>
                    {invoice.items!.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5">
                            <span>{item.name}</span><span>{fmt(item.amount)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/40 text-xs space-y-1">
                <div className="flex justify-between text-slate-500"><span>Total Fee</span><span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(invoice.totalAmount)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Paid</span><span className="font-semibold text-emerald-600">{fmt(invoice.paidAmount)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Balance</span><span className={`font-bold ${balance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmt(balance)}</span></div>
            </div>

            {/* Record payment */}
            {isAdmin && balance > 0 && (
                <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Record Payment</p>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                        placeholder={`Max ${fmt(balance)}`} max={balance}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    <select value={method} onChange={e => setMethod(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="mobile_money">Mobile Money</option>
                    </select>
                    <button onClick={() => onPay(invoice, amount, method)} disabled={!amount || paying}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                        {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Add Payment
                    </button>
                </div>
            )}

            {/* Reminder button */}
            <div className="px-4 pb-4 mt-auto pt-2">
                <button className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                    <MessageSquare className="w-3.5 h-3.5" /> Send Payment Reminder via SMS/WhatsApp
                </button>
            </div>
        </div>
    );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function FeeHubPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [classes,  setClasses]  = useState<AClass[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [paying,   setPaying]   = useState(false);
    const [user,     setUser]     = useState<any>(null);

    const [search,      setSearch]      = useState('');
    const [filterClass, setFilterClass] = useState('All Classes');
    const [filterStatus,setFilterStatus]= useState('All Statuses');
    const [selected,    setSelected]    = useState<Invoice | null>(null);

    // Bulk invoice modal
    const [isBulkOpen,  setIsBulkOpen]  = useState(false);
    const [feeTypes,    setFeeTypes]    = useState<any[]>([]);
    const [bulkForm,    setBulkForm]    = useState({ classId: '', feeTypeIds: [] as string[], dueDate: '' });
    const [generating,  setGenerating]  = useState(false);

    /* ── Fetch ────────────────────────────────────────────────────────── */
    const fetchData = async () => {
        setLoading(true);
        try {
            const u = localStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
            const [invRes, clRes, ftRes] = await Promise.all([
                api.get('/fees/invoices'),
                api.get('/classes'),
                api.get('/fees/types'),
            ]);
            setInvoices(invRes.data.data || []);
            setClasses(clRes.data.data || []);
            setFeeTypes(ftRes.data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const isAdmin = user && ['school-admin', 'super-admin', 'accountant', 'receptionist'].includes(user.role);

    /* ── Refresh selected invoice after payment ─────────────────────── */
    const refreshInvoice = async (id: string) => {
        try {
            const { data } = await api.get(`/fees/invoices/${id}`);
            const fresh = { ...data.data, _id: data.data.id || data.data._id };
            setInvoices(prev => prev.map(inv => inv._id === fresh._id ? fresh : inv));
            setSelected(fresh);
        } catch (e) { console.error(e); }
    };

    /* ── Record payment ───────────────────────────────────────────────── */
    const handlePay = async (inv: Invoice, amount: string, method: string) => {
        if (!amount || Number(amount) <= 0) return;
        setPaying(true);
        try {
            await api.post('/fees/pay', { invoiceId: inv._id, amount: Number(amount), paymentMethod: method });
            await refreshInvoice(inv._id);
        } catch (err: any) { alert(err.response?.data?.message || 'Payment failed'); }
        finally { setPaying(false); }
    };

    /* ── Bulk generate ────────────────────────────────────────────────── */
    const handleBulkGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        try {
            await api.post('/fees/generate-invoices', bulkForm);
            setIsBulkOpen(false);
            setBulkForm({ classId: '', feeTypeIds: [], dueDate: '' });
            fetchData();
        } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
        finally { setGenerating(false); }
    };

    /* ── Unique class labels ──────────────────────────────────────────── */
    const classOptions = useMemo(() => {
        const set = new Set<string>();
        invoices.forEach(inv => {
            if (inv.class) set.add(`${inv.class.name}${inv.class.section ? ` ${inv.class.section}` : ''}`);
        });
        return ['All Classes', ...Array.from(set).sort()];
    }, [invoices]);

    /* ── Filter ───────────────────────────────────────────────────────── */
    const filtered = useMemo(() => invoices.filter(inv => {
        const name = `${inv.student?.firstName || ''} ${inv.student?.lastName || ''}`.toLowerCase();
        const id   = inv.student?.admissionNo?.toLowerCase() || '';
        const q    = search.toLowerCase();
        const matchQ   = !search || name.includes(q) || id.includes(q) || inv.invoiceNumber.toLowerCase().includes(q);
        const clsLabel = `${inv.class?.name || ''}${inv.class?.section ? ` ${inv.class.section}` : ''}`;
        const matchCls = filterClass === 'All Classes' || clsLabel === filterClass;
        const matchSts = filterStatus === 'All Statuses' || inv.status === filterStatus;
        return matchQ && matchCls && matchSts;
    }), [invoices, search, filterClass, filterStatus]);

    /* ── Stats ────────────────────────────────────────────────────────── */
    const totalFee  = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const totalDue  = totalFee - totalPaid;

    /* ── Render ───────────────────────────────────────────────────────── */
    const iw = 'w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500';

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Student Fee & Payment Hub</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Track tuition, payments, and outstanding balances.</p>
                </div>
                {isAdmin && (
                    <button onClick={() => setIsBulkOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                        <Plus className="w-4 h-4" /> Generate Invoices
                    </button>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Fee', value: fmt(totalFee), color: 'text-slate-800 dark:text-white', bg: 'bg-white dark:bg-slate-800' },
                    { label: 'Collected', value: fmt(totalPaid), color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'Outstanding', value: fmt(totalDue), color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3`}>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{s.label}</p>
                        <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by Name or ID"
                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <Dropdown label="Class: All Classes" options={classOptions} value={filterClass} onChange={setFilterClass} />
                <Dropdown label="Status: All Statuses" options={STATUS_OPTIONS} value={filterStatus} onChange={setFilterStatus} />
            </div>

            {/* Table + Side Panel */}
            <div className="flex gap-4 items-start">
                {/* Table */}
                <div className="flex-1 min-w-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                                    <th className="px-4 py-3">Student Name & ID</th>
                                    <th className="px-4 py-3">Class</th>
                                    <th className="px-4 py-3">Total Fee Structure</th>
                                    <th className="px-4 py-3">Paid Amount</th>
                                    <th className="px-4 py-3">Discount</th>
                                    <th className="px-4 py-3">Balance Due</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loading ? (
                                    <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400 animate-pulse">Loading invoices...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-16 text-center text-slate-400">No invoices found.</td></tr>
                                ) : filtered.map(inv => {
                                    const balance  = inv.totalAmount - (inv.paidAmount || 0);
                                    const discount = inv.discount || 0;
                                    const isViewed = selected?._id === inv._id;
                                    const initials = `${inv.student?.firstName?.charAt(0) || '?'}${inv.student?.lastName?.charAt(0) || ''}`.toUpperCase();
                                    return (
                                        <tr key={inv._id} onClick={() => setSelected(isViewed ? null : inv)}
                                            className={`cursor-pointer transition-colors ${isViewed ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/20'}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300 shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800 dark:text-white leading-tight">{inv.student?.firstName} {inv.student?.lastName}</p>
                                                        <p className="text-[10px] text-slate-400">ID: {inv.student?.admissionNo || inv.invoiceNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                                                {inv.class ? `${inv.class.name}${inv.class.section ? ` ${inv.class.section}` : ''}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{fmt(inv.totalAmount)}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(inv.paidAmount || 0)}</td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmt(discount)}</td>
                                            <td className="px-4 py-3">
                                                {balance <= 0 ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">$0</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg">
                                                        {fmt(balance)} (Due)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500">
                        Showing {filtered.length} of {invoices.length} invoices
                    </div>
                </div>

                {/* Payment history panel */}
                {selected && (
                    <PaymentPanel
                        invoice={selected}
                        onClose={() => setSelected(null)}
                        onPay={handlePay}
                        isAdmin={isAdmin}
                        paying={paying}
                    />
                )}
            </div>

            {/* ── Bulk Generate Modal ─────────────────────────────────────── */}
            {isBulkOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 my-8">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Generate Class Invoices</h2>
                        <form onSubmit={handleBulkGenerate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Class</label>
                                <select required value={bulkForm.classId} onChange={e => setBulkForm({ ...bulkForm, classId: e.target.value })} className={iw}>
                                    <option value="">Select class…</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fee Types</label>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                    {feeTypes.map(ft => (
                                        <label key={ft._id} className="flex items-center justify-between gap-2 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox"
                                                    checked={bulkForm.feeTypeIds.includes(ft._id)}
                                                    onChange={e => setBulkForm({ ...bulkForm, feeTypeIds: e.target.checked ? [...bulkForm.feeTypeIds, ft._id] : bulkForm.feeTypeIds.filter(id => id !== ft._id) })}
                                                    className="accent-indigo-500 w-4 h-4" />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{ft.name}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-indigo-500">{fmt(ft.amount)}</span>
                                        </label>
                                    ))}
                                    {feeTypes.length === 0 && <p className="text-xs text-slate-400 italic">No fee types defined yet.</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Due Date</label>
                                <input type="date" required value={bulkForm.dueDate} onChange={e => setBulkForm({ ...bulkForm, dueDate: e.target.value })} className={iw} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={generating}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Generate
                                </button>
                                <button type="button" onClick={() => setIsBulkOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-sm transition">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
