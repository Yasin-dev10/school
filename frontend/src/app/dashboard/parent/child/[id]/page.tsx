"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../utils/api';
import Link from 'next/link';

export default function ChildDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [child, setChild] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [marks, setMarks] = useState([]);
    const [timetable, setTimetable] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [childRes, attRes, marksRes, ttRes] = await Promise.all([
                    api.get(`/students/${id}`),
                    api.get(`/parent/child/${id}/attendance`),
                    api.get(`/parent/child/${id}/marks`),
                    api.get(`/parent/child/${id}/timetable`)
                ]);

                setChild(childRes.data.data);
                setAttendance(attRes.data.data);
                setMarks(marksRes.data.data);
                setTimetable(ttRes.data.data);
            } catch (error) {
                console.error("Failed to fetch child data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
    );

    if (!child) return <div className="p-8 text-center text-white">Child not found.</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/20">
                        {child.firstName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">{child.firstName} {child.lastName}</h1>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
                            Class {child.profile?.class} - {child.profile?.section} • Roll No: {child.profile?.rollNo}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold transition border border-white/5 text-sm">
                        💬 Message Teacher
                    </button>
                    <button onClick={() => router.back()} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-sm">
                        Back to Portal
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                {[
                    { label: 'Attendance', value: attendance?.stats?.percentage + '%', icon: '📅', color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Average Mark', value: marks.length > 0 ? (marks.reduce((acc: any, m: any) => acc + (m.marksObtained / m.maxMarks * 100), 0) / marks.length).toFixed(1) + '%' : 'N/A', icon: '📈', color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                    { label: 'Pending Assignments', value: '4', icon: '📝', color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Behavhior Score', value: 'Excellent', icon: '🌟', color: 'text-purple-400', bg: 'bg-purple-400/10' },
                ].map((stat, i) => (
                    <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                        <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-1 overflow-x-auto no-scrollbar">
                {['overview', 'attendance', 'academics', 'timetable'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-4 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-500">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Performance */}
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6">Recent Exam Results</h2>
                            <div className="space-y-4">
                                {marks.slice(0, 5).map((m: any) => (
                                    <div key={m._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-bold border border-white/5">
                                                {m.subject?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white group-hover:text-indigo-400 transition">{m.subject?.name}</h4>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{m.exam?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-white">{m.marksObtained}/{m.maxMarks}</p>
                                            <p className="text-[10px] text-green-400 font-bold uppercase">{((m.marksObtained / m.maxMarks) * 100).toFixed(0)}%</p>
                                        </div>
                                    </div>
                                ))}
                                {marks.length === 0 && <div className="py-20 text-center text-slate-600 italic">No academic records yet.</div>}
                            </div>
                        </div>

                        {/* Recent Attendance */}
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5">
                            <h2 className="text-xl font-bold text-white mb-6">Recent Attendance</h2>
                            <div className="space-y-3">
                                {attendance?.records?.slice(0, 7).map((rec: any) => (
                                    <div key={rec._id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-10 rounded-full ${rec.status === 'present' ? 'bg-green-500' : rec.status === 'absent' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                            <div>
                                                <p className="text-sm font-bold text-white">{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{rec.remarks || 'Standard Session'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rec.status === 'present' ? 'bg-green-500/10 text-green-400' : rec.status === 'absent' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {rec.status}
                                        </span>
                                    </div>
                                ))}
                                {attendance?.records?.length === 0 && <div className="py-20 text-center text-slate-600 italic">No attendance records yet.</div>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'attendance' && (
                    <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black text-white">Attendance Detailed Log</h2>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
                                    <p className="text-[9px] text-slate-500 font-black uppercase">Present</p>
                                    <h4 className="text-xl font-black text-green-400">{attendance?.stats?.present}</h4>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-center">
                                    <p className="text-[9px] text-slate-500 font-black uppercase">Absent</p>
                                    <h4 className="text-xl font-black text-red-400">{attendance?.stats?.absent}</h4>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {attendance?.records?.map((rec: any) => (
                                <div key={rec._id} className="p-6 rounded-[2rem] bg-slate-900 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/5 rounded-2xl text-xl">📅</div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${rec.status === 'present' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {rec.status}
                                        </span>
                                    </div>
                                    <h4 className="text-white font-bold">{new Date(rec.date).toLocaleDateString()}</h4>
                                    <p className="text-[11px] text-slate-500 mt-1 uppercase font-black tracking-tighter">Normal School Day</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'academics' && (
                    <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
                        <h2 className="text-2xl font-black text-white mb-10 text-center">Academic Performance Board</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="pb-6 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Subject</th>
                                        <th className="pb-6 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Exam</th>
                                        <th className="pb-6 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Marks</th>
                                        <th className="pb-6 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Grade</th>
                                        <th className="pb-6 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 text-right">Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marks.map((m: any) => {
                                        const perc = (m.marksObtained / m.maxMarks) * 100;
                                        return (
                                            <tr key={m._id} className="border-b border-white/5 group hover:bg-white/5 transition-colors">
                                                <td className="py-6 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                                                            {m.subject?.code || 'S'}
                                                        </div>
                                                        <p className="font-bold text-white">{m.subject?.name}</p>
                                                    </div>
                                                </td>
                                                <td className="py-6 px-4">
                                                    <p className="text-sm text-slate-400 font-medium">{m.exam?.name} </p>
                                                    <p className="text-[9px] text-slate-600 font-black uppercase">{m.exam?.term}</p>
                                                </td>
                                                <td className="py-6 px-4 font-black text-white">{m.marksObtained} / {m.maxMarks}</td>
                                                <td className="py-6 px-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${perc >= 80 ? 'bg-green-400/10 text-green-400' : perc >= 60 ? 'bg-indigo-400/10 text-indigo-400' : 'bg-red-400/10 text-red-400'}`}>
                                                        {perc >= 90 ? 'A+' : perc >= 80 ? 'A' : perc >= 70 ? 'B' : perc >= 60 ? 'C' : 'F'}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-4 text-right">
                                                    <div className="w-full max-w-[120px] ml-auto h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/50" style={{ width: `${perc}%` }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'timetable' && (
                    <div className="glass-dark p-10 rounded-[3rem] border border-white/5 overflow-x-auto">
                        <div className="grid grid-cols-6 gap-6 min-w-[1000px]">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                                <div key={day} className="space-y-6">
                                    <div className="text-center p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{day}</p>
                                    </div>
                                    <div className="space-y-4">
                                        {timetable
                                            .filter((slot: any) => slot.day === day)
                                            .map((slot: any, idx: number) => (
                                                <div key={idx} className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/20 transition-all group">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{slot.startTime} - {slot.endTime}</p>
                                                    <h5 className="text-sm font-bold text-white group-hover:text-indigo-400 transition">{slot.subject?.name}</h5>
                                                    <p className="text-[10px] text-slate-500 mt-1">Room {slot.room || 'TBD'}</p>
                                                    <p className="text-[9px] text-indigo-400 font-bold mt-2 uppercase">{slot.teacher?.firstName}</p>
                                                </div>
                                            ))}
                                        {timetable.filter((t: any) => t.day === day).length === 0 && (
                                            <div className="h-40 rounded-3xl border border-dashed border-white/5 flex items-center justify-center italic text-[10px] text-slate-600">No classes</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
