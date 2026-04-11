"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function HRPage() {
    const [staff, setStaff] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('staff'); // 'staff', 'payroll'

    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<any>(null);
    const [payrollForm, setPayrollForm] = useState({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear().toString(),
        basicSalary: '',
        allowances: [],
        deductions: []
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, salRes] = await Promise.all([
                api.get('/teachers'), // Using teachers as staff for now
                api.get('/salaries')
            ]);
            setStaff(staffRes.data.data);
            setSalaries(salRes.data.data);
        } catch (err) {
            console.error("HR data fetch failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGeneratePayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/salaries', {
                ...payrollForm,
                userId: selectedMember._id,
                basicSalary: parseFloat(payrollForm.basicSalary)
            });
            setIsPayrollModalOpen(false);
            fetchData();
            alert("Payslip generated successfully!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to generate payroll");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Human Capital</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage workforce performance and synchronized compensation cycles.</p>
                </div>
                <div className="flex w-full lg:w-auto bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                    <button onClick={() => setView('staff')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'staff' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Directory</button>
                    <button onClick={() => setView('payroll')} className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'payroll' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Ledger</button>
                </div>
            </div>

            {view === 'staff' && (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Personnel</th>
                                    <th className="px-8 py-5 text-center">Designation</th>
                                    <th className="px-8 py-5 text-center">Communications</th>
                                    <th className="px-8 py-5 text-center">Condition</th>
                                    <th className="px-8 py-5 text-right">Accounting</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse italic text-sm font-bold">Scanning workforce database...</td></tr>
                                ) : staff.map((member: any) => (
                                    <tr key={member._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                                                    {member.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold mb-0.5">{member.firstName} {member.lastName}</div>
                                                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{member._id.slice(-6)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{member.role}</td>
                                        <td className="px-8 py-4 text-center text-xs text-slate-400 font-medium">{member.email}</td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5">Operational</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button
                                                onClick={() => { setSelectedMember(member); setIsPayrollModalOpen(true); }}
                                                className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/10"
                                            >
                                                Process Slip
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'payroll' && (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left min-w-[800px]">
                            <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Authorization ID</th>
                                    <th className="px-8 py-5">Recipient</th>
                                    <th className="px-8 py-5 text-center">Cycle</th>
                                    <th className="px-8 py-5 text-center">Quantum</th>
                                    <th className="px-8 py-5 text-right">Condition</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-600 animate-pulse italic text-sm font-bold">Accessing financial archives...</td></tr>
                                ) : salaries.length > 0 ? salaries.map((sal: any) => (
                                    <tr key={sal._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 font-mono text-indigo-400 text-[10px] font-black uppercase tracking-widest">{sal._id}</td>
                                        <td className="px-8 py-4">
                                            <span className="text-white font-bold">{sal.user?.firstName} {sal.user?.lastName}</span>
                                        </td>
                                        <td className="px-8 py-4 text-center text-[10px] text-slate-500 font-black uppercase tracking-widest">{sal.month} {sal.year}</td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="px-4 py-1.5 bg-emerald-500/10 text-white font-black text-xs rounded-xl border border-emerald-500/20 shadow-lg shadow-emerald-500/5">${sal.netSalary.toLocaleString()}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-black uppercase tracking-widest">Finalized</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="py-20 text-center text-slate-500 text-sm font-bold opacity-30 italic font-mono uppercase tracking-[0.3em]">Institutional archive is empty.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isPayrollModalOpen && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="glass-dark w-full max-w-lg p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95 my-8">
                        <h2 className="text-2xl font-black text-white mb-8 tracking-tighter">Issue Compensation Slip</h2>
                        <div className="mb-8 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex items-center gap-5 shadow-inner">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/20 flex items-center justify-center text-white font-black text-2xl">
                                {selectedMember.firstName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-white font-black text-xl leading-tight">{selectedMember.firstName} {selectedMember.lastName}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{selectedMember.role}</p>
                            </div>
                        </div>

                        <form onSubmit={handleGeneratePayroll} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Payroll Cycle</label>
                                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                                        <select
                                            value={payrollForm.month} onChange={e => setPayrollForm({ ...payrollForm, month: e.target.value })}
                                            className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                                        >
                                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                <option key={m} value={m} className="bg-slate-900">{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Calendar Year</label>
                                    <input
                                        type="number" value={payrollForm.year} onChange={e => setPayrollForm({ ...payrollForm, year: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-900/50 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-black text-xs"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gross Base Compensation ($)</label>
                                <input
                                    type="number" required value={payrollForm.basicSalary} onChange={e => setPayrollForm({ ...payrollForm, basicSalary: e.target.value })}
                                    className="w-full px-6 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-black text-lg"
                                    placeholder="0,000.00"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-95">Verify & Disburse</button>
                                <button type="button" onClick={() => setIsPayrollModalOpen(false)} className="flex-1 py-4 bg-slate-800/50 text-slate-500 rounded-[2rem] font-black text-sm hover:bg-white/5 transition-all">Discard</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
