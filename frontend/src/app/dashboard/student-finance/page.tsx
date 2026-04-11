"use client";
import { useState, useEffect } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '../../../lib/stripe';
import StripePaymentForm from '../../../components/StripePaymentForm';
import api from '../../utils/api';
import {
    DollarSign,
    CreditCard,
    Receipt,
    Clock,
    Download,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function StudentFinancePage() {
    const [user, setUser] = useState<any>(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [receiptData, setReceiptData] = useState<any>(null);
    const [isReceiptOpen, setIsReceiptOpen] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) return;
            const userData = JSON.parse(userStr);
            setUser(userData);

            const [tenRes] = await Promise.all([
                api.get('/tenants/me')
            ]);
            setTenant(tenRes.data.data);

            if (userData.role === 'student') {
                const { data } = await api.get(`/fees/invoices?studentId=${userData._id}`);
                setInvoices(data.data);
            } else if (userData.role === 'parent') {
                const { data } = await api.get('/students/my-children');
                setChildren(data.data || []);
            }
        } catch (err) {
            console.error("Finance data fetch failed", err);
            toast.error("Failed to load financial data");
        } finally {
            setLoading(false);
        }
    };

    const fetchChildInvoices = async (childId: string) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/fees/invoices?studentId=${childId}`);
            setInvoices(data.data);
        } catch (err) {
            toast.error("Failed to load invoices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChildSelect = (child: any) => {
        setSelectedChild(child);
        fetchChildInvoices(child._id);
    };

    const handlePayNow = async (invoice: any) => {
        if (invoice.status === 'paid') {
            toast.error('Invoice is already paid');
            return;
        }

        setPaymentLoading(true);
        try {
            const { data } = await api.post('/stripe/create-payment-intent', {
                invoiceId: invoice._id
            });

            setSelectedInvoice({
                ...invoice,
                outstandingAmount: data.data.invoice.outstandingAmount
            });
            setClientSecret(data.data.clientSecret);
            setShowPaymentModal(true);
        } catch (error: any) {
            console.error('Payment intent creation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to initialize payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setClientSecret(null);
        setSelectedInvoice(null);
        toast.success('Payment completed successfully!');
        
        // Refresh invoices
        if (user?.role === 'student') {
            fetchData();
        } else if (selectedChild) {
            fetchChildInvoices(selectedChild._id);
        }
    };

    const handlePaymentCancel = () => {
        setShowPaymentModal(false);
        setClientSecret(null);
        setSelectedInvoice(null);
    };

    const fetchReceipt = async (id: string) => {
        try {
            setLoading(true);
            const { data } = await api.get(`/fees/invoices/${id}`);
            setReceiptData(data.data);
            setIsReceiptOpen(true);
        } catch (err) {
            toast.error("Failed to load receipt");
        } finally {
            setLoading(false);
        }
    };

    const totalExpected = invoices.reduce((s, i: any) => s + (i.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((s, i: any) => s + (i.paidAmount || 0), 0);
    const totalPending = totalExpected - totalPaid;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        {user?.role === 'parent' ? 'Family Billing' : 'My Financials'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {user?.role === 'parent' ? 'Manage your children\'s tuition fees and history.' : 'Manage your tuition fees and payment history.'}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                        Status: Clear
                    </span>
                </div>
            </div>

            {user?.role === 'parent' && !selectedChild && (
                <div className="py-12 space-y-8 animate-in fade-in slide-in-from-bottom-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Select a Student</h2>
                        <p className="text-slate-500 font-medium">Choose a child to view their detailed financial record.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {children.map((child: any) => (
                            <button
                                key={child._id}
                                onClick={() => handleChildSelect(child)}
                                className="glass-dark p-10 rounded-[3rem] border border-white/5 text-left hover:border-indigo-500/50 hover:bg-slate-900/40 transition-all group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 group-hover:scale-110 transition-transform">🎓</div>
                                <div className="w-16 h-16 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-3xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                    {child.firstName?.[0] || 'S'}
                                </div>
                                <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">{child.firstName} {child.lastName}</h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-2">
                                    Class {child.profile?.class || 'N/A'} - Section {child.profile?.section || 'N/A'}
                                </p>
                                <div className="mt-8 flex items-center gap-2 text-indigo-400 font-bold text-sm">
                                    View Financial Ledger
                                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {(user?.role === 'student' || (user?.role === 'parent' && selectedChild)) && (
                <>
                    {user?.role === 'parent' && (
                        <button
                            onClick={() => setSelectedChild(null)}
                            className="flex items-center gap-2 text-sm font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors mb-4"
                        >
                            ← Back to Student List
                        </button>
                    )}

                    {user?.role === 'parent' && selectedChild && (
                        <div className="mb-8 p-6 glass border-indigo-500/20 bg-indigo-500/5 rounded-[2rem] flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl">
                                {selectedChild.firstName?.[0] || 'S'}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Focus</p>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedChild.firstName} {selectedChild.lastName}</h2>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="glass p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <DollarSign className="w-24 h-24" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Tuition</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-900 dark:text-white">${totalExpected.toLocaleString()}</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Calendar className="w-3.5 h-3.5" />
                                Academic Year 2024/25
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CheckCircle2 className="w-24 h-24 text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Amount Paid</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-emerald-500">${totalPaid.toLocaleString()}</span>
                                <span className="text-sm font-bold text-slate-400">/ ${totalExpected.toLocaleString()}</span>
                            </div>
                            <div className="mt-4 w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-1000"
                                    style={{ width: `${totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="glass-dark bg-indigo-600 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group shadow-2xl shadow-indigo-600/20">
                            <div className="absolute top-0 right-0 p-4 opacity-20">
                                <Clock className="w-20 h-20 text-white" />
                            </div>
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4">Outstanding Balance</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white">${totalPending.toLocaleString()}</span>
                            </div>
                            {totalPending > 0 && (
                                <button 
                                    onClick={() => {
                                        // Find first unpaid invoice
                                        const unpaidInvoice = invoices.find((inv: any) => inv.status !== 'paid');
                                        if (unpaidInvoice) {
                                            handlePayNow(unpaidInvoice);
                                        }
                                    }}
                                    disabled={paymentLoading}
                                    className="mt-6 w-full py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    {paymentLoading ? 'Processing...' : 'Pay Now'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Invoices Table */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Billing History</h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{invoices.length} Records Found</p>
                        </div>

                        <div className="glass dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl overflow-x-auto">
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="text-[10px] uppercase bg-slate-50 dark:bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-slate-100 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-5">Invoice Details</th>
                                        <th className="px-8 py-5">Amount</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Timeline</th>
                                        <th className="px-8 py-5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="py-24 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                                    <p className="text-slate-500 font-bold italic">Synchronizing ledger...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : invoices.length > 0 ? invoices.map((inv: any) => (
                                        <tr key={inv._id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600">
                                                        <Receipt className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white font-mono uppercase">{inv.invoiceNumber}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Academic Fee Component</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white">${inv.totalAmount.toLocaleString()}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold">Paid: ${inv.paidAmount?.toLocaleString() || 0}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${inv.status === 'paid'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                        : inv.status === 'unpaid'
                                                            ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                                            : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                                    }`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="w-4 h-4" />
                                                    <span className="text-xs font-bold italic">{new Date(inv.dueDate).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    {inv.status !== 'paid' && (
                                                        <button
                                                            onClick={() => handlePayNow(inv)}
                                                            disabled={paymentLoading}
                                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <CreditCard className="w-3.5 h-3.5" />
                                                            {paymentLoading ? 'Loading...' : 'Pay'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => fetchReceipt(inv._id)}
                                                        className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        View Receipt
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-24 text-center">
                                                <div className="flex flex-col items-center opacity-30">
                                                    <AlertCircle className="w-16 h-16 mb-4" />
                                                    <p className="text-xl font-black uppercase tracking-tighter">No Financial Records</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Receipt Modal */}
            {isReceiptOpen && receiptData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-3xl p-6 sm:p-12 rounded-none shadow-2xl relative my-0 sm:my-8 print:p-0 print:shadow-none print:my-0">
                        <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-2xl font-serif italic">S</div>
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

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Billed To</p>
                                <p className="text-lg font-black text-slate-900">{receiptData.student?.firstName} {receiptData.student?.lastName}</p>
                                <p className="text-xs font-bold text-slate-600">ID: {receiptData.student?._id?.toString().slice(-8).toUpperCase() || 'N/A'}</p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution Info</p>
                                <p className="text-sm font-bold text-slate-900">Academic Year: 2024/25</p>
                            </div>
                        </div>

                        <div className="mb-10">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-y-2 border-slate-900">
                                        <th className="py-4 text-left font-black uppercase tracking-widest text-[10px]">Description</th>
                                        <th className="py-4 text-right font-black uppercase tracking-widest text-[10px]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(receiptData.items || []).map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="py-4 font-bold text-slate-800">{item.name}</td>
                                            <td className="py-4 text-right font-black text-slate-900">${(item.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-900">
                                    <tr>
                                        <td className="py-5 font-black uppercase tracking-widest text-xs">Total Amount</td>
                                        <td className="py-5 text-right font-black text-slate-900 text-xl">${(receiptData.totalAmount || 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-between items-center mb-10">
                            <div className="px-6 py-3 border-4 border-double border-slate-900 transform -rotate-12">
                                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                                    {receiptData.status === 'paid' ? 'DOCUMENT PAID' : 'PENDING PAYMENT'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:absolute -top-16 right-0 gap-4 print:hidden mb-8 sm:mb-0 px-6 sm:px-0">
                            <button onClick={() => window.print()} className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-full font-black shadow-xl uppercase tracking-widest text-xs transition-all hover:bg-indigo-500">Print Receipt</button>
                            <button onClick={() => setIsReceiptOpen(false)} className="w-full sm:w-auto px-8 py-3 bg-slate-800 text-white rounded-full font-black shadow-xl uppercase tracking-widest text-xs transition-all hover:bg-slate-700">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stripe Payment Modal */}
            {showPaymentModal && clientSecret && selectedInvoice && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
                    <div className="relative max-w-lg w-full">
                        <button
                            onClick={handlePaymentCancel}
                            className="absolute -top-4 -right-4 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        <Elements 
                            stripe={stripePromise} 
                            options={{
                                clientSecret,
                                appearance: {
                                    theme: 'stripe',
                                    variables: {
                                        colorPrimary: '#4f46e5',
                                    },
                                },
                            }}
                        >
                            <StripePaymentForm
                                invoice={selectedInvoice}
                                onSuccess={handlePaymentSuccess}
                                onCancel={handlePaymentCancel}
                            />
                        </Elements>
                    </div>
                </div>
            )}
        </div>
    );
}