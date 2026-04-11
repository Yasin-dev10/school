"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import {
    Save, Wand2, Printer, Eye, Edit3, Calendar, User,
    BookOpen, Clock, Heart, Zap, Sparkles, AlertCircle,
    CheckCircle2, Info, LayoutGrid, RotateCcw,
    MousePointer2, Settings2, ShieldCheck, Flame
} from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission, RESOURCES, ACTIONS, ROLES } from '@/hooks/usePermission';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_SLOTS = [
    { start: '07:30', end: '08:10', label: 'Period 1' },
    { start: '08:10', end: '08:50', label: 'Period 2' },
    { start: '08:50', end: '09:30', label: 'Period 3' },
    { start: '09:30', end: '10:00', label: 'Break', type: 'break' },
    { start: '10:00', end: '10:40', label: 'Period 4' },
    { start: '10:40', end: '11:20', label: 'Period 5' },
    { start: '11:20', end: '12:00', label: 'Period 6' },
];

const SUBJECT_COLORS: any = {
    'Math': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Science': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'English': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'History': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Geography': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Physics': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Chemistry': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'Biology': 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'ICT': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    'Islamic': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Somali': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
};

const getSubjectColor = (name: string) => {
    if (!name) return 'bg-white/5 text-white/50 border-white/5';
    for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
        if (name?.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return 'bg-white/5 text-white/70 border-white/10';
};

export default function TimetablePage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // ALWAYS START IN READ-ONLY (AUTOMATIC VIEW)
    const [viewMode, setViewMode] = useState<'class' | 'personal'>('class');
    const [isGenerating, setIsGenerating] = useState(false);
    const [genStep, setGenStep] = useState('');

    const [schedule, setSchedule] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    const { hasPermission, userRole } = usePermission();
    const canEdit = hasPermission(RESOURCES.SCHEDULES, ACTIONS.UPDATE);

    // Initial setup
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                let userObj: any = null;
                if (userStr) {
                    userObj = JSON.parse(userStr);
                    setCurrentUser(userObj);
                }

                const [clsRes, subRes, tchRes] = await Promise.all([
                    api.get('/classes?limit=100'),
                    api.get('/subjects?limit=100'),
                    api.get('/teachers?limit=100')
                ]);

                setClasses(clsRes.data.data);
                setSubjects(subRes.data.data);
                setTeachers(tchRes.data.data);

                if (userObj?.role === ROLES.TEACHER) {
                    setViewMode('personal');
                } else if (userObj?.role === ROLES.STUDENT && userObj.profile?.class) {
                    const studentClass = clsRes.data.data.find((c: any) =>
                        c.name === userObj.profile.class && c.section === userObj.profile.section
                    );
                    if (studentClass) setSelectedClassId(studentClass._id);
                }
            } catch (err) {
                console.error("Data fetch failed", err);
            }
        };
        fetchInitialData();
    }, []);

    // Load timetable
    useEffect(() => {
        const fetchTimetable = async () => {
            if (viewMode === 'class' && !selectedClassId) {
                const initial: any = {};
                DAYS.forEach(day => { initial[day] = {}; TIME_SLOTS.forEach((_, idx) => { initial[day][idx] = { subject: '', teachers: [] }; }); });
                setSchedule(initial);
                return;
            }

            setLoading(true);
            try {
                const endpoint = viewMode === 'personal' && currentUser?.role === ROLES.TEACHER
                    ? '/timetable/teacher/me'
                    : `/timetable/class/${selectedClassId}`;

                const { data } = await api.get(endpoint);

                const newSchedule: any = {};
                DAYS.forEach(day => {
                    newSchedule[day] = {};
                    TIME_SLOTS.forEach((_, idx) => {
                        newSchedule[day][idx] = { subject: '', teachers: [] };
                    });
                });

                data.data.forEach((slot: any) => {
                    if (DAYS.includes(slot.day)) {
                        const slotIndex = TIME_SLOTS.findIndex(ts => ts.start === slot.startTime);
                        if (slotIndex !== -1) {
                            newSchedule[slot.day][slotIndex] = {
                                subject: slot.subject?._id || slot.subject,
                                teachers: slot.teachers ? slot.teachers.map((t: any) => t._id || t) : [],
                                subjectName: slot.subject?.name,
                                teacherNames: slot.teachers ? slot.teachers.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ') : '',
                                className: slot.class?.name ? `${slot.class.name}-${slot.class.section}` : ''
                            };
                        }
                    }
                });

                setSchedule(newSchedule);
                // If it's a new class with NO data, keep edit mode off but maybe prompt for auto-gen
            } catch (err) {
                console.error("Timetable fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTimetable();
    }, [selectedClassId, viewMode, currentUser]);

    const currentClass = useMemo(() => classes.find(c => c._id === selectedClassId), [classes, selectedClassId]);

    // Subjects assigned to this class
    const availableSubjects = useMemo(() => {
        if (!currentClass || !currentClass.subjects) return [];
        return currentClass.subjects.map((item: any) => {
            const subId = item.subject?._id || item.subject;
            return subjects.find(s => s._id === subId);
        }).filter(Boolean);
    }, [currentClass, subjects]);

    // Helper to get allowed teachers for a specific subject in this class
    const getAvailableTeachersForSubject = (subjectId: string) => {
        if (!currentClass || !currentClass.subjects) return [];
        const entry = currentClass.subjects.find((item: any) => (item.subject?._id || item.subject) === subjectId);
        if (!entry || !entry.teachers) return [];

        return entry.teachers.map((t: any) => {
            const tId = t._id || t;
            return teachers.find(teach => teach._id === tId);
        }).filter(Boolean);
    };

    const handleCellChange = (day: string, slotIdx: number, field: string, value: any) => {
        setSchedule((prev: any) => {
            const newCell = { ...prev[day][slotIdx], [field]: value };
            if (field === 'subject') {
                const sub = subjects.find(s => s._id === value);
                newCell.subjectName = sub?.name;
                newCell.teachers = []; // Reset teachers when subject changes
                newCell.teacherNames = '';
            }
            if (field === 'teachers') {
                const tIds = Array.isArray(value) ? value : [value];
                const selectedTeachers = teachers.filter(t => tIds.includes(t._id));
                newCell.teacherNames = selectedTeachers.map(t => `${t.firstName} ${t.lastName}`).join(', ');
            }
            return { ...prev, [day]: { ...prev[day], [slotIdx]: newCell } };
        });
    };

    /**
     * FULL AUTOMATIC GENERATION (SSTG)
     */
    const handleSSTGGenerate = async () => {
        if (!currentClass || !currentClass.subjects || currentClass.subjects.length === 0) {
            alert("SSTG Core: No subject-faculty assignments found for this class group.");
            return;
        }

        setIsGenerating(true);
        setGenStep('SOLVING MATRIX CONSTRAINTS...');

        try {
            const { data: globalData } = await api.get('/timetable');
            const globalSlots = globalData.data;

            const isTeacherBusy = (teacherIds: string[], day: string, start: string) => {
                return globalSlots.some((s: any) =>
                    s.teachers?.some((t: any) => teacherIds.includes(t._id || t)) &&
                    s.day === day &&
                    s.startTime === start &&
                    s.class?._id !== selectedClassId
                );
            };

            const classSubjects = [...currentClass.subjects];
            const newSchedule: any = {};

            DAYS.forEach(day => {
                newSchedule[day] = {};
                // Shuffle to avoid predictable patterns
                const dayPool = [...classSubjects].sort(() => Math.random() - 0.5);
                let poolIdx = 0;

                TIME_SLOTS.forEach((ts, idx) => {
                    if (ts.type === 'break') {
                        newSchedule[day][idx] = { subject: '', teachers: [] };
                        return;
                    }

                    let match = null;
                    let attempts = 0;
                    while (!match && attempts < dayPool.length) {
                        const candidate = dayPool[poolIdx % dayPool.length];
                        const tIds = candidate.teachers?.map((t: any) => t._id || t) || [];
                        const sId = candidate.subject?._id || candidate.subject;

                        if (!isTeacherBusy(tIds, day, ts.start)) {
                            const sub = subjects.find(s => s._id === sId);
                            const selectedTeachers = teachers.filter(t => tIds.includes(t._id));
                            match = {
                                subject: sub?._id || '',
                                teachers: tIds,
                                subjectName: sub?.name,
                                teacherNames: selectedTeachers.map(t => `${t.firstName} ${t.lastName}`).join(', ')
                            };
                        }
                        poolIdx++;
                        attempts++;
                    }
                    newSchedule[day][idx] = match || { subject: '', teachers: [], subjectName: 'Self-Study', teacherNames: 'Unsupervised' };
                });
            });

            await new Promise(r => setTimeout(r, 1200));
            setSchedule(newSchedule);
            setGenStep('DRAFT READY');
            setTimeout(() => {
                setIsGenerating(false);
                setIsEditMode(false); // Stay in view mode so user can see the professional result
            }, 600);

        } catch (err) {
            console.error(err);
            alert("Global Ledger Sync Failed");
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!selectedClassId) return;
        setSaving(true);
        try {
            const slotsToSave: any[] = [];
            DAYS.forEach(day => {
                TIME_SLOTS.forEach((ts, idx) => {
                    const cell = schedule[day][idx];
                    if (cell.subject && cell.teachers?.length > 0) {
                        slotsToSave.push({
                            day,
                            startTime: ts.start,
                            endTime: ts.end,
                            subjectId: cell.subject,
                            teacherIds: cell.teachers
                        });
                    }
                });
            });
            await api.post('/timetable/bulk', { classId: selectedClassId, slots: slotsToSave });
            alert("MATRIX PUBLISHED: Timetable is now live for all students and faculty.");
            setIsEditMode(false);
        } catch (err) {
            console.error(err);
            alert("Publishing Failed");
        } finally {
            setSaving(false);
        }
    };

    const scheduleIsEmpty = useMemo(() => {
        if (!schedule) return true;
        return !Object.values(schedule).some((day: any) =>
            Object.values(day).some((slot: any) => slot.subject !== '')
        );
    }, [schedule]);

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen">
            {/* Supercharged Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 print:hidden">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] relative z-10 transition-transform hover:scale-110 duration-500">
                            <Zap className="text-white fill-white/20" size={28} />
                        </div>
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-40 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-[1000] text-white tracking-[-0.04em] flex items-center gap-3">
                                <span className="text-indigo-400">SSTG</span>
                                <span className="opacity-20">/</span>
                                Intelligence
                            </h1>
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Sync</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-1 font-bold tracking-tight">
                            {viewMode === 'personal' ? 'System identified your personal rotation schedule.' : 'Automated constraint-based academic orchestrator.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    {/* View Controls */}
                    {currentUser?.role === ROLES.TEACHER && (
                        <div className="flex bg-slate-900 border border-white/5 p-1 rounded-2xl shadow-inner">
                            <button
                                onClick={() => setViewMode('personal')}
                                className={`px-5 py-2.5 rounded-xl text-[11px] font-[900] tracking-widest transition-all ${viewMode === 'personal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                PERSONAL
                            </button>
                            <button
                                onClick={() => setViewMode('class')}
                                className={`px-5 py-2.5 rounded-xl text-[11px] font-[900] tracking-widest transition-all ${viewMode === 'class' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                CLASS
                            </button>
                        </div>
                    )}

                    {/* Class Selector Matrix */}
                    {viewMode === 'class' && (
                        <div className="flex-1 min-w-[280px] bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 shadow-[inner_0_2px_4px_rgba(0,0,0,0.5)] flex items-center group hover:border-indigo-500/30 transition-all">
                            <div className="w-10 h-10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                <LayoutGrid size={20} />
                            </div>
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-transparent text-white text-sm font-black w-full p-2 outline-none cursor-pointer placeholder:text-slate-600"
                            >
                                <option value="" className="bg-slate-900">INITIALIZE CLASS MAP...</option>
                                {classes.map((c: any) => (
                                    <option key={c._id} value={c._id} className="bg-slate-900 uppercase font-black">{c.name} - Section {c.section}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2.5">
                        {canEdit && viewMode === 'class' && selectedClassId && (
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl ${isEditMode ? 'bg-indigo-600 text-white border-transparent' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                                title={isEditMode ? "View Professional Output" : "Enable Manual Overrides"}
                            >
                                {isEditMode ? <Eye size={22} /> : <Settings2 size={22} />}
                            </button>
                        )}

                        <button
                            onClick={() => window.print()}
                            className="p-4 rounded-2xl bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all shadow-xl"
                            title="Generate Ledger PDF"
                        >
                            <Printer size={22} />
                        </button>

                        <PermissionGuard resource={RESOURCES.SCHEDULES} action={ACTIONS.UPDATE}>
                            {viewMode === 'class' && selectedClassId && (
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={handleSSTGGenerate}
                                        disabled={isGenerating}
                                        className="px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-[1000] text-xs uppercase tracking-tighter flex items-center gap-3 transition-all disabled:opacity-50 active:scale-95 group relative overflow-hidden ring-1 ring-emerald-500/20"
                                    >
                                        {isGenerating ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 border-2 border-emerald-400 border-t-white/0 rounded-full animate-spin" />
                                                <span className="animate-pulse">{genStep}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Flame size={18} className="group-hover:text-amber-500 transition-colors" />
                                                <span>Auto-Generate</span>
                                            </>
                                        )}
                                    </button>

                                    {isEditMode && (
                                        <button
                                            onClick={handleSave}
                                            disabled={saving || isGenerating}
                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-[1000] text-xs uppercase tracking-widest shadow-[0_20px_40px_-5px_rgba(79,70,229,0.4)] flex items-center gap-3 transition-all active:scale-95 ring-1 ring-white/10"
                                        >
                                            <Save size={18} />
                                            <span>{saving ? 'SYNCING...' : 'Publish'}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </PermissionGuard>
                    </div>
                </div>
            </div>

            {/* Timetable Engine View */}
            {!selectedClassId ? (
                <div className="flex flex-col items-center justify-center py-52 bg-slate-950/40 rounded-[4rem] border border-dashed border-white/5 animate-in fade-in zoom-in-95 duration-[1.5s]">
                    <div className="w-44 h-44 bg-white/[0.01] rounded-[3.5rem] flex items-center justify-center text-4xl mb-12 shadow-[0_0_80px_rgba(79,70,229,0.1)] relative group cursor-default">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <Calendar size={80} className="text-slate-800 relative z-10 group-hover:text-indigo-500 transition-all duration-700 group-hover:scale-110" />
                    </div>
                    <h3 className="text-4xl font-[1000] text-white tracking-[-0.05em] mb-4">Initialize Matrix</h3>
                    <p className="text-slate-500 max-w-sm text-center font-bold leading-relaxed opacity-60">
                        Select a target group to activate the SSTG Automated Constraint Engine and publish synchronized schedules.
                    </p>
                </div>
            ) : loading ? (
                <div className="py-52 flex flex-col items-center justify-center gap-10">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-indigo-500/5 rounded-full" />
                        <div className="absolute inset-0 border-[6px] border-indigo-500 border-t-transparent rounded-full animate-[spin_0.8s_linear_infinite]" />
                        <div className="absolute inset-6 border-4 border-emerald-500/20 border-b-transparent rounded-full animate-[spin_1.2s_linear_infinite_reverse]" />
                    </div>
                    <div className="space-y-2 text-center">
                        <p className="text-indigo-400 font-black uppercase tracking-[0.5em] text-[11px] animate-pulse">Synchronizing Global Slate</p>
                        <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">Verifying Neural Constraints...</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Auto-Gen Prompt for Empty Schedules */}
                    {scheduleIsEmpty && !isEditMode && canEdit && (
                        <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2.5rem] gap-6 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32" />
                            <div className="flex items-center gap-6 relative z-10">
                                <div className="p-4 bg-indigo-600 rounded-2xl shadow-xl">
                                    <Sparkles className="text-white" size={24} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-white tracking-tight">Schedule Missing</h4>
                                    <p className="text-sm text-indigo-300/70 font-bold">This class matrix is currently vacant. Would you like to initialize it automatically?</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSSTGGenerate}
                                className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 relative z-10"
                            >
                                Auto-Fill Class
                            </button>
                        </div>
                    )}

                    <div className="glass-dark rounded-[3.5rem] border border-white/5 overflow-hidden shadow-[0_64px_128px_-32px_rgba(0,0,0,0.7)] overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[1200px] border-collapse bg-slate-950/60 table-fixed">
                            <thead>
                                <tr className="border-b border-white/10 bg-slate-950/80">
                                    <th className="p-10 text-left text-[11px] font-[1000] text-slate-600 uppercase tracking-[0.4em] w-32 sticky left-0 z-30 backdrop-blur-3xl border-r border-white/10">
                                        CAL
                                    </th>
                                    {TIME_SLOTS.map((slot, i) => (
                                        <th key={i} className={`p-8 text-center border-r border-white/10 last:border-r-0 ${slot.type === 'break' ? 'w-24 bg-indigo-600/5' : ''}`}>
                                            <div className="text-[13px] font-[1000] text-white tracking-tighter mb-1.5">{slot.start} — {slot.end}</div>
                                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest opacity-40">{slot.label}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {DAYS.map((day) => (
                                    <tr key={day} className="group hover:bg-white/[0.04] transition-all duration-500">
                                        <td className="p-10 font-black text-white text-[13px] uppercase tracking-[0.25em] bg-slate-900 sticky left-0 z-20 backdrop-blur-3xl border-r border-white/10 group-hover:text-indigo-400 transition-colors">
                                            {day.substring(0, 3)}
                                        </td>

                                        {TIME_SLOTS.map((ts, idx) => {
                                            if (ts.type === 'break') {
                                                return (
                                                    <td key={idx} className="bg-indigo-600/[0.03] relative overflow-hidden border-r border-white/10">
                                                        <div className="absolute inset-0 flex items-center justify-center -rotate-90 select-none pointer-events-none opacity-[0.03]">
                                                            <span className="text-[14px] font-[1000] tracking-[1.5em] text-white uppercase italic">INTERMISSION</span>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            const cell = schedule[day]?.[idx];
                                            return (
                                                <td key={idx} className="p-5 border-r border-white/10 last:border-r-0 h-48 align-top transition-all">
                                                    {isEditMode ? (
                                                        <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-600 uppercase px-1">Subject</label>
                                                                <select
                                                                    value={cell?.subject || ''}
                                                                    onChange={(e) => handleCellChange(day, idx, 'subject', e.target.value)}
                                                                    className="w-full text-[10px] font-black p-3.5 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-xl"
                                                                >
                                                                    <option value="" className="bg-slate-900 text-slate-600 px-2">NONE</option>
                                                                    {availableSubjects.map((s: any) => (
                                                                        <option key={s._id} value={s._id} className="bg-slate-900">{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[9px] font-black text-slate-600 uppercase px-1">Assignees</label>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex flex-wrap gap-1 p-1 bg-white/5 rounded-lg">
                                                                        {cell?.teachers?.map((tId: string) => (
                                                                            <span key={tId} className="px-2 py-0.5 bg-indigo-500 text-[8px] font-bold text-white rounded-full flex items-center gap-1">
                                                                                {teachers.find(t => t._id === tId)?.firstName}
                                                                                <button
                                                                                    onClick={() => handleCellChange(day, idx, 'teachers', cell.teachers.filter((id: string) => id !== tId))}
                                                                                    className="hover:text-red-200"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            </span>
                                                                        ))}
                                                                        {(!cell?.teachers || cell.teachers.length === 0) && <span className="text-[8px] text-slate-500 italic px-1">None</span>}
                                                                    </div>
                                                                    <select
                                                                        value=""
                                                                        onChange={(e) => {
                                                                            if (e.target.value && !cell.teachers?.includes(e.target.value)) {
                                                                                handleCellChange(day, idx, 'teachers', [...(cell.teachers || []), e.target.value]);
                                                                            }
                                                                        }}
                                                                        className="w-full text-[10px] font-bold p-2 bg-white/[0.03] border border-white/10 rounded-xl text-indigo-300/80 outline-none focus:ring-1 focus:ring-indigo-500/50"
                                                                    >
                                                                        <option value="" className="bg-slate-900 text-slate-600">Add Teacher...</option>
                                                                        {getAvailableTeachersForSubject(cell?.subject).map((t: any) => (
                                                                            <option key={t._id} value={t._id} className="bg-slate-900" disabled={cell?.teachers?.includes(t._id)}>
                                                                                {t.firstName} {t.lastName}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full">
                                                            {cell?.subjectName ? (
                                                                <div className={`p-6 rounded-[2.2rem] border h-full flex flex-col justify-between transition-all hover:scale-[1.05] hover:-translate-y-1 duration-500 ${getSubjectColor(cell.subjectName)} shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative group/card border-white/5`}>
                                                                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity rounded-[2.2rem]" />
                                                                    <div>
                                                                        <div className="flex items-center gap-2.5 mb-3">
                                                                            <BookOpen size={16} className="shrink-0 opacity-60" />
                                                                            <span className="text-[13px] font-[1000] uppercase tracking-wider line-clamp-1">{cell.subjectName}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2.5 text-white/60">
                                                                            <User size={14} className="shrink-0 opacity-40" />
                                                                            <span className="text-[11px] font-bold line-clamp-none italic tracking-tight">{viewMode === 'personal' ? cell.className : cell.teacherNames}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between mt-5 relative z-10">
                                                                        <div className="flex items-center gap-1.5 text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">
                                                                            <Clock size={12} />
                                                                            {ts.start}
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-10" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full w-full rounded-[2.2rem] border border-dashed border-white/10 flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.03] transition-all group-hover:border-indigo-500/30">
                                                                    <MousePointer2 size={16} className="text-white/5 group-hover:text-indigo-500/30 transition-colors mb-2" />
                                                                    <span className="text-[10px] font-black text-white/5 uppercase tracking-[0.4em] group-hover:text-indigo-500/30 transition-all">VACANT</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    body { background: white !important; padding: 20px; }
                    .glass-dark { border-radius: 0 !important; border: 2px solid #000 !important; color: black !important; }
                    th, td { border: 1px solid #ddd !important; }
                    .print\\:hidden { display: none !important; }
                    [class*='bg-'] { background: #fafafa !important; border: 1px solid #000 !important; }
                    .text-white, .text-slate-500, .text-indigo-400 { color: black !important; }
                }
                .custom-scrollbar::-webkit-scrollbar { height: 12px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e1e1e; border: 3px solid #000; border-radius: 99px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
            `}</style>
        </div>
    );
}
