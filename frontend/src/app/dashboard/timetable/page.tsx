"use client";
import { useState, useEffect, useMemo } from 'react';
import api from '../../utils/api';
import {
    Save, Wand2, Printer, Eye, Calendar, User,
    BookOpen, Clock, AlertCircle, LayoutGrid, Settings2, ShieldCheck
} from 'lucide-react';
import { PermissionGuard } from '@/components/PermissionGuard';
import SchoolPrintHeader from '@/components/SchoolPrintHeader';
import { usePermission, RESOURCES, ACTIONS, ROLES } from '@/hooks/usePermission';

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

const TIME_SLOTS = [
    { start: '07:30', end: '08:10', label: 'Period 1' },
    { start: '08:10', end: '08:50', label: 'Period 2' },
    { start: '08:50', end: '09:30', label: 'Period 3' },
    { start: '09:30', end: '10:00', label: 'Break', type: 'break' },
    { start: '10:00', end: '10:40', label: 'Period 4' },
    { start: '10:40', end: '11:20', label: 'Period 5' },
    { start: '11:20', end: '12:05', label: 'Period 6' },
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
    const [unschedulable, setUnschedulable] = useState<any[]>([]);
    const [personalSlots, setPersonalSlots] = useState<any[]>([]);

    const [schedule, setSchedule] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);

    const { hasPermission } = usePermission();
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
                const classFromQuery = new URLSearchParams(window.location.search).get('class');
                if (classFromQuery) setSelectedClassId(classFromQuery);

                if (userObj?.role === ROLES.STUDENT) {
                    setLoading(true);
                    const [scheduleRes, tenantRes] = await Promise.all([api.get('/timetable/student/me'), api.get('/tenants/me')]);
                    setPersonalSlots(scheduleRes.data.data || []);
                    setTenant(tenantRes.data.data);
                    setViewMode('personal');
                    setLoading(false);
                    return;
                }

                const [clsRes, subRes, tchRes, tenantRes] = await Promise.all([
                    api.get('/classes?limit=100'),
                    api.get('/subjects?limit=100'),
                    api.get('/teachers?limit=100'),
                    api.get('/tenants/me')
                ]);

                setClasses(clsRes.data.data);
                setSubjects(subRes.data.data);
                setTeachers(tchRes.data.data);
                setTenant(tenantRes.data.data);

                if (userObj?.role === ROLES.TEACHER) {
                    setViewMode('personal');
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
            setUnschedulable([]);
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
                setPersonalSlots(viewMode === 'personal' ? data.data : []);

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
                                subject: slot.subject?.id || slot.subject?._id || slot.subject,
                                teachers: slot.teachers ? slot.teachers.map((t: any) => t.id || t._id || t) : [],
                                subjectName: slot.subject?.name,
                                teacherNames: slot.teachers ? slot.teachers.map((t: any) => `${t.firstName} ${t.lastName}`).join(', ') : '',
                                className: slot.class?.name ? `${slot.class.name}-${slot.class.section}` : '',
                                room: slot.room || ''
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
        setUnschedulable([]);
        setGenStep('SOLVING MATRIX CONSTRAINTS...');

        try {
            const { data: globalData } = await api.get('/timetable');
            const globalSlots = globalData.data;

            const overlaps = (startA: string, endA: string, startB: string, endB: string) =>
                startA < endB && endA > startB;
            const externalSlots = globalSlots.filter((s: any) => (s.class?._id || s.classId) !== selectedClassId);
            const isTeacherBusy = (teacherIds: string[], day: string, start: string, end: string) => {
                return globalSlots.some((s: any) =>
                    s.teachers?.some((t: any) => teacherIds.includes(t._id || t)) &&
                    s.day === day &&
                    overlaps(start, end, s.startTime, s.endTime) &&
                    (s.class?._id || s.classId) !== selectedClassId
                );
            };
            const isRoomBusy = (room: string, day: string, start: string, end: string) => !!room &&
                externalSlots.some((s: any) => s.room?.trim().toLowerCase() === room.trim().toLowerCase() &&
                    s.day === day && overlaps(start, end, s.startTime, s.endTime));

            const allocations = currentClass.subjects.map((entry: any) => {
                const subjectId = entry.subject?._id || entry.subject;
                const subject = subjects.find(s => s._id === subjectId) || entry.subject;
                const teacherIds = entry.teachers?.map((t: any) => t._id || t) || [];
                return {
                    subjectId,
                    subjectName: subject?.name || 'Unknown subject',
                    teacherIds,
                    teacherNames: teachers.filter(t => teacherIds.includes(t._id))
                        .map(t => `${t.firstName} ${t.lastName}`).join(', '),
                    room: (entry.room || currentClass.room || '').trim(),
                    requested: Math.max(0, Number(entry.weeklyPeriods) || 0),
                    remaining: Math.max(0, Number(entry.weeklyPeriods) || 0),
                    placedDays: new Set<string>()
                };
            });
            const newSchedule: any = {};
            DAYS.forEach(day => {
                newSchedule[day] = {};
                TIME_SLOTS.forEach((ts, idx) => {
                    newSchedule[day][idx] = { subject: '', teachers: [] };
                });
            });

            const teachingSlots = DAYS.flatMap(day => TIME_SLOTS
                .map((ts, idx) => ({ day, ts, idx }))
                .filter(({ ts }) => ts.type !== 'break'));
            for (const slot of teachingSlots) {
                const candidates = allocations
                    .filter((a: any) => a.remaining > 0 && a.teacherIds.length > 0)
                    .filter((a: any) => !isTeacherBusy(a.teacherIds, slot.day, slot.ts.start, slot.ts.end))
                    .filter((a: any) => !isRoomBusy(a.room, slot.day, slot.ts.start, slot.ts.end))
                    .sort((a: any, b: any) =>
                        Number(a.placedDays.has(slot.day)) - Number(b.placedDays.has(slot.day)) ||
                        (b.remaining / Math.max(1, b.requested)) - (a.remaining / Math.max(1, a.requested)) ||
                        a.subjectName.localeCompare(b.subjectName));
                const selected = candidates[0];
                if (!selected) continue;
                newSchedule[slot.day][slot.idx] = {
                    subject: selected.subjectId,
                    teachers: selected.teacherIds,
                    subjectName: selected.subjectName,
                    teacherNames: selected.teacherNames,
                    room: selected.room
                };
                selected.remaining -= 1;
                selected.placedDays.add(slot.day);
            }

            setUnschedulable(allocations.filter((a: any) => a.remaining > 0).map((a: any) => ({
                subjectId: a.subjectId,
                subjectName: a.subjectName,
                requested: a.requested,
                scheduled: a.requested - a.remaining,
                unscheduled: a.remaining,
                reason: a.teacherIds.length === 0 ? 'No teacher assigned' : 'No conflict-free teacher/room period available'
            })));

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
                    if (cell.subject) {
                        slotsToSave.push({
                            day,
                            startTime: ts.start,
                            endTime: ts.end,
                            subjectId: cell.subject,
                            teachers: cell.teachers,
                            room: cell.room || null
                        });
                    }
                });
            });
            await api.post('/timetable/bulk', { classId: selectedClassId, slots: slotsToSave });
            alert("MATRIX PUBLISHED: Timetable is now live for all students and faculty.");
            setIsEditMode(false);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || "Publishing Failed";
            console.error("Timetable publishing failed:", message);
            alert(`Publishing Failed: ${message}`);
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

    if (currentUser?.role === ROLES.STUDENT) {
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
        const todaysSlots = personalSlots.filter((slot: any) => slot.day === today);
        return (
            <div className="print-area mx-auto max-w-5xl space-y-5 pb-8">
                <SchoolPrintHeader name={tenant?.schoolName || tenant?.name} logoUrl={tenant?.config?.logoUrl || tenant?.logoUrl} subtitle="Student timetable" />
                <button onClick={() => window.print()} className="no-print rounded-xl bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white">Print timetable</button>
                <header><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><span>Academics</span><span>/</span><span className="text-slate-700 dark:text-slate-200">Timetable</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">My timetable</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your class schedule for the school week.</p></header>
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1E3A8A] p-5 text-white"><div><p className="text-sm text-blue-100">Today · {new Date().toLocaleDateString()}</p><h2 className="mt-1 text-xl font-bold">{today}</h2></div><div className="rounded-xl bg-white/10 px-4 py-2 text-center"><strong className="block text-xl">{todaysSlots.length}</strong><span className="text-xs text-blue-100">lessons today</span></div></section>
                {loading ? <section aria-label="Loading timetable" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="h-7 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700" /><div className="h-56 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /></section> : personalSlots.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-800"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/50 dark:text-cyan-300"><Calendar className="h-7 w-7" /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No timetable available</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your class schedule will appear here when it is published.</p></section> : <>
                    <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900 dark:text-white">Today&apos;s lessons</h2><span className="text-xs text-slate-500">{todaysSlots.length} scheduled</span></div>{todaysSlots.length ? <div className="grid gap-3 sm:grid-cols-2">{todaysSlots.map((slot: any) => <article key={slot._id || slot.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="shrink-0 rounded-xl bg-cyan-50 px-3 py-2 text-center text-xs font-bold text-[#1E3A8A] dark:bg-cyan-950/40 dark:text-cyan-200">{slot.startTime}<span className="block mt-1 font-medium text-slate-500">{slot.endTime}</span></div><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900 dark:text-white">{slot.subject?.name || 'Lesson'}</h3><p className="mt-1 text-xs text-slate-500">Room {slot.room || 'Not set'}</p><p className="mt-1 truncate text-xs text-slate-500">{slot.teachers?.map((teacher: any) => teacher.firstName + ' ' + teacher.lastName).join(', ') || 'Teacher not assigned'}</p></div></article>)}</div> : <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">No lessons scheduled for today.</div>}</section>
                    <section><h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Weekly schedule</h2><div className="space-y-3">{DAYS.map((day) => { const slots = personalSlots.filter((slot: any) => slot.day === day).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)); if (!slots.length) return null; return <article key={day} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><header className={day === today ? 'border-b border-slate-100 bg-cyan-50 px-4 py-3 font-semibold text-[#1E3A8A] dark:border-slate-700 dark:bg-cyan-950/30 dark:text-cyan-200' : 'border-b border-slate-100 bg-slate-50 px-4 py-3 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200'}>{day}<span className="ml-2 text-xs font-normal text-slate-500">{slots.length} lessons</span></header><div className="divide-y divide-slate-100 dark:divide-slate-700">{slots.map((slot: any) => <div key={slot._id || slot.id} className="grid grid-cols-[80px_1fr] gap-3 px-4 py-3 sm:grid-cols-[100px_1fr_auto] sm:items-center"><span className="text-xs font-semibold text-[#1E3A8A] dark:text-cyan-300">{slot.startTime}–{slot.endTime}</span><div><p className="font-medium text-slate-800 dark:text-slate-200">{slot.subject?.name || 'Subject'}</p><p className="mt-0.5 text-xs text-slate-500">Room {slot.room || 'Not set'}</p></div><span className="col-start-2 text-xs text-slate-500 sm:col-auto">{slot.teachers?.map((teacher: any) => teacher.firstName + ' ' + teacher.lastName).join(', ') || 'Teacher not assigned'}</span></div>)}</div></article>; })}</div></section>
                </>}
            </div>
        );
    }

    const scheduledCount = Object.values(schedule || {}).reduce((total: number, day: any) => total + Object.values(day || {}).filter((slot: any) => Boolean(slot?.subject)).length, 0);
    const scheduledDays = DAYS.filter((day) => Object.values(schedule?.[day] || {}).some((slot: any) => Boolean(slot?.subject))).length;
    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    return (
        <div className="mx-auto min-h-full max-w-[1600px] space-y-5 pb-8">
            <div className="print-area mx-auto min-h-full max-w-[1600px] space-y-5 pb-8">
            <SchoolPrintHeader name={tenant?.schoolName || tenant?.name} logoUrl={tenant?.config?.logoUrl || tenant?.logoUrl} subtitle="School timetable" />
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400"><span>Academics</span><span>/</span><span className="text-slate-700 dark:text-slate-200">Timetable</span></div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{viewMode === 'personal' ? 'My timetable' : 'Class timetable'}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{viewMode === 'personal' ? 'Your assigned lessons for the school week.' : 'View and manage weekly lessons, teachers, and rooms.'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {currentUser?.role === ROLES.TEACHER && <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <button onClick={() => setViewMode('personal')} aria-pressed={viewMode === 'personal'} className={viewMode === 'personal' ? 'rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white' : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}>My schedule</button>
                        <button onClick={() => setViewMode('class')} aria-pressed={viewMode === 'class'} className={viewMode === 'class' ? 'rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white' : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'}>By class</button>
                    </div>}
                    {viewMode === 'class' && <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800 md:flex-none"><LayoutGrid className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" /><span className="sr-only">Select class</span><select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full bg-transparent font-medium text-slate-700 outline-none dark:text-slate-200"><option value="">Select a class</option>{classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}{c.section ? ' · Section ' + c.section : ''}</option>)}</select></label>}
                    <button onClick={() => window.print()} title="Print timetable" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"><Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span></button>
                    {canEdit && viewMode === 'class' && selectedClassId && <>
                        <button onClick={() => setIsEditMode(!isEditMode)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{isEditMode ? <Eye className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}{isEditMode ? 'Preview' : 'Edit schedule'}</button>
                        <PermissionGuard resource={RESOURCES.SCHEDULES} action={ACTIONS.UPDATE}>
                            <button onClick={handleSSTGGenerate} disabled={isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60">{isGenerating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Wand2 className="h-4 w-4" />}<span>{isGenerating ? 'Generating…' : 'Auto-generate'}</span></button>
                            {isEditMode && <button onClick={handleSave} disabled={saving || isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save timetable'}</button>}
                        </PermissionGuard>
                    </>}
                </div>
            </header>

            {currentUser?.role !== ROLES.TEACHER && viewMode === 'class' && selectedClassId && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Timetable summary">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scheduled lessons</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{scheduledCount}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Days with lessons</p><p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{scheduledDays} <span className="text-sm font-medium text-slate-400">/ {DAYS.length}</span></p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selected class</p><p className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">{currentClass?.name || 'Class'}{currentClass?.section ? ' · Section ' + currentClass.section : ''}</p></div>
            </section>}

            {unschedulable.length > 0 && <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><div className="flex items-center gap-2 font-bold"><AlertCircle className="h-4 w-4" />Some periods could not be placed</div><ul className="mt-2 grid gap-1 sm:grid-cols-2">{unschedulable.map((item: any) => <li key={item.subjectId}>{item.subjectName}: {item.scheduled}/{item.requested} scheduled — {item.reason}</li>)}</ul></section>}

            {viewMode === 'class' && !selectedClassId ? <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-800"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/50 dark:text-cyan-300"><Calendar className="h-7 w-7" /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Choose a class to view its timetable</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">Select a class from the menu above to see its weekly lessons, assigned teachers, and rooms.</p></section>
            : loading ? <section aria-label="Loading timetable" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="h-7 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-700" /><div className="h-72 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700" /></section>
            : viewMode === 'personal' ? <section className="space-y-5">
                <div className="flex items-end justify-between"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">My teaching week</h2><p className="text-sm text-slate-500 dark:text-slate-400">{personalSlots.length} assigned lesson{personalSlots.length === 1 ? '' : 's'}</p></div><span className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200">{currentDay}</span></div>
                {personalSlots.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-800"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700"><Calendar className="h-6 w-6" /></div><h3 className="mt-4 font-bold text-slate-900 dark:text-white">No lessons assigned yet</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your schedule will appear here when lessons are assigned.</p></div> :
                    <div className="space-y-4">{DAYS.map((day) => { const lessons = personalSlots.filter((slot: any) => slot.day === day).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)); if (!lessons.length) return null; return <article key={day} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><header className={day === currentDay ? 'flex items-center justify-between border-b border-slate-100 bg-cyan-50/70 px-4 py-3 dark:border-slate-700 dark:bg-cyan-950/20' : 'flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800'}><h3 className="font-semibold text-slate-900 dark:text-white">{day}</h3><span className="text-xs text-slate-500">{lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span></header><div className="divide-y divide-slate-100 dark:divide-slate-700">{lessons.map((slot: any) => <div key={slot._id || slot.id} className="grid grid-cols-[72px_1fr] gap-3 px-4 py-3 sm:grid-cols-[90px_1fr_auto] sm:items-center"><span className="text-xs font-semibold text-[#1E3A8A] dark:text-cyan-300">{slot.startTime}–{slot.endTime}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{slot.subject?.name || 'Subject'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{slot.class?.name || 'Class'}{slot.class?.section ? ' · ' + slot.class.section : ''} · Room {slot.room || 'Not set'}</p></div><div className="col-start-2 text-xs text-slate-500 sm:col-auto">{slot.teachers?.map((teacher: any) => teacher.firstName + ' ' + teacher.lastName).join(', ')}</div></div>)}</div></article>; })}</div>}
            </section>
            : scheduleIsEmpty && !isEditMode && canEdit ? <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800 sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"><Wand2 className="h-7 w-7" /></div><h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">This class has no timetable yet</h2><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">Build it automatically from the class subject and teacher assignments, or enter lessons manually.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={handleSSTGGenerate} disabled={isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"><Wand2 className="h-4 w-4" />{isGenerating ? genStep : 'Auto-generate timetable'}</button><button onClick={() => setIsEditMode(true)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"><Settings2 className="h-4 w-4" />Enter manually</button></div></section>
            : <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900 dark:text-white">{currentClass?.name || 'Class schedule'}{currentClass?.section ? ' · Section ' + currentClass.section : ''}</h2><p className="text-xs text-slate-500 dark:text-slate-400">{isEditMode ? 'Edit lesson assignments, teachers, and rooms.' : 'Weekly lessons and assigned staff.'}</p></div><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> School timetable</div></div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] border-collapse text-left">
                        <thead><tr className="bg-slate-50 dark:bg-slate-900/50"><th className="sticky left-0 z-10 w-28 border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Day</th>{TIME_SLOTS.map((slot) => <th key={slot.start} className={slot.type === 'break' ? 'min-w-36 border-b border-r border-slate-200 bg-cyan-50/60 px-3 py-3 text-xs font-semibold text-slate-600 last:border-r-0 dark:border-slate-700 dark:bg-cyan-950/20 dark:text-slate-300' : 'min-w-36 border-b border-r border-slate-200 px-3 py-3 text-xs font-semibold text-slate-600 last:border-r-0 dark:border-slate-700 dark:text-slate-300'}><span className="block">{slot.label}</span><span className="mt-1 block font-normal text-slate-400">{slot.start}–{slot.end}</span></th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{DAYS.map((day) => <tr key={day} className={day === currentDay ? 'bg-cyan-50/30 dark:bg-cyan-950/10' : ''}><th scope="row" className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{day}</th>{TIME_SLOTS.map((slot, idx) => { const cell = schedule[day]?.[idx] || { subject: '', teachers: [] }; if (slot.type === 'break') return <td key={slot.start} className="border-r border-slate-100 bg-slate-50/70 px-2 text-center text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-900/40">Break</td>; return <td key={slot.start} className="min-w-36 border-r border-slate-100 p-2 align-top last:border-r-0 dark:border-slate-700">{isEditMode ? <div className="space-y-2"><label className="block"><span className="sr-only">{day} {slot.label} subject</span><select value={cell.subject || ''} onChange={(e) => handleCellChange(day, idx, 'subject', e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"><option value="">No subject</option>{availableSubjects.map((subject: any) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}</select></label><label className="block"><span className="sr-only">{day} {slot.label} room</span><input value={cell.room || ''} onChange={(e) => handleCellChange(day, idx, 'room', e.target.value)} placeholder="Room" className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" /></label><select aria-label={day + ' ' + slot.label + ' teacher'} value="" onChange={(e) => e.target.value && !cell.teachers?.includes(e.target.value) && handleCellChange(day, idx, 'teachers', [...(cell.teachers || []), e.target.value])} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"><option value="">Add teacher</option>{getAvailableTeachersForSubject(cell.subject).map((teacher: any) => <option key={teacher._id} value={teacher._id} disabled={cell.teachers?.includes(teacher._id)}>{teacher.firstName} {teacher.lastName}</option>)}</select><div className="flex flex-wrap gap-1">{cell.teachers?.map((teacherId: string) => <button type="button" key={teacherId} onClick={() => handleCellChange(day, idx, 'teachers', cell.teachers.filter((id: string) => id !== teacherId))} className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">{teachers.find((teacher) => teacher._id === teacherId)?.firstName || 'Teacher'} ×</button>)}</div></div> : cell.subjectName ? <div className={getSubjectColor(cell.subjectName) + ' min-h-24 rounded-xl border p-2.5'}><div className="flex items-start gap-1.5"><BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div className="min-w-0"><p className="truncate text-xs font-semibold">{cell.subjectName}</p><p className="mt-1 flex items-start gap-1 text-[10px] opacity-80"><User className="mt-0.5 h-3 w-3 shrink-0" /><span>{cell.teacherNames || 'Teacher not assigned'}</span></p>{cell.room && <p className="mt-1 text-[10px] opacity-70">Room {cell.room}</p>}</div></div><p className="mt-2 flex items-center gap-1 text-[10px] opacity-60"><Clock className="h-3 w-3" />{slot.start}</p></div> : <div className="grid min-h-20 place-items-center rounded-xl border border-dashed border-slate-200 text-[10px] text-slate-400 dark:border-slate-700">—</div>}</td>; })}</tr>)}</tbody>
                    </table>
                </div>
                <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-700">On smaller screens, swipe horizontally to see each period.</p>
            </section>}
            </div>
        </div>
    );
}
