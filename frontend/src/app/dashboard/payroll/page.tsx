"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';

interface Salary {
    _id: string;
    month: string;
    year: number;
    status: string;
    basicSalary: number;
    user: any;
}

export default function PayrollPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [salaries, setSalaries] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    // Default to current month/year
    const [month, setMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch teachers/staff
            const staffRes = await api.get('/teachers');
            setStaff(staffRes.data.data);

            // Fetch salaries
            const salariesRes = await api.get('/salaries');
            setSalaries(salariesRes.data.data); // Returns all history
        } catch (error) {
            console.error("Failed to fetch payroll data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRunPayroll = async () => {
        if (!confirm(`Are you sure you want to run payroll for ${month} ${year}? This will generate pending payslips for all active staff.`)) {
            return;
        }

        setRunning(true);
        try {
            const { data } = await api.post('/salaries/run', { month, year });
            alert(data.message);
            fetchData(); // Refresh data to show new slips
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to run payroll');
        } finally {
            setRunning(false);
        }
    };

    // Filter salaries for current view
    const currentMonthSalaries = salaries.filter((s: any) => s.month === month && s.year === year);

    // Stats
    const totalPayrollCost = currentMonthSalaries.reduce((acc, curr: any) => acc + (curr.basicSalary || 0), 0);
    const pendingCount = currentMonthSalaries.filter((s: any) => s.status === 'pending').length;
    const paidCount = currentMonthSalaries.filter((s: any) => s.status === 'paid').length;

    // Helper to get salary info for a staff member
    const getSalaryInfo = (userId: string) => {
        return currentMonthSalaries.find((s: any) => s.user._id === userId || s.user === userId);
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Financial Payroll</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage salaries, payslips, and staff compensation cycles.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    <button
                        onClick={handleRunPayroll}
                        disabled={running}
                        className="flex-1 lg:flex-none px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    >
                        {running ? 'Processing...' : `Run ${month} Payroll`}
                    </button>
                    <button className="flex-1 lg:flex-none px-6 py-3.5 bg-slate-900/50 border border-white/5 text-slate-400 rounded-2xl font-bold hover:bg-white/5 transition-all text-sm">
                        Payroll Settings
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="p-6 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">💰</div>
                    <p className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em] mb-3">Total Monthly Liability</p>
                    <p className="text-3xl sm:text-4xl font-black text-white">${totalPayrollCost.toLocaleString()}</p>
                    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">{month} Cycle</p>
                </div>
                <div className="p-6 bg-green-500/10 rounded-[2rem] border border-green-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">✅</div>
                    <p className="text-[10px] text-green-400 uppercase font-black tracking-[0.2em] mb-3">Disbursed Payments</p>
                    <p className="text-3xl sm:text-4xl font-black text-white">{paidCount} / {staff.length}</p>
                    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">Staff Members</p>
                </div>
                <div className="p-6 bg-orange-500/10 rounded-[2rem] border border-orange-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">⏳</div>
                    <p className="text-[10px] text-orange-400 uppercase font-black tracking-[0.2em] mb-3">Pending Disbursement</p>
                    <p className="text-3xl sm:text-4xl font-black text-white">{pendingCount}</p>
                    <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">Requires Approval</p>
                </div>
            </div>

            {/* List */}
            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="text-lg font-bold text-white">Monthly Salary Ledger - {month} {year}</h3>
                    <div className="relative w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Search employee..."
                            className="w-full sm:w-64 bg-slate-950/50 border border-white/10 rounded-xl px-5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Employee</th>
                                <th className="px-8 py-5">Designation</th>
                                <th className="px-8 py-5">Base Salary</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-600 animate-pulse italic">Compiling payroll data...</td></tr>
                            ) : staff.map((member: any) => {
                                const salaryRecord = getSalaryInfo(member._id);
                                const status = salaryRecord ? salaryRecord.status : 'not_generated';
                                const displaySalary = salaryRecord ? salaryRecord.basicSalary : (member.profile?.salary || '0.00');

                                return (
                                    <tr key={member._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {member.firstName.charAt(0)}
                                                </div>
                                                <span className="font-bold text-white">{member.firstName} {member.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4 text-slate-500 text-xs font-medium">{member.profile?.designation || 'Specialist Staff'}</td>
                                        <td className="px-8 py-4 text-white font-black text-sm">${displaySalary.toLocaleString()}</td>
                                        <td className="px-8 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border ${status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                    'bg-slate-800 text-slate-500 border-white/5'
                                                }`}>
                                                {status === 'not_generated' ? 'Dormant' : status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            {status === 'not_generated' ? (
                                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic opacity-40">Awaiting Cycle</span>
                                            ) : (
                                                <div className="flex items-center justify-end gap-3">
                                                    {status === 'pending' && salaryRecord && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm('Mark this salary as Paid?')) return;
                                                                try {
                                                                    await api.put(`/salaries/${salaryRecord._id}/pay`);
                                                                    fetchData();
                                                                } catch (err: any) {
                                                                    alert(err.response?.data?.message || 'Failed to pay');
                                                                }
                                                            }}
                                                            className="px-4 py-1.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/20 rounded-lg text-[10px] font-black transition-all shadow-lg shadow-green-500/10"
                                                        >
                                                            Disburse
                                                        </button>
                                                    )}
                                                    <Link href={`/dashboard/teachers/${member._id}`} className="px-4 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-black transition-all">
                                                        View Personnel
                                                    </Link>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
