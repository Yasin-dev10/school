"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    BarChart3,
    Printer,
    Calendar,
    CheckCircle2,
    XCircle,
    TrendingUp,
    School,
    Save,
    Download,
    Users,
    ChevronDown,
    Clock,
    AlertCircle
} from 'lucide-react';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS } from '../../../hooks/usePermission';


export default function AttendancePage() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState([]);
    const [attendanceRecords, setAttendanceRecords] = useState<any>({}); // { studentId: { status, remarks } }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState('mark'); // 'mark' or 'history'
    const [history, setHistory] = useState([]);
    const [user, setUser] = useState<any>(null);
    const [studentStats, setStudentStats] = useState<any>(null);

    const { hasPermission } = usePermission();
    const canMark = hasPermission(RESOURCES.ATTENDANCE, ACTIONS.CREATE) || hasPermission(RESOURCES.ATTENDANCE, ACTIONS.UPDATE);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(u);
    }, []);

    // Fetch school classes
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const { data } = await api.get('/classes');
                setClasses(data.data);
            } catch (err) {
                console.error("Failed to fetch classes");
            }
        };
        fetchClasses();
    }, []);

    // Real-time listener
    useEffect(() => {
        const { getSocket } = require('../../utils/socket');
        const socket = getSocket();

        if (socket) {
            socket.on('attendance-updated', (data: any) => {
                // If it's for the currently viewed class and date, refresh
                if (data.classId === selectedClass?._id) {
                    // Logic to optionally refresh data
                    console.log("Attendance updated in real-time", data);
                    // fetchClassData() // This is inside another useEffect, need to refactor
                }
            });
        }

        return () => {
            if (socket) socket.off('attendance-updated');
        };
    }, [selectedClass]);

    const fetchClassData = async () => {
        if (!selectedClass || view !== 'mark') return;
        setLoading(true);
        try {
            // 1. Fetch all students in this class/section
            const { data: studentRes } = await api.get('/students');
            const classStudents = studentRes.data.filter((s: any) =>
                String(s.profile?.class || '').trim() === String(selectedClass.name || '').trim() &&
                String(s.profile?.section || '').trim() === String(selectedClass.section || '').trim()
            );
            setStudents(classStudents);

            // 2. Fetch existing attendance for this date
            const { data: attendanceRes } = await api.get(`/attendance/class/${selectedClass._id}?date=${date}`);

            const existingRecords: any = {};
            // Initialize with 'present' for all students
            classStudents.forEach((s: any) => {
                existingRecords[s._id] = { status: 'present', remarks: '' };
            });

            // Override with existing data from DB
            attendanceRes.data.forEach((rec: any) => {
                existingRecords[rec.student._id] = {
                    status: rec.status,
                    remarks: rec.remarks || ''
                };
            });

            setAttendanceRecords(existingRecords);
        } catch (err) {
            console.error("Failed to fetch attendance data");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!selectedClass || view !== 'history') return;
        setLoading(true);
        try {
            const { data } = await api.get(`/attendance/history/${selectedClass._id}`);
            setHistory(data.data);
        } catch (err) {
            console.error("Failed to fetch history");
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentAttendance = async () => {
        if (user?.role !== 'student') return;
        setLoading(true);
        try {
            const { data } = await api.get('/attendance/my');
            setHistory(data.data.records);
            setStudentStats(data.data.stats);
        } catch (err) {
            console.error("Failed to fetch student attendance");
        } finally {
            setLoading(false);
        }
    };

    // When class or date changes, fetch students and existing attendance
    useEffect(() => {
        fetchClassData();
    }, [selectedClass, date, view]);

    // Fetch history
    useEffect(() => {
        fetchHistory();
    }, [selectedClass, view]);

    // Fetch student specific history
    useEffect(() => {
        fetchStudentAttendance();
    }, [user]);

    const handleStatusChange = (studentId: string, status: string) => {
        setAttendanceRecords({
            ...attendanceRecords,
            [studentId]: { ...attendanceRecords[studentId], status }
        });
    };

    const handleSave = async () => {
        if (!selectedClass) return;
        setSaving(true);
        try {
            const records = Object.keys(attendanceRecords).map(studentId => ({
                studentId,
                status: attendanceRecords[studentId].status,
                remarks: attendanceRecords[studentId].remarks
            }));

            await api.post('/attendance/mark', {
                classId: selectedClass._id,
                date,
                records
            });
            alert("Attendance saved successfully!");
        } catch (err) {
            alert("Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const downloadAttendanceReport = async () => {
        if (!selectedClass) return alert("Please select a class first");
        window.open(`${api.defaults.baseURL}/attendance/report?classId=${selectedClass._id}&month=${new Date().getMonth() + 1}`, '_blank');
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Attendance Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor presence and track student reliability.</p>
                </div>
                <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 w-full lg:w-auto">
                    <button
                        onClick={() => setView('mark')}
                        className={`flex-1 lg:flex-none px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition ${view === 'mark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Mark
                    </button>
                    <button
                        onClick={() => setView('history')}
                        className={`flex-1 lg:flex-none px-4 sm:px-6 py-2 rounded-xl text-sm font-bold transition ${view === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        History
                    </button>
                </div>
                {view === 'history' && (
                    <div className="flex gap-2 sm:gap-3 w-full lg:w-auto">
                        <button
                            onClick={downloadAttendanceReport}
                            className="flex-1 lg:flex-none px-4 sm:px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Excel Report</span>
                            <span className="sm:hidden">Excel</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="flex-1 lg:flex-none px-4 sm:px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-white/5 print:hidden flex items-center justify-center gap-2"
                        >
                            <Printer className="w-4 h-4" />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Selectors or Stats */}
            {user?.role === 'student' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {[
                        { label: 'Total Days', value: studentStats?.total || 0, icon: <Calendar className="w-5 h-5" />, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                        { label: 'Present', value: studentStats?.present || 0, icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-green-400', bg: 'bg-green-400/10' },
                        { label: 'Absent', value: studentStats?.absent || 0, icon: <XCircle className="w-5 h-5" />, color: 'text-red-400', bg: 'bg-red-400/10' },
                        { label: 'Percentage', value: `${studentStats?.percentage || 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    ].map((item, i) => (

                        <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                            <div className={`${item.bg} w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform`}>
                                {item.icon}
                            </div>

                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{item.label}</p>
                            <p className={`text-3xl font-black mt-1 ${item.color}`}>{item.value}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Class</label>
                        <select
                            onChange={(e) => setSelectedClass(classes.find((c: any) => c._id === e.target.value))}
                            className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="">Choose a Class...</option>
                            {classes.map((c: any) => (
                                <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl w-full flex justify-between items-center">
                            <span className="text-xs text-indigo-400 font-bold">Students Found</span>
                            <span className="text-lg font-black text-white">{students.length}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            {/* Data View Section */}
            {user?.role === 'student' ? (
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={3} className="py-20 text-center text-slate-600 animate-pulse">Loading your history...</td></tr>
                            ) : history.length > 0 ? history.map((rec: any) => (
                                <tr key={rec._id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-4 text-slate-400 text-xs font-mono">{new Date(rec.date).toLocaleDateString()}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${rec.status === 'present' ? 'text-green-400 bg-green-400/10 border border-green-400/20' :
                                            rec.status === 'absent' ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
                                                'text-orange-400 bg-orange-400/10 border border-orange-400/20'
                                            }`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-slate-500 text-xs italic">{rec.remarks || '---'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={3} className="py-20 text-center text-slate-500 italic">No attendance records found yet. Keep participating!</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : view === 'mark' ? (
                /* Mark Attendance View */
                !selectedClass ? (
                    <div className="glass-dark p-20 rounded-[3rem] border border-white/5 text-center space-y-4">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto shadow-inner text-indigo-400">
                            <School className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Select a class to begin</h3>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm">Choose a class and section from the selectors above to load the student registry for today.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Present', val: Object.values(attendanceRecords).filter((r: any) => r.status === 'present').length, color: 'text-green-400' },
                                { label: 'Absent', val: Object.values(attendanceRecords).filter((r: any) => r.status === 'absent').length, color: 'text-red-400' },
                                { label: 'Late', val: Object.values(attendanceRecords).filter((r: any) => r.status === 'late').length, color: 'text-amber-400' },
                                { label: 'Excused', val: Object.values(attendanceRecords).filter((r: any) => r.status === 'excused').length, color: 'text-slate-400' }
                            ].map((stat, i) => (
                                <div key={i} className="glass-dark p-4 rounded-3xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                                </div>
                            ))}
                        </div>

                        <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left min-w-[800px]">
                                    <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-8 py-5">Student Information</th>
                                            <th className="px-8 py-5">Attendance Status</th>
                                            <th className="px-8 py-5">Observations / Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr><td colSpan={3} className="py-20 text-center text-slate-600 animate-pulse">Synchronizing roster...</td></tr>
                                        ) : students.length > 0 ? students.map((s: any) => (
                                            <tr key={s._id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-indigo-400 font-black text-xs">
                                                            {s.firstName.charAt(0)}{s.lastName.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold text-sm">{s.firstName} {s.lastName}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-indigo-400 font-mono font-black uppercase">Roll: {s.profile?.rollNo || '--'}</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                                <span className="text-[9px] text-slate-500 uppercase font-black">{s.profile?.gender || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex gap-2 p-1.5 bg-slate-950/50 rounded-2xl border border-white/5 w-fit">
                                                        {[
                                                            { id: 'present', label: 'Present', color: 'bg-green-500' },
                                                            { id: 'absent', label: 'Absent', color: 'bg-red-500' },
                                                            { id: 'late', label: 'Late', color: 'bg-amber-500' },
                                                            { id: 'excused', label: 'Excused', color: 'bg-slate-500' }
                                                        ].map((st) => (
                                                            <button
                                                                key={st.id}
                                                                onClick={() => canMark && handleStatusChange(s._id, st.id)}
                                                                disabled={!canMark}
                                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${attendanceRecords[s._id]?.status === st.id
                                                                    ? `${st.color} text-white shadow-lg`
                                                                    : 'text-slate-500 hover:text-slate-300'
                                                                    } ${!canMark ? 'cursor-not-allowed opacity-70' : ''}`}
                                                            >
                                                                {st.label.slice(0, 3)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <input
                                                        placeholder="Note..."
                                                        value={attendanceRecords[s._id]?.remarks || ''}
                                                        onChange={(e) => setAttendanceRecords({
                                                            ...attendanceRecords,
                                                            [s._id]: { ...attendanceRecords[s._id], remarks: e.target.value }
                                                        })}
                                                        disabled={!canMark}
                                                        className={`bg-slate-950/30 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-400 outline-none focus:border-indigo-500/50 transition-all w-full ${!canMark ? 'cursor-not-allowed opacity-50' : ''}`}
                                                    />
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={3} className="py-20 text-center text-slate-500 italic">No students found in this class.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {students.length > 0 && (
                                <div className="p-4 sm:p-8 bg-slate-950/80 border-t border-white/5 flex flex-col sm:row justify-between items-center gap-4">
                                    <span className="text-slate-500 text-xs italic text-center sm:text-left">All changes are auto-saved locally before submission.</span>
                                    <PermissionGuard resource={RESOURCES.ATTENDANCE} action={ACTIONS.CREATE}>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="w-full sm:w-auto px-8 sm:px-12 py-3 sm:py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Save className="w-5 h-5" />
                                            <span>{saving ? 'Saving...' : 'Finalize & Save'}</span>
                                        </button>
                                    </PermissionGuard>
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                /* History Log View */
                <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Student</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Remarks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={4} className="py-20 text-center text-slate-600 animate-pulse">Loading history...</td></tr>
                            ) : history.length > 0 ? history.map((rec: any) => (
                                <tr key={rec._id}>
                                    <td className="px-8 py-4 text-slate-400 text-xs font-mono">{new Date(rec.date).toLocaleDateString()}</td>
                                    <td className="px-8 py-4 text-white font-bold text-sm">{rec.student?.firstName} {rec.student?.lastName}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${rec.status === 'present' ? 'text-green-400 bg-green-400/10' :
                                            rec.status === 'absent' ? 'text-red-400 bg-red-400/10' :
                                                'text-orange-400 bg-orange-400/10'
                                            }`}>
                                            {rec.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-slate-500 text-xs italic">{rec.remarks || '---'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="py-20 text-center text-slate-500">No attendance records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
