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
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/teachers" className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition">
                        ←
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-purple-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-500/30">
                            {teacher.firstName?.charAt(0) || 'T'}
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
                {['profile', 'classes', 'salary', 'schedule'].map((tab) => (
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
                                        <span className="text-purple-400 font-bold">
                                            {(teacher.timetable || []).reduce((total: number, slot: any) => {
                                                const [sh, sm] = slot.startTime.split(':').map(Number);
                                                const [eh, em] = slot.endTime.split(':').map(Number);
                                                return total + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
                                            }, 0) / 60}h / Week
                                        </span>
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
                                {(teacher.assignedClasses || []).map((assigned: any) => (
                                    <div key={`${assigned.id}-${assigned.subject?.id}`} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition">
                                        <div className="flex items-center justify-between gap-3">
                                            <h4 className="text-lg font-bold text-white">{assigned.name}-{assigned.section}</h4>
                                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-lg">{assigned.subject?.name}</span>
                                        </div>
                                    </div>
                                ))}
                                {(teacher.assignedClasses || []).length === 0 && (
                                    <div className="p-6 bg-white/5 rounded-2xl border border-dashed border-white/10 text-slate-500 italic">No classes assigned.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'salary' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4">
                        <div className="glass-dark p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Salary History</h3>
                                <Link href="/dashboard/hr" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition">
                                    Generate Payslip
                                </Link>
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
                                        {(teacher.salaries || []).map((salary: any) => (
                                            <tr key={salary.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 text-white font-medium">{salary.month} {salary.year}</td>
                                                <td className="px-6 py-4 text-slate-300">${salary.basicSalary.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-green-400">${salary.allowances.reduce((sum: number, item: any) => sum + item.amount, 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-red-400">${salary.deductions.reduce((sum: number, item: any) => sum + item.amount, 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-white font-bold">${salary.netSalary.toFixed(2)}</td>
                                                <td className="px-6 py-4 capitalize">{salary.status}</td>
                                            </tr>
                                        ))}
                                        {(teacher.salaries || []).length === 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-500">No salary records.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'schedule' && (
                    <div className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4">
                        <div className="glass-dark p-8 rounded-[2rem] border border-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Weekly Teaching Schedule</h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="text-xs uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Day</th>
                                            <th className="px-6 py-4 text-left">Time</th>
                                            <th className="px-6 py-4 text-left">Class</th>
                                            <th className="px-6 py-4 text-left">Subject</th>
                                            <th className="px-6 py-4 text-left">Room</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(teacher.timetable || []).map((slot: any) => (
                                            <tr key={slot.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 text-white font-medium">{slot.day}</td>
                                                <td className="px-6 py-4 text-slate-300">{slot.startTime}–{slot.endTime}</td>
                                                <td className="px-6 py-4 text-slate-300">{slot.class?.name}-{slot.class?.section}</td>
                                                <td className="px-6 py-4 text-slate-300">{slot.subject?.name}</td>
                                                <td className="px-6 py-4 text-slate-300">{slot.room || '—'}</td>
                                            </tr>
                                        ))}
                                        {(teacher.timetable || []).length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">No timetable assigned.</td></tr>}
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
