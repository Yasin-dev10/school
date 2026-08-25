"use client";
import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import {
    Calendar, CheckCircle2, XCircle, TrendingUp, BarChart3,
    Printer, Loader2, Check, X, Pencil, Search, RefreshCw,
    ChevronDown,
} from 'lucide-react';
import { usePermission, RESOURCES, ACTIONS, normalizeRole } from '../../../hooks/usePermission';

/* ─── constants ─────────────────────────────────────────────────────────── */
const STATUSES = ['present', 'absent', 'late', 'excused'] as const;
type Status = typeof STATUSES[number];

const STATUS_PILL: Record<Status, string> = {
    present: 'bg-green-500/15 text-green-400 border border-green-500/20',
    absent:  'bg-red-500/15 text-red-400 border border-red-500/20',
    late:    'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    excused: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};
const STATUS_BTN: Record<Status, string> = {
    present: 'bg-green-500 text-white',
    absent:  'bg-red-500 text-white',
    late:    'bg-amber-500 text-white',
    excused: 'bg-slate-500 text-white',
};

/* ─── editable row used in history ──────────────────────────────────────── */
function HistoryRow({ rec, canEdit, onSaved }: {
    rec: any; canEdit: boolean; onSaved: (updated: any) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [status, setStatus]   = useState<Status>(rec.status);
    const [remarks, setRemarks] = useState(rec.remarks || '');
    const [saving, setSaving]   = useState(false);
    const [err, setErr]         = useState('');

    const save = async () => {
        const recordId = rec._id ?? rec.id;
        if (!recordId) { setErr('Record ID missing'); return; }
        setSaving(true); setErr('');
        try {
            const { data } = await api.put(`/attendance/${recordId}`, { status, remarks });
            onSaved(data.data);
            setEditing(false);
        } catch (e: any) {
            setErr(e?.response?.data?.message || 'Update failed');
        } finally { setSaving(false); }
    };

    const cancel = () => {
        setStatus(rec.status); setRemarks(rec.remarks || '');
        setEditing(false); setErr('');
    };

    return (
        <tr className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
            {/* date */}
            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                {new Date(rec.date).toLocaleDateString()}
            </td>
            {/* student */}
            <td className="px-4 py-3 font-semibold text-sm text-slate-800 dark:text-white whitespace-nowrap">
                {rec.student?.firstName} {rec.student?.lastName}
            </td>
            {/* subject */}
            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {rec.subject?.name || '—'}
            </td>
            {/* status */}
            <td className="px-4 py-3">
                {editing ? (
                    <div className="flex gap-1">
                        {STATUSES.map(s => (
                            <button key={s} onClick={() => setStatus(s)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition ${status === s ? STATUS_BTN[s] : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                {s.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                ) : (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_PILL[rec.status as Status] ?? ''}`}>
                        {rec.status}
                    </span>
                )}
            </td>
            {/* remarks */}
            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-[160px]">
                {editing ? (
                    <input value={remarks} onChange={e => setRemarks(e.target.value)}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Remark…" />
                ) : (
                    <span className="italic">{rec.remarks || '—'}</span>
                )}
            </td>
            {/* marked by */}
            <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                {rec.markedBy ? `${rec.markedBy.firstName} ${rec.markedBy.lastName}` : '—'}
            </td>
            {/* actions */}
            {canEdit && (
                <td className="px-4 py-3">
                    {editing ? (
                        <div className="flex items-center gap-1.5">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : (
                                <>
                                    <button onClick={save}
                                        className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/30 flex items-center justify-center transition" title="Save">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={cancel}
                                        className="w-7 h-7 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30 flex items-center justify-center transition" title="Cancel">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                            {err && <span className="text-red-400 text-[10px]">{err}</span>}
                        </div>
                    ) : (
                        <button onClick={() => setEditing(true)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-indigo-500/15 hover:text-indigo-500 flex items-center justify-center transition opacity-0 group-hover:opacity-100">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                    )}
                </td>
            )}
        </tr>
    );
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function AttendancePage() {
    /* ── state ─────────────────────────────────────────────────────────── */
    const [user, setUser]                       = useState<any>(null);
    const [classes, setClasses]                 = useState<any[]>([]);
    const [subjects, setSubjects]               = useState<any[]>([]);
    const [selectedClass, setSelectedClass]     = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [date, setDate]                       = useState(new Date().toISOString().split('T')[0]);

    /* mark-view */
    const [students, setStudents]   = useState<any[]>([]);
    const [records, setRecords]     = useState<Record<string, { status: Status; remarks: string }>>({});
    const [markLoading, setMarkLoading] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [saveMsg, setSaveMsg]     = useState('');

    /* history-view */
    const [view, setView]               = useState<'mark' | 'history'>('mark');
    const [history, setHistory]         = useState<any[]>([]);
    const [histLoading, setHistLoading] = useState(false);
    const [histSearch, setHistSearch]   = useState('');
    const [histDateFrom, setHistDateFrom] = useState('');
    const [histDateTo, setHistDateTo]     = useState('');
    const [histStatus, setHistStatus]     = useState('');

    /* student own view */
    const [myRecords, setMyRecords]   = useState<any[]>([]);
    const [myStats, setMyStats]       = useState<any>(null);
    const [myLoading, setMyLoading]   = useState(false);

    const { hasPermission } = usePermission();
    const canMark = hasPermission(RESOURCES.ATTENDANCE, ACTIONS.CREATE) || hasPermission(RESOURCES.ATTENDANCE, ACTIONS.UPDATE);

    /* ── init ──────────────────────────────────────────────────────────── */
    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        const parsed = { ...u, role: normalizeRole(u.role) };
        setUser(parsed);

        if (parsed.role === 'student') return; // student gets own data below

        Promise.all([api.get('/classes'), api.get('/subjects')])
            .then(([cr, sr]) => {
                setClasses(cr.data.data ?? []);
                setSubjects(sr.data.data ?? []);
            }).catch(() => {});
    }, []);

    /* student: my attendance */
    const fetchMyAtt = useCallback(async () => {
        if (!user || user.role !== 'student') return;
        setMyLoading(true);
        try {
            const { data } = await api.get('/attendance/my');
            setMyRecords(data.data.records ?? []);
            setMyStats(data.data.stats);
        } catch { /* ignore */ }
        finally { setMyLoading(false); }
    }, [user]);

    useEffect(() => { fetchMyAtt(); }, [fetchMyAtt]);

    /* subjects available for the selected class */
    const subjectOptions = selectedClass?.subjects?.length
        ? selectedClass.subjects
            .map((e: any) => ({ ...e.subject, _id: e.subject?._id || e.subject?.id }))
            .filter((s: any) => s?._id)
        : subjects;

    /* ── fetch today's mark data ───────────────────────────────────────── */
    const fetchMarkData = useCallback(async () => {
        if (!selectedClass || view !== 'mark') return;
        if (user?.role === 'teacher' && !selectedSubject) return;
        setMarkLoading(true);
        try {
            const subQ = selectedSubject ? `&subjectId=${selectedSubject._id}` : '';
            const [stuRes, attRes] = await Promise.all([
                api.get('/students', { params: { class: selectedClass._id, section: selectedClass.section } }),
                api.get(`/attendance/class/${selectedClass._id}?date=${date}${subQ}`),
            ]);

            /* filter students that belong to this class */
            const classStudents = stuRes.data.data ?? [];
            setStudents(classStudents);

            /* build records map — existing DB records take priority */
            const init: Record<string, { status: Status; remarks: string }> = {};
            classStudents.forEach((s: any) => { init[s._id] = { status: 'present', remarks: '' }; });
            (attRes.data.data ?? []).forEach((rec: any) => {
                if (rec.student?._id) {
                    init[rec.student._id] = { status: rec.status as Status, remarks: rec.remarks || '' };
                }
            });
            setRecords(init);
        } catch (e) { console.error(e); }
        finally { setMarkLoading(false); }
    }, [selectedClass, selectedSubject, date, view, user]);

    useEffect(() => { fetchMarkData(); }, [fetchMarkData]);

    /* ── fetch history ─────────────────────────────────────────────────── */
    const fetchHistory = useCallback(async () => {
        if (!selectedClass || view !== 'history') return;
        if (user?.role === 'teacher' && !selectedSubject) return;
        setHistLoading(true);
        try {
            const subQ = selectedSubject ? `?subjectId=${selectedSubject._id}` : '';
            const { data } = await api.get(`/attendance/history/${selectedClass._id}${subQ}`);
            setHistory(data.data ?? []);
        } catch { /* ignore */ }
        finally { setHistLoading(false); }
    }, [selectedClass, selectedSubject, view, user]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    /* ── save attendance ───────────────────────────────────────────────── */
    const handleSave = async () => {
        if (!selectedClass) return;
        if (user?.role === 'teacher' && !selectedSubject) {
            setSaveMsg('Please select a subject first'); return;
        }
        setSaving(true); setSaveMsg('');
        try {
            const payload = Object.entries(records).map(([sid, r]) => ({
                studentId: sid, status: r.status, remarks: r.remarks,
            }));
            const res = await api.post('/attendance/mark', {
                classId: selectedClass._id,
                subjectId: selectedSubject?._id ?? null,
                date,
                records: payload,
            });
            const results: any[] = res.data.results ?? [];
            const created = results.filter(r => r.action === 'created').length;
            const updated = results.filter(r => r.action === 'updated').length;
            setSaveMsg(`✓ Saved — ${created} new, ${updated} updated`);
            setTimeout(() => setSaveMsg(''), 5000);
        } catch (e: any) {
            setSaveMsg(e?.response?.data?.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    /* ── mark all helper ───────────────────────────────────────────────── */
    const markAll = (status: Status) => {
        setRecords(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(sid => { next[sid] = { ...next[sid], status }; });
            return next;
        });
    };

    /* ── history: inline update callback ───────────────────────────────── */
    const handleHistoryUpdate = (updated: any) => {
        setHistory(prev => prev.map(r => r._id === updated._id ? updated : r));
    };

    /* ── filtered history ───────────────────────────────────────────────── */
    const filteredHistory = history.filter(r => {
        const name = `${r.student?.firstName ?? ''} ${r.student?.lastName ?? ''}`.toLowerCase();
        const q = histSearch.toLowerCase();
        const matchSearch = !histSearch || name.includes(q) || r.subject?.name?.toLowerCase().includes(q) || r.status?.includes(q);
        const rDate = r.date ? new Date(r.date) : null;
        const matchFrom = !histDateFrom || (rDate && rDate >= new Date(histDateFrom));
        const matchTo   = !histDateTo   || (rDate && rDate <= new Date(histDateTo + 'T23:59:59'));
        const matchSt   = !histStatus   || r.status === histStatus;
        return matchSearch && matchFrom && matchTo && matchSt;
    });

    /* ── counts summary ────────────────────────────────────────────────── */
    const counts = {
        present: Object.values(records).filter(r => r.status === 'present').length,
        absent:  Object.values(records).filter(r => r.status === 'absent').length,
        late:    Object.values(records).filter(r => r.status === 'late').length,
        excused: Object.values(records).filter(r => r.status === 'excused').length,
    };

    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher';

    /* ══════════════════════════════════════════════════════════════════
       STUDENT VIEW — own attendance history + stats
    ══════════════════════════════════════════════════════════════════ */
    if (isStudent) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <section className="rounded-3xl bg-[#405bb2] p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8"><div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15"><Calendar className="h-7 w-7" /></div><div><h1 className="text-2xl font-bold">Attendance Summary</h1><p className="text-sm text-indigo-100">Review your attendance records</p></div></div></section>

                {/* stat cards */}
                {myLoading ? (
                    <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Days',  value: myStats?.total      ?? 0,       icon: <Calendar className="w-5 h-5" />,     color: 'text-indigo-500',  bg: 'bg-indigo-500/10' },
                                { label: 'Present',     value: myStats?.present    ?? 0,       icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                                { label: 'Absent',      value: myStats?.absent     ?? 0,       icon: <XCircle className="w-5 h-5" />,     color: 'text-red-500',     bg: 'bg-red-500/10' },
                                { label: 'Attendance',  value: `${myStats?.percentage ?? 0}%`, icon: <TrendingUp className="w-5 h-5" />,  color: 'text-purple-500',  bg: 'bg-purple-500/10' },
                            ].map((c, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                                    <div className={`${c.bg} ${c.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>{c.icon}</div>
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{c.label}</p>
                                    <p className={`text-2xl font-black mt-1 ${c.color}`}>{c.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-3xl bg-[#405bb2] p-7 text-center text-white"><BarChart3 className="mx-auto h-6 w-6" /><p className="mt-2 text-3xl font-bold">{myStats?.percentage ?? 0}%</p><p className="text-sm text-indigo-100">Attendance Rate</p></div>

                        {/* history table */}
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                                <h2 className="font-bold text-slate-800 dark:text-white text-sm">Attendance Records</h2>
                            </div>
                            {myRecords.length === 0 ? (
                                <div className="py-16 text-center text-slate-400 text-sm italic">No attendance records found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                                            <tr className="text-xs text-slate-400 uppercase tracking-wide">
                                                <th className="px-4 py-3 text-left font-semibold">Date</th>
                                                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                                                <th className="px-4 py-3 text-left font-semibold">Status</th>
                                                <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {myRecords.map((r, i) => (
                                                <tr key={i} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">{new Date(r.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{r.subject?.name || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_PILL[r.status as Status] ?? ''}`}>{r.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-slate-400 italic">{r.remarks || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    /* ══════════════════════════════════════════════════════════════════
       ADMIN / TEACHER VIEW
    ══════════════════════════════════════════════════════════════════ */
    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white">Attendance Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Mark attendance and view full history per class</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* view toggle */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {(['mark', 'history'] as const).map(v => (
                            <button key={v} onClick={() => setView(v)}
                                className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition ${view === v ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                    {/* export buttons (history only) */}
                    {view === 'history' && (
                        <>
                            <a href={`${api.defaults.baseURL}/attendance/report?classId=${selectedClass?._id}&month=${new Date().getMonth() + 1}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition text-sm font-semibold">
                                <BarChart3 className="w-4 h-4" /> CSV
                            </a>
                            <button onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition text-sm font-semibold print:hidden">
                                <Printer className="w-4 h-4" /> Print
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* selectors row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* class */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Class</label>
                    <div className="relative">
                        <select
                            value={selectedClass?._id ?? ''}
                            onChange={e => {
                                setSelectedClass(classes.find(c => c._id === e.target.value) || null);
                                setSelectedSubject(null);
                            }}
                            className="w-full px-3 py-2.5 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                            <option value="">— Select class —</option>
                            {classes.map(c => <option key={c._id} value={c._id}>{c.name} — {c.section}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* subject */}
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Subject {isTeacher && <span className="text-red-400">*</span>}
                    </label>
                    <div className="relative">
                        <select
                            value={selectedSubject?._id ?? ''}
                            onChange={e => setSelectedSubject(subjectOptions.find((s: any) => s._id === e.target.value) || null)}
                            className="w-full px-3 py-2.5 pr-8 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                            <option value="">All Subjects</option>
                            {subjectOptions.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* date (mark view only) */}
                {view === 'mark' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                )}

                {/* summary count */}
                <div className="flex items-end">
                    <div className="w-full p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex justify-between items-center">
                        <span className="text-xs text-indigo-500 font-bold">
                            {view === 'mark' ? 'Students' : 'Records'}
                        </span>
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                            {view === 'mark' ? students.length : filteredHistory.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── MARK VIEW ─────────────────────────────────────────────────── */}
            {view === 'mark' && (
                <>
                    {!selectedClass ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-20 text-center">
                            <p className="text-slate-400 text-sm italic">Select a class to mark attendance.</p>
                        </div>
                    ) : markLoading ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                        </div>
                    ) : (
                        <>
                            {/* summary stat row */}
                            <div className="grid grid-cols-4 gap-3">
                                {(Object.entries(counts) as [Status, number][]).map(([s, n]) => (
                                    <div key={s} className={`rounded-xl p-3 border text-center ${STATUS_PILL[s]}`}>
                                        <p className="text-lg font-black">{n}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wide capitalize">{s}</p>
                                    </div>
                                ))}
                            </div>

                            {/* mark-all row */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-400 font-semibold mr-1">Mark all:</span>
                                {STATUSES.map(s => (
                                    <button key={s} onClick={() => markAll(s)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${STATUS_BTN[s]} opacity-80 hover:opacity-100`}>
                                        All {s}
                                    </button>
                                ))}
                            </div>

                            {/* students table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {students.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-sm italic">No students found for this class.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                                <tr className="text-xs text-slate-400 uppercase tracking-wide">
                                                    <th className="px-4 py-3 text-left font-semibold">#</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map((s, i) => {
                                                    const rec = records[s._id] ?? { status: 'present' as Status, remarks: '' };
                                                    return (
                                                        <tr key={s._id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                            <td className="px-4 py-3 text-xs text-slate-400">{i + 1}</td>
                                                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">
                                                                {s.firstName} {s.lastName}
                                                                {s.profile?.rollNo && (
                                                                    <span className="ml-2 text-[10px] text-slate-400 font-mono">{s.profile.rollNo}</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex gap-1.5">
                                                                    {STATUSES.map(st => (
                                                                        <button key={st}
                                                                            onClick={() => setRecords(prev => ({ ...prev, [s._id]: { ...prev[s._id], status: st } }))}
                                                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition ${rec.status === st ? STATUS_BTN[st] : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                                                                            {st.slice(0, 3)}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <input
                                                                    value={rec.remarks}
                                                                    onChange={e => setRecords(prev => ({ ...prev, [s._id]: { ...prev[s._id], remarks: e.target.value } }))}
                                                                    placeholder="Optional remark…"
                                                                    className="w-full max-w-[220px] px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* save bar */}
                            {canMark && students.length > 0 && (
                                <div className="sticky bottom-4 flex items-center gap-4 justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 shadow-lg">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">All changes are saved directly to the database.</p>
                                    <div className="flex items-center gap-3">
                                        {saveMsg && (
                                            <span className={`text-xs font-semibold ${saveMsg.startsWith('✓') ? 'text-emerald-500' : 'text-red-400'}`}>{saveMsg}</span>
                                        )}
                                        <button onClick={handleSave} disabled={saving}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-60 shadow-lg shadow-indigo-500/20">
                                            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Attendance'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ── HISTORY VIEW ──────────────────────────────────────────────── */}
            {view === 'history' && (
                <>
                    {!selectedClass ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-20 text-center">
                            <p className="text-slate-400 text-sm italic">Select a class to view attendance history.</p>
                        </div>
                    ) : (
                        <>
                            {/* filters */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="relative flex-1 min-w-[180px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input value={histSearch} onChange={e => setHistSearch(e.target.value)}
                                        placeholder="Search name, subject, status…"
                                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">From</div>
                                <input type="date" value={histDateFrom} onChange={e => setHistDateFrom(e.target.value)}
                                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">To</div>
                                <input type="date" value={histDateTo} onChange={e => setHistDateTo(e.target.value)}
                                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                                <div className="relative">
                                    <select value={histStatus} onChange={e => setHistStatus(e.target.value)}
                                        className="px-3 py-2.5 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                                        <option value="">All Statuses</option>
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                                <button onClick={fetchHistory}
                                    className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition font-semibold">
                                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                                </button>
                            </div>

                            {/* table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                {histLoading ? (
                                    <div className="py-20 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                    </div>
                                ) : filteredHistory.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-sm italic">No attendance records found.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                                                <tr className="text-xs text-slate-400 uppercase tracking-wide">
                                                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Student</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Subject</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Remarks</th>
                                                    <th className="px-4 py-3 text-left font-semibold">Marked By</th>
                                                    {canMark && <th className="px-4 py-3 text-left font-semibold">Edit</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredHistory.map((rec, i) => (
                                                    <HistoryRow key={rec._id ?? i} rec={rec} canEdit={canMark} onSaved={handleHistoryUpdate} />
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                                            Showing {filteredHistory.length} of {history.length} records
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
