"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function FinancePage() {
    const [user, setUser] = useState<any>(null);
    const [view, setView] = useState('invoices'); // 'invoices', 'structure', 'my-billing'
    const [feeTypes, setFeeTypes] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [classes, setClasses] = useState([]);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    // Form States
    const [feeForm, setFeeForm] = useState({ name: '', amount: '', description: '' });
    const [bulkForm, setBulkForm] = useState({ classId: '', feeTypeIds: [], dueDate: '' });
    const [paymentForm, setPaymentForm] = useState({ invoiceId: '', amount: '', paymentMethod: 'cash', transactionId: '' });
    const [expenseForm, setExpenseForm] = useState({ title: '', category: 'supplies', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

    // Receipt State
    const [receiptData, setReceiptData] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const userData = JSON.parse(userStr);
            setUser(userData);

            const [tenRes] = await Promise.all([api.get('/tenants/me')]);
            setTenant(tenRes.data.data);

            if (['school-admin', 'accountant', 'receptionist'].includes(userData.role)) {
                const [ftRes, invRes, clRes, expRes] = await Promise.all([
                    api.get('/fees/types'),
                    api.get('/fees/invoices'),
                    api.get('/classes'),
                    api.get('/fees/expenses')
                ]);
                setFeeTypes(ftRes.data.data);
                setInvoices(invRes.data.data);
                setClasses(clRes.data.data);
                setExpenses(expRes.data.data);
            } else if (userData.role === 'student') {
                setView('my-billing');
                const { data } = await api.get(`/fees/invoices?studentId=${userData._id}`);
                setInvoices(data.data);
            } else if (userData.role === 'parent') {
                setView('parent-portal');
                const { data: childRes } = await api.get('/students/my-children');
                setChildren(childRes.data);
            }
        } catch (err) {
            console.error("Finance data fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchChildInvoices = async (childId: string) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/fees/invoices?studentId=${childId}`);
            setInvoices(data.data);
        } catch (err) {
            console.error("Failed to fetch child invoices");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fees/types', feeForm);
            setIsFeeModalOpen(false);
            setFeeForm({ name: '', amount: '', description: '' });
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to create fee type");
        }
    };

    const handleBulkGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetClass = classes.find((c: any) => c._id === bulkForm.classId);
        if (!targetClass) return;

        try {
            await api.post('/fees/generate-invoices', {
                ...bulkForm,
                className: (targetClass as any).name,
                section: (targetClass as any).section
            });
            setIsBulkModalOpen(false);
            setBulkForm({ classId: '', feeTypeIds: [], dueDate: '' });
            fetchData();
            alert("Invoices generated successfully!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to generate invoices");
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fees/pay', {
                ...paymentForm,
                invoiceId: selectedInvoice._id
            });
            setIsPaymentModalOpen(false);
            setPaymentForm({ invoiceId: '', amount: '', paymentMethod: 'cash', transactionId: '' });
            setSelectedInvoice(null);
            fetchData();
            alert("Payment recorded!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to record payment");
        }
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/fees/expenses', expenseForm);
            setIsExpenseModalOpen(false);
            setExpenseForm({ title: '', category: 'supplies', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
            fetchData();
            alert("Expense recorded successfully!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to record expense");
        }
    };

    const fetchReceipt = async (id: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/fees/invoices/${id}`);
            setReceiptData(data.data);
            setIsReceiptOpen(true);
        } catch (err) {
            alert("Failed to load receipt");
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user && ['school-admin', 'accountant'].includes(user.role);

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {isAdmin ? 'Institutional Finance' : user?.role === 'parent' ? 'Family Billing' : 'My Financial Ledger'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isAdmin ? 'Manage revenue, tuition fees, and student billing cycles.' : 'Review outstanding balances and transaction history.'}
                    </p>
                </div>
                {isAdmin && (
                    <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner w-full lg:w-auto overflow-x-auto">
                        <button onClick={() => setView('invoices')} className={`flex-1 lg:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${view === 'invoices' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Invoices</button>
                        <button onClick={() => setView('structure')} className={`flex-1 lg:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${view === 'structure' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Structure</button>
                        <button onClick={() => setView('expenses')} className={`flex-1 lg:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${view === 'expenses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Expenses</button>
                    </div>
                )}
            </div>

            {view === 'parent-portal' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-xl font-bold text-white">Select a Student</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {children.map((child: any) => (
                            <button
                                key={child._id}
                                onClick={() => { setSelectedChild(child); fetchChildInvoices(child._id); setView('my-billing'); }}
                                className="glass-dark p-6 rounded-[2rem] border border-white/5 text-left hover:border-indigo-500/50 transition-all group"
                            >
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:bg-indigo-500 group-hover:text-white transition-all">🎓</div>
                                <p className="text-white font-bold">{child.firstName} {child.lastName}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">{child.profile?.class} - {child.profile?.section}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(view === 'invoices' || view === 'my-billing') && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {isAdmin && (
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-900/40 p-4 sm:p-6 rounded-[2rem] border border-white/5 shadow-xl gap-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[120px] px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Expected</p>
                                    <p className="text-indigo-400 font-black text-lg sm:text-xl">${invoices.reduce((s, i: any) => s + i.totalAmount, 0).toLocaleString()}</p>
                                </div>
                                <div className="flex-1 min-w-[120px] px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Collected</p>
                                    <p className="text-green-400 font-black text-lg sm:text-xl">${invoices.reduce((s, i: any) => s + (i.paidAmount || 0), 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsBulkModalOpen(true)} className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20">
                                + Generate Invoices
                            </button>
                        </div>
                    )}

                    {view === 'my-billing' && user?.role === 'parent' && (
                        <button onClick={() => setView('parent-portal')} className="text-indigo-400 text-sm font-bold hover:underline mb-4 flex items-center gap-2">
                            ← Back to Children List
                        </button>
                    )}

                    <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[900px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Invoice #</th>
                                    <th className="px-8 py-5">Student</th>
                                    <th className="px-8 py-5">Amount</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5">Due Date</th>
                                    <th className="px-8 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={6} className="py-20 text-center text-slate-600 animate-pulse italic">Loading ledgers...</td></tr>
                                ) : invoices.length > 0 ? invoices.map((inv: any) => (
                                    <tr key={inv._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-4 font-mono text-indigo-400 text-xs font-bold">{inv.invoiceNumber}</td>
                                        <td className="px-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{inv.student?.firstName} {inv.student?.lastName}</span>
                                                <span className="text-[10px] text-slate-500">{inv.class?.name} - {inv.class?.section}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <p className="text-white font-black">${inv.totalAmount}</p>
                                            <p className="text-[9px] text-slate-500">Paid: ${inv.paidAmount}</p>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${inv.status === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                inv.status === 'unpaid' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                                }`}>
                                                {inv.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => fetchReceipt(inv._id)}
                                                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-all"
                                                >
                                                    View Receipt
                                                </button>
                                                {isAdmin && inv.status !== 'paid' && (
                                                    <button
                                                        onClick={() => { setSelectedInvoice(inv); setIsPaymentModalOpen(true); }}
                                                        className="px-4 py-1.5 bg-green-600/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/20 rounded-lg text-[10px] font-bold transition-all"
                                                    >
                                                        Add Payment
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="py-20 text-center text-slate-500">No invoices found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'expenses' && isAdmin && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-900/40 p-4 sm:p-6 rounded-[2rem] border border-white/5 shadow-xl gap-4">
                        <div className="flex gap-4">
                            <div className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <p className="text-[10px] text-slate-500 uppercase font-black">Total Expenditure</p>
                                <p className="text-red-400 font-black text-lg sm:text-xl">${expenses.reduce((s, e: any) => s + e.amount, 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold transition shadow-lg shadow-red-500/20">
                            + Record Expense
                        </button>
                    </div>

                    <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Date</th>
                                    <th className="px-8 py-5">Title</th>
                                    <th className="px-8 py-5">Category</th>
                                    <th className="px-8 py-5">Amount</th>
                                    <th className="px-8 py-5">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse italic">Scanning ledger...</td></tr>
                                ) : expenses.length > 0 ? expenses.map((exp: any) => (
                                    <tr key={exp._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-4 text-slate-500 text-xs">{new Date(exp.date).toLocaleDateString()}</td>
                                        <td className="px-8 py-4">
                                            <p className="text-white font-bold">{exp.title}</p>
                                            <p className="text-[10px] text-slate-500">{exp.description}</p>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-slate-800 text-slate-400 border border-white/5">
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 font-black text-red-400">${exp.amount.toLocaleString()}</td>
                                        <td className="px-8 py-4 text-xs text-slate-500">
                                            {exp.recordedBy?.firstName} {exp.recordedBy?.lastName}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-500">No expenses recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'structure' && isAdmin && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-start sm:justify-end">
                        <button onClick={() => setIsFeeModalOpen(true)} className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20">
                            + Define New Fee
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {feeTypes.map((ft: any) => (
                            <div key={ft._id} className="glass-dark p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                                <div className="absolute top-0 right-0 p-6 text-5xl opacity-5 group-hover:opacity-10 transition-opacity">🧾</div>
                                <h3 className="text-xl font-bold text-white mb-1">{ft.name}</h3>
                                <p className="text-slate-500 text-xs mb-4 line-clamp-2">{ft.description || 'No description provided.'}</p>
                                <div className="flex justify-between items-end mt-6">
                                    <span className="text-2xl font-black text-indigo-400">${ft.amount}</span>
                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Fixed Fee</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            {isBulkModalOpen && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="glass-dark w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6">Bulk Invoice Generator</h2>
                        <form onSubmit={handleBulkGenerate} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Target Class</label>
                                <select
                                    required value={bulkForm.classId} onChange={e => setBulkForm({ ...bulkForm, classId: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    <option value="">Choose Class...</option>
                                    {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Select Fee Components</label>
                                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2">
                                    {feeTypes.map((ft: any) => (
                                        <label key={ft._id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl cursor-pointer hover:bg-slate-800 transition">
                                            <input
                                                type="checkbox"
                                                checked={bulkForm.feeTypeIds.includes(ft._id as never)}
                                                onChange={(e) => {
                                                    const ids = e.target.checked
                                                        ? [...bulkForm.feeTypeIds, ft._id]
                                                        : bulkForm.feeTypeIds.filter(id => id !== ft._id);
                                                    setBulkForm({ ...bulkForm, feeTypeIds: ids as never[] });
                                                }}
                                                className="w-4 h-4 rounded border-white/10 bg-slate-950 text-indigo-600"
                                            />
                                            <span className="text-sm font-bold text-white">{ft.name}</span>
                                            <span className="ml-auto text-xs text-indigo-400">${ft.amount}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                                <input
                                    type="date" required value={bulkForm.dueDate} onChange={e => setBulkForm({ ...bulkForm, dueDate: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg">Generate Invoices</button>
                                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isPaymentModalOpen && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="glass-dark w-full max-w-md p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6 underline decoration-green-500 decoration-4 underline-offset-8">Record Payment</h2>
                        {selectedInvoice && (
                            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                                <p className="text-[10px] text-green-400 font-black uppercase tracking-widest mb-1">Paying For</p>
                                <p className="text-white font-bold">{selectedInvoice.student?.firstName} {selectedInvoice.student?.lastName}</p>
                                <p className="text-xs text-slate-400 mt-1">Outstanding: ${selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)}</p>
                            </div>
                        )}
                        <form onSubmit={handleRecordPayment} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Amount Paid ($)</label>
                                <input
                                    type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-green-500/50"
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                                <select
                                    value={paymentForm.paymentMethod} onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="online">Online</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Transaction ID / Ref (Opt)</label>
                                <input
                                    value={paymentForm.transactionId} onChange={e => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                    placeholder="Ref # or Slip #"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black shadow-lg">Confirm Payment</button>
                                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold">Discard</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isFeeModalOpen && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all overflow-y-auto">
                    <div className="glass-dark w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6">Define Fee Type</h2>
                        <form onSubmit={handleCreateFee} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fee Name</label>
                                <input
                                    required value={feeForm.name} onChange={e => setFeeForm({ ...feeForm, name: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="e.g. Tuition Fee"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Amount ($)</label>
                                <input
                                    type="number" required value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                <textarea
                                    value={feeForm.description} onChange={e => setFeeForm({ ...feeForm, description: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none h-24 resize-none"
                                    placeholder="Brief description of the fee..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg">Save Fee Type</button>
                                <button type="button" onClick={() => setIsFeeModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isExpenseModalOpen && isAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in transition-all overflow-y-auto">
                    <div className="glass-dark w-full max-w-lg p-6 sm:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-xl sm:text-2xl font-black text-white mb-6 underline decoration-red-500 decoration-4 underline-offset-8">Record Expenditure</h2>
                        <form onSubmit={handleCreateExpense} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Expense Title</label>
                                <input
                                    required value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                    placeholder="e.g. Electricity Bill Jan"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                                    <select
                                        value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                    >
                                        <option value="salaries">Salaries</option>
                                        <option value="rent">Rent</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="supplies">Supplies</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Amount ($)</label>
                                    <input
                                        type="number" required value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-red-500/50"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Date</label>
                                <input
                                    type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Notes</label>
                                <textarea
                                    value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none h-24 resize-none"
                                    placeholder="Optional details..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black shadow-lg">Confirm Record</button>
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {isReceiptOpen && receiptData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-3xl p-6 sm:p-12 rounded-none shadow-2xl relative my-0 sm:my-8 print:p-0 print:shadow-none print:my-0">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
                            <div className="flex items-center gap-4">
                                {tenant?.config?.logoUrl ? (
                                    <img src={tenant.config.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                ) : (
                                    <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-2xl font-serif italic">S</div>
                                )}
                                <div>
                                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">{tenant?.name}</h1>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">{tenant?.config?.address}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h2 className="text-xl font-black text-slate-300 uppercase tracking-widest">Fee Receipt</h2>
                                <p className="text-sm font-bold text-slate-900">No: {receiptData.invoiceNumber}</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Date: {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Billed To</p>
                                <p className="text-lg font-black text-slate-900">{receiptData.student?.firstName} {receiptData.student?.lastName}</p>
                                <p className="text-xs font-bold text-slate-600">ID: {receiptData.student?._id.toString().slice(-8).toUpperCase()}</p>
                                <p className="text-xs text-slate-500 italic mt-1">{receiptData.class?.name} - {receiptData.class?.section}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution Info</p>
                                <p className="text-sm font-bold text-slate-900">Academic Year: {tenant?.config?.academicYear || '2024/25'}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black">{tenant?.config?.contactEmail}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="mb-10">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-y-2 border-slate-900">
                                        <th className="py-4 text-left font-black uppercase tracking-widest text-[10px]">Description</th>
                                        <th className="py-4 text-right font-black uppercase tracking-widest text-[10px]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {receiptData.items.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-4 font-bold text-slate-800">
                                                {item.name}
                                                {item.feeType?.description && <p className="text-[10px] text-slate-400 font-medium normal-case mt-0.5">{item.feeType.description}</p>}
                                            </td>
                                            <td className="py-4 text-right font-black text-slate-900">${item.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-900">
                                    <tr>
                                        <td className="py-5 font-black uppercase tracking-widest text-xs">Total Amount</td>
                                        <td className="py-5 text-right font-black text-slate-900 text-xl">${receiptData.totalAmount.toLocaleString()}</td>
                                    </tr>
                                    <tr className="text-green-600 bg-green-50">
                                        <td className="py-3 px-4 font-black uppercase tracking-widest text-[10px]">Total Paid</td>
                                        <td className="py-3 px-4 text-right font-black text-lg">${receiptData.paidAmount.toLocaleString()}</td>
                                    </tr>
                                    {receiptData.totalAmount - receiptData.paidAmount > 0 && (
                                        <tr className="text-red-600 bg-red-50">
                                            <td className="py-3 px-4 font-black uppercase tracking-widest text-[10px]">Balance Outstanding</td>
                                            <td className="py-3 px-4 text-right font-black text-lg">${(receiptData.totalAmount - receiptData.paidAmount).toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>

                        {/* Status Stamp */}
                        <div className="flex justify-between items-center mb-10">
                            <div className="px-6 py-3 border-4 border-double border-slate-900 transform -rotate-12">
                                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                    {receiptData.status === 'paid' ? 'DOCUMENT PAID' : 'PENDING PAYMENT'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Due Date</p>
                                <p className="text-sm font-black text-slate-900">{new Date(receiptData.dueDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-8 border-t border-slate-100 flex justify-between gap-12 text-center">
                            <div className="flex-1 border-t border-slate-200 mt-10 pt-2">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Accountant Signature</p>
                            </div>
                            <div className="flex-1 italic text-slate-300 text-xs flex items-center justify-center">
                                Institution Seal & Stamp Placeholder
                            </div>
                            <div className="flex-1 border-t border-slate-200 mt-10 pt-2">
                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Parent/Payer Signature</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col sm:flex-row sm:absolute -top-16 right-0 gap-4 print:hidden mb-8 sm:mb-0 px-6 sm:px-0">
                            <button onClick={() => window.print()} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-full font-black shadow-xl uppercase tracking-widest text-xs">Print Receipt</button>
                            <button onClick={() => setIsReceiptOpen(false)} className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-full font-black shadow-xl uppercase tracking-widest text-xs">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
