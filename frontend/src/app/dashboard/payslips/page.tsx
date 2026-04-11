"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function PayslipsPage() {
    const [salaries, setSalaries] = useState([]);
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSalary, setSelectedSalary] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            const [salRes, tenRes] = await Promise.all([
                api.get('/salaries/me'),
                api.get('/tenants/me')
            ]);
            setSalaries(salRes.data.data);
            setTenant(tenRes.data.data);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">My Payslips</h1>
                <p className="text-slate-500 mt-1">View and download your salary history and payslips.</p>
            </div>

            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Period</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Basic Salary</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Net Payable</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="p-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center text-slate-500 animate-pulse font-medium italic">
                                    Loading salary records...
                                </td>
                            </tr>
                        ) : salaries.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-20 text-center text-slate-600 italic">
                                    No payslips generated yet.
                                </td>
                            </tr>
                        ) : salaries.map((s: any) => (
                            <tr key={s._id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-6">
                                    <p className="text-white font-bold">{s.month} {s.year}</p>
                                    <p className="text-[10px] text-slate-500 font-mono uppercase">Processed on {new Date(s.createdAt).toLocaleDateString()}</p>
                                </td>
                                <td className="p-6 text-slate-300 font-medium">${s.basicSalary.toLocaleString()}</td>
                                <td className="p-6 text-emerald-400 font-black">${s.netSalary.toLocaleString()}</td>
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${s.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                        }`}>
                                        {s.status}
                                    </span>
                                </td>
                                <td className="p-6 text-right">
                                    <button
                                        onClick={() => { setSelectedSalary(s); setIsModalOpen(true); }}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl transition shadow-lg shadow-indigo-500/20 opacity-0 group-hover:opacity-100"
                                    >
                                        View Payslip
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Payslip Modal */}
            {isModalOpen && selectedSalary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in overflow-y-auto">
                    <div className="bg-white text-slate-900 w-full max-w-2xl p-12 shadow-2xl relative my-8 print:p-0 print:shadow-none print:my-0 rounded-none">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-10">
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter">{tenant?.name || 'School Registry'}</h1>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">{tenant?.config?.address || 'Institutional Finance'}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-slate-300 uppercase tracking-widest">Office Copy</h2>
                                <p className="text-slate-900 font-bold">Payslip #{selectedSalary._id.slice(-8).toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Employee Info */}
                        <div className="grid grid-cols-2 gap-12 mb-12">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Employee Details</p>
                                <p className="text-xl font-bold text-slate-900">Teacher Account</p>
                                <p className="text-sm text-slate-500">Academic Faculty</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Pay Period</p>
                                <p className="text-xl font-bold text-slate-900">{selectedSalary.month} {selectedSalary.year}</p>
                                <p className="text-sm text-slate-500">Status: {selectedSalary.status.toUpperCase()}</p>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-10 border-t-2 border-slate-100 pt-10">
                            <div className="grid grid-cols-2 gap-12">
                                {/* Earnings */}
                                <div>
                                    <h3 className="text-xs font-black uppercase text-slate-900 mb-4 tracking-wider">Earnings</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span>Basic Salary</span>
                                            <span className="font-bold">${selectedSalary.basicSalary.toLocaleString()}</span>
                                        </div>
                                        {selectedSalary.allowances?.map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{a.name}</span>
                                                <span className="font-bold text-emerald-600">+${a.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Deductions */}
                                <div>
                                    <h3 className="text-xs font-black uppercase text-slate-900 mb-4 tracking-wider">Deductions</h3>
                                    <div className="space-y-3">
                                        {selectedSalary.deductions?.length > 0 ? selectedSalary.deductions.map((d: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm">
                                                <span>{d.name}</span>
                                                <span className="font-bold text-rose-600">-${d.amount.toLocaleString()}</span>
                                            </div>
                                        )) : (
                                            <p className="text-xs text-slate-400 italic">No deductions applied</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Net Total */}
                            <div className="bg-slate-900 p-8 flex justify-between items-center mt-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">Net Payable</p>
                                    <p className="text-white text-sm font-medium italic">Amount credited to your account</p>
                                </div>
                                <p className="text-4xl font-black text-white">${selectedSalary.netSalary.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between items-end mt-20 px-4">
                            <div className="text-center w-40 border-t border-slate-200 pt-4">
                                <p className="text-[10px] font-black uppercase text-slate-400">Accountant</p>
                            </div>
                            <div className="text-center w-40 border-t border-slate-200 pt-4">
                                <p className="text-[10px] font-black uppercase text-slate-400">Employee Signature</p>
                            </div>
                        </div>

                        <div className="mt-12 text-center text-[10px] text-slate-400 italic flex justify-center gap-4">
                            <span>Generated on {new Date().toLocaleString()}</span>
                            <span>•</span>
                            <span>Secure Document #PAY-{selectedSalary._id.slice(-6).toUpperCase()}</span>
                        </div>

                        {/* Controls */}
                        <div className="absolute top-0 right-0 p-4 flex gap-3 print:hidden -mt-16">
                            <button
                                onClick={() => window.print()}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-full font-black shadow-xl hover:bg-indigo-500 transition-all uppercase tracking-widest text-[10px]"
                            >
                                Print Document
                            </button>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3 bg-slate-800 text-white rounded-full font-black shadow-xl hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
