"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X, MapPin, Clock, Users, Bell, Trash2 } from 'lucide-react';

type EventType = 'holiday' | 'exam' | 'parent_meeting' | 'school_event';
type SchoolEvent = { id: string; title: string; description?: string; type: EventType; startAt: string; endAt: string; allDay: boolean; location?: string; classId?: string; source?: string; createdById?: string; reminderMinutes?: number; rsvps?: { userId: string; status: string }[] };
const colors: Record<EventType, string> = { holiday: 'bg-emerald-500', exam: 'bg-rose-500', parent_meeting: 'bg-amber-500', school_event: 'bg-indigo-500' };
const labels: Record<EventType, string> = { holiday: 'Holiday', exam: 'Exam', parent_meeting: 'Parent meeting', school_event: 'School event' };
const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [selected, setSelected] = useState<SchoolEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [form, setForm] = useState({ title: '', description: '', type: 'school_event' as EventType, startAt: localInput(), endAt: localInput(new Date(Date.now() + 3600000)), allDay: false, location: '', classId: '', targetRoles: [] as string[], reminderMinutes: 1440 });
  const canCreate = ['school-admin', 'super-admin', 'teacher'].includes(me?.role);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const from = new Date(month.getFullYear(), month.getMonth(), 1);
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}').role;
      const [eventRes, classRes] = await Promise.all([api.get('/calendar/events', { params: { from: from.toISOString(), to: to.toISOString() } }), ['school-admin', 'super-admin', 'teacher'].includes(role) ? api.get('/classes').catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } })]);
      setEvents(eventRes.data.data || []); setClasses(classRes.data.data || []);
    } catch (requestError: any) { setError(requestError.response?.data?.message || 'Could not load calendar'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { const stored = localStorage.getItem('user'); if (stored) setMe(JSON.parse(stored)); }, []);
  useEffect(() => { load(); }, [load]);

  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
  }, [month]);
  const visibleEvents = filter === 'all' ? events : events.filter(event => event.type === filter);
  const eventsForDay = (date: Date) => visibleEvents.filter(event => { const start = new Date(event.startAt); const end = new Date(event.endAt); const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1); return start < dayEnd && end >= dayStart; });

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    try { await api.post('/calendar/events', { ...form, classId: form.classId || null }); setShowCreate(false); setForm({ ...form, title: '', description: '', location: '' }); await load(); }
    catch (requestError: any) { setError(requestError.response?.data?.message || 'Could not create event'); }
  };
  const rsvp = async (status: string) => { if (!selected || selected.source === 'exam') return; await api.put(`/calendar/events/${selected.id}/rsvp`, { status }); await load(); setSelected(current => current ? { ...current, rsvps: [{ userId: me?.id || me?._id, status }] } : null); };
  const cancelEvent = async () => { if (!selected || !confirm('Cancel this event?')) return; await api.delete(`/calendar/events/${selected.id}`); setSelected(null); load(); };
  const myId = me?.id || me?._id;

  return <div className="max-w-7xl mx-auto space-y-5">
    <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${me?.role === 'student' ? 'rounded-3xl bg-[#405bb2] p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8' : ''}`}><div><h1 className={`text-2xl font-bold flex items-center gap-2 ${me?.role === 'student' ? 'text-white' : ''}`}><CalendarDays className={me?.role === 'student' ? 'text-white' : 'text-indigo-500'} /> School Calendar</h1><p className={`text-sm ${me?.role === 'student' ? 'text-indigo-100' : 'text-slate-500'}`}>Holidays, exams, meetings and school events.</p></div>{canCreate && <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Add event</button>}</header>
    {error && <div role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 p-3 text-rose-700 dark:text-rose-300">{error}</div>}
    <div className="surface-card overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft /></button><h2 className="font-bold text-lg min-w-44 text-center">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight /></button><button onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="text-sm px-3 py-1.5 border rounded-lg">Today</button></div><div className="flex gap-1 overflow-x-auto">{(['all', 'holiday', 'exam', 'parent_meeting', 'school_event'] as const).map(type => <button key={type} onClick={() => setFilter(type)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filter === type ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>{type === 'all' ? 'All' : labels[type]}</button>)}</div></div>
      {loading ? <div className="h-96 flex items-center justify-center text-slate-500">Loading calendar…</div> : <><div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day} className="py-2 text-center text-xs font-bold text-slate-500">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((date, index) => date ? <div key={date.toISOString()} className="min-h-24 sm:min-h-32 border-r border-b border-slate-200 dark:border-slate-700 p-1.5"><span className={`inline-flex w-7 h-7 items-center justify-center text-xs font-semibold rounded-full ${date.toDateString() === new Date().toDateString() ? 'bg-indigo-600 text-white' : ''}`}>{date.getDate()}</span><div className="space-y-1 mt-1">{eventsForDay(date).slice(0, 3).map(item => <button key={item.id} onClick={() => setSelected(item)} className={`w-full text-left truncate text-[10px] sm:text-xs px-1.5 py-1 rounded text-white ${colors[item.type]}`}>{item.title}</button>)}</div></div> : <div key={`blank-${index}`} className="min-h-24 sm:min-h-32 border-r border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30" />)}</div></>}
    </div>

    {selected && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="surface-card w-full max-w-lg p-6"><div className="flex justify-between gap-3"><div><span className={`inline-block px-2 py-1 rounded text-xs text-white ${colors[selected.type]}`}>{labels[selected.type]}</span><h2 className="text-xl font-bold mt-2">{selected.title}</h2></div><button onClick={() => setSelected(null)}><X /></button></div>{selected.description && <p className="mt-3 text-slate-600 dark:text-slate-300">{selected.description}</p>}<div className="mt-4 space-y-2 text-sm text-slate-500"><p className="flex gap-2"><Clock className="w-4 h-4" />{new Date(selected.startAt).toLocaleString()} — {new Date(selected.endAt).toLocaleString()}</p>{selected.location && <p className="flex gap-2"><MapPin className="w-4 h-4" />{selected.location}</p>}<p className="flex gap-2"><Users className="w-4 h-4" />{selected.rsvps?.length || 0} responses</p></div>{selected.source !== 'exam' && <div className="mt-5"><p className="text-xs font-bold uppercase text-slate-500 mb-2">Your RSVP</p><div className="flex gap-2">{[['going','Going'],['maybe','Maybe'],['not_going','Not going']].map(([value,label]) => <button key={value} onClick={() => rsvp(value)} className={`flex-1 py-2 rounded-lg border text-sm ${(selected.rsvps || []).find(item => item.userId === myId)?.status === value ? 'bg-indigo-600 text-white' : ''}`}>{label}</button>)}</div></div>}{selected.createdById === myId || ['school-admin','super-admin'].includes(me?.role) ? <button onClick={cancelEvent} className="mt-5 text-rose-600 flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Cancel event</button> : null}</div></div>}

    {showCreate && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true"><form onSubmit={createEvent} className="surface-card w-full max-w-xl p-6 space-y-4"><div className="flex justify-between"><h2 className="text-xl font-bold">Create event</h2><button type="button" onClick={() => setShowCreate(false)}><X /></button></div><input required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Event title" className="w-full border rounded-xl bg-transparent px-4 py-2.5" /><textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Description" className="w-full border rounded-xl bg-transparent px-4 py-2.5" /><div className="grid sm:grid-cols-2 gap-3"><select value={form.type} onChange={e => setForm({...form,type:e.target.value as EventType})} className="border rounded-xl bg-transparent px-4 py-2.5">{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><select value={form.classId} onChange={e => setForm({...form,classId:e.target.value})} className="border rounded-xl bg-transparent px-4 py-2.5"><option value="">Whole school</option>{classes.map(cls => <option key={cls.id || cls._id} value={cls.id || cls._id}>{cls.name} {cls.section}</option>)}</select><input type="datetime-local" required value={form.startAt} onChange={e => setForm({...form,startAt:e.target.value})} className="border rounded-xl bg-transparent px-4 py-2.5" /><input type="datetime-local" required value={form.endAt} onChange={e => setForm({...form,endAt:e.target.value})} className="border rounded-xl bg-transparent px-4 py-2.5" /></div><input value={form.location} onChange={e => setForm({...form,location:e.target.value})} placeholder="Location (optional)" className="w-full border rounded-xl bg-transparent px-4 py-2.5" /><div><label className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-2"><Bell className="w-4 h-4" /> Reminder</label><select value={form.reminderMinutes} onChange={e => setForm({...form,reminderMinutes:Number(e.target.value)})} className="w-full border rounded-xl bg-transparent px-4 py-2.5"><option value={60}>1 hour before</option><option value={1440}>1 day before</option><option value={10080}>1 week before</option></select></div><button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold">Create event</button></form></div>}
  </div>;
}
