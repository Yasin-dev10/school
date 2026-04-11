"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';

export default function TeacherDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('profile');

    useEffect(() => {
        const fetchTeacher = async () => {
            try {
                const { data } = await api.get(`/teachers/${id}`);
                setTeacher(data.data);
            } catch (error) {
                console.error("Failed to fetch teacher profile", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTeacher();
    }, [id]);

    const handleTerminate = async () => {
        if (!confirm('Are you sure you want to terminate this teacher? This action cannot be undone.')) {
            return;
        }
        try {
            await api.delete(`/teachers/${id}`);
            alert('Teacher record terminated successfully.');
            router.push('/dashboard/teachers');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to terminate teacher profile');
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500 font-medium animate-pulse italic">Retrieving faculty profile...</div>;
    if (!teacher) return <div className="p-20 text-center text-red-500 font-bold">Faculty record not found.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/teachers" className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition">
                        ←
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-500/30">
                            {teacher.firstName.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{teacher.firstName} {teacher.lastName}</h1>
                            <p className="text-purple-400 font-mono text-sm">{teacher.profile?.designation}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Link href={`/dashboard/teachers/${id}/edit`} className="flex-1 md:flex-none px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold border border-white/5 hover:bg-slate-700 transition text-center">
                        ✏️ Edit Profile
                    </Link>
                    <button
                        onClick={handleTerminate}
                        className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500 hover:text-white transition"
                    >
                        🚫 Terminate
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b border-white/5">
                {['profile', 'classes', 'salary', 'attendance'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${view === tab ? 'text-purple-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab}
                        {view === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500 rounded-full"></div>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {view === 'profile' && (
                    <>
                        <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8">
                                <h3 className="text-xl font-bold text-white">Employment Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { label: 'Qualification', value: teacher.profile?.qualification || 'Not Set' },
                                        { label: 'Work Phone', value: teacher.profile?.phone || 'Not Set' },
                                        { label: 'Official Email', value: teacher.email },
                                        { label: 'Status', value: teacher.status },
                                        { label: 'Joining Date', value: new Date(teacher.createdAt).toLocaleDateString() },
                                        { label: 'Staff Role', value: teacher.role },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{item.label}</p>
                                            <p className="text-slate-200 font-medium">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Payroll Stats</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Monthly Salary</span>
                                        <span className="text-green-400 font-bold">${teacher.profile?.salary || '0.00'}</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Teaching Hours</span>
                                        <span className="text-purple-400 font-bold">42h / Week</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {view === 'classes' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4">
                        <div className="glass-dark p-8 rounded-[2rem] border border-white/5">
                            <h3 className="text-xl font-bold text-white mb-6">Assigned Classes</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Placeholder for classes - will be populated from API */}
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-lg font-bold text-white">Class 10-A</h4>
                                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-lg">Mathematics</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Students</span>
                                            <span className="text-white font-medium">32</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Periods/Week</span>
                                            <span className="text-white font-medium">6</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 italic">
                                    No additional classes assigned
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'salary' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4">
                        <div className="glass-dark p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Salary History</h3>
                                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition">
                                    Generate Payslip
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Month</th>
                                            <th className="px-6 py-4 text-left">Base Salary</th>
                                            <th className="px-6 py-4 text-left">Allowances</th>
                                            <th className="px-6 py-4 text-left">Deductions</th>
                                            <th className="px-6 py-4 text-left">Net Pay</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {/* Placeholder data */}
                                        <tr className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 text-white font-medium">January 2026</td>
                                            <td className="px-6 py-4 text-slate-300">${teacher.profile?.salary || '0.00'}</td>
                                            <td className="px-6 py-4 text-green-400">$200.00</td>
                                            <td className="px-6 py-4 text-red-400">$50.00</td>
                                            <td className="px-6 py-4 text-white font-bold">${(parseFloat(teacher.profile?.salary || '0') + 200 - 50).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-lg border border-green-500/20">Paid</span>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 text-white font-medium">December 2025</td>
                                            <td className="px-6 py-4 text-slate-300">${teacher.profile?.salary || '0.00'}</td>
                                            <td className="px-6 py-4 text-green-400">$200.00</td>
                                            <td className="px-6 py-4 text-red-400">$50.00</td>
                                            <td className="px-6 py-4 text-white font-bold">${(parseFloat(teacher.profile?.salary || '0') + 200 - 50).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-lg border border-green-500/20">Paid</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'attendance' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4">
                        <div className="glass-dark p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Attendance Record</h3>
                                <div className="flex gap-3">
                                    <select className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                                        <option>January 2026</option>
                                        <option>December 2025</option>
                                        <option>November 2025</option>
                                    </select>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl border border-green-500/20">
                                    <p className="text-xs text-green-400 uppercase font-black tracking-widest mb-2">Present Days</p>
                                    <p className="text-3xl font-black text-white">22</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-red-500/10 to-red-500/5 rounded-2xl border border-red-500/20">
                                    <p className="text-xs text-red-400 uppercase font-black tracking-widest mb-2">Absent Days</p>
                                    <p className="text-3xl font-black text-white">1</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-2xl border border-yellow-500/20">
                                    <p className="text-xs text-yellow-400 uppercase font-black tracking-widest mb-2">Leave Days</p>
                                    <p className="text-3xl font-black text-white">2</p>
                                </div>
                                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl border border-purple-500/20">
                                    <p className="text-xs text-purple-400 uppercase font-black tracking-widest mb-2">Attendance Rate</p>
                                    <p className="text-3xl font-black text-white">88%</p>
                                </div>
                            </div>

                            {/* Calendar/List View */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Date</th>
                                            <th className="px-6 py-4 text-left">Check In</th>
                                            <th className="px-6 py-4 text-left">Check Out</th>
                                            <th className="px-6 py-4 text-left">Hours</th>
                                            <th className="px-6 py-4 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {/* Placeholder data */}
                                        {[
                                            { date: 'Jan 2, 2026', checkIn: '08:00 AM', checkOut: '04:00 PM', hours: '8h', status: 'present' },
                                            { date: 'Jan 1, 2026', checkIn: '08:15 AM', checkOut: '04:10 PM', hours: '7.9h', status: 'present' },
                                            { date: 'Dec 31, 2025', checkIn: '-', checkOut: '-', hours: '-', status: 'absent' },
                                        ].map((record, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 text-white font-medium">{record.date}</td>
                                                <td className="px-6 py-4 text-slate-300">{record.checkIn}</td>
                                                <td className="px-6 py-4 text-slate-300">{record.checkOut}</td>
                                                <td className="px-6 py-4 text-slate-300">{record.hours}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${record.status === 'present'
                                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        }`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
