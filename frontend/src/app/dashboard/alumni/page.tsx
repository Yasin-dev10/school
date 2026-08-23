"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, GraduationCap, MapPin, Plus, Search, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

type Alumni = { id: string; firstName: string; lastName: string; email?: string; phone?: string; graduationYear: number; program?: string; currentCity?: string; employmentStatus: string; employer?: string; jobTitle?: string; university?: string; degree?: string; notes?: string };
type Event = { id: string; title: string; description?: string; location?: string; startsAt: string; capacity?: number; attendeeCount: number; status: string };
type Donation = { id: string; alumniId?: string; donorName: string; amount: number; currency: string; purpose?: string; donatedAt: string; status: string };
type Overview = { alumni: Alumni[]; events: Event[]; donations: Donation[]; stats: { total: number; employed: number; higherEducation: number; totalDonations: number } };
type Tab = 'directory' | 'events' | 'donations' | 'outcomes';

const emptyAlumni = { firstName: '', lastName: '', email: '', phone: '', graduationYear: String(new Date().getFullYear()), program: '', currentCity: '', employmentStatus: 'unknown', employer: '', jobTitle: '', university: '', degree: '', notes: '' };
const emptyEvent = { title: '', description: '', location: '', startsAt: '', capacity: '', attendeeCount: '0', status: 'upcoming' };
const emptyDonation = { alumniId: '', donorName: '', amount: '', currency: 'USD', purpose: '', donatedAt: new Date().toISOString().slice(0, 10), status: 'received' };

export default function AlumniPage() {
    const [data, setData] = useState<Overview>({ alumni: [], events: [], donations: [], stats: { total: 0, employed: 0, higherEducation: 0, totalDonations: 0 } });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>('directory');
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('all');
    const [modal, setModal] = useState<'alumni' | 'event' | 'donation' | null>(null);
    const [editing, setEditing] = useState<Alumni | null>(null);
    const [saving, setSaving] = useState(false);
    const [alumniForm, setAlumniForm] = useState(emptyAlumni);
    const [eventForm, setEventForm] = useState(emptyEvent);
    const [donationForm, setDonationForm] = useState(emptyDonation);

    const load = useCallback(async () => {
        setLoading(true);
        try { const response = await api.get('/alumni'); setData(response.data.data); }
        catch (error: any) { toast.error(error.response?.data?.message || 'Could not load alumni records'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const years = useMemo(() => [...new Set(data.alumni.map(item => item.graduationYear))].sort((a, b) => b - a), [data.alumni]);
    const filtered = useMemo(() => data.alumni.filter(item => {
        const text = `${item.firstName} ${item.lastName} ${item.email || ''} ${item.employer || ''} ${item.university || ''}`.toLowerCase();
        return text.includes(search.toLowerCase()) && (year === 'all' || String(item.graduationYear) === year);
    }), [data.alumni, search, year]);

    const openAlumni = (item?: Alumni) => {
        setEditing(item || null);
        setAlumniForm(item ? Object.fromEntries(Object.keys(emptyAlumni).map(key => [key, String((item as any)[key] ?? '')])) as typeof emptyAlumni : emptyAlumni);
        setModal('alumni');
    };
    const close = () => { setModal(null); setEditing(null); };

    const submitAlumni = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true);
        try {
            const payload = { ...alumniForm, graduationYear: Number(alumniForm.graduationYear) };
            if (editing) await api.put(`/alumni/${editing.id}`, payload); else await api.post('/alumni', payload);
            toast.success(editing ? 'Alumni profile updated' : 'Graduate added to directory'); close(); await load();
        } catch (error: any) { toast.error(error.response?.data?.message || 'Could not save graduate'); }
        finally { setSaving(false); }
    };
    const submitEvent = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true);
        try { await api.post('/alumni/events', eventForm); toast.success('Alumni event created'); close(); setEventForm(emptyEvent); await load(); }
        catch (error: any) { toast.error(error.response?.data?.message || 'Could not create event'); } finally { setSaving(false); }
    };
    const submitDonation = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true);
        try { await api.post('/alumni/donations', donationForm); toast.success('Donation recorded'); close(); setDonationForm(emptyDonation); await load(); }
        catch (error: any) { toast.error(error.response?.data?.message || 'Could not record donation'); } finally { setSaving(false); }
    };
    const remove = async (kind: 'alumni' | 'events' | 'donations', id: string, label: string) => {
        if (!window.confirm(`Delete ${label}?`)) return;
        try { await api.delete(`/alumni/${kind === 'alumni' ? '' : `${kind}/`}${id}`); toast.success('Record deleted'); await load(); }
        catch (error: any) { toast.error(error.response?.data?.message || 'Could not delete record'); }
    };

    const cards = [
        ['Alumni tracked', data.stats.total, Users, 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10'],
        ['Employed', data.stats.employed, BriefcaseBusiness, 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'],
        ['Higher education', data.stats.higherEducation, GraduationCap, 'text-violet-600 bg-violet-50 dark:bg-violet-500/10'],
        ['Donations received', `$${data.stats.totalDonations.toLocaleString()}`, CircleDollarSign, 'text-amber-600 bg-amber-50 dark:bg-amber-500/10']
    ] as const;

    return <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">Community</p><h1 className="text-3xl font-black text-slate-950 dark:text-white">Alumni Management</h1><p className="text-sm text-slate-500 mt-1">Keep graduates connected and measure where their journeys lead.</p></div>
            <button onClick={() => tab === 'events' ? setModal('event') : tab === 'donations' ? setModal('donation') : openAlumni()} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"><Plus size={18}/>{tab === 'events' ? 'Create event' : tab === 'donations' ? 'Record donation' : 'Add graduate'}</button>
        </header>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{cards.map(([label, value, Icon, color]) => <div key={label} className="surface-card p-5 flex items-center gap-4"><span className={`p-3 rounded-2xl ${color}`}><Icon size={22}/></span><div><p className="text-xs uppercase tracking-wider font-bold text-slate-500">{label}</p><p className="text-2xl font-black text-slate-950 dark:text-white">{value}</p></div></div>)}</section>

        <div className="surface-card p-1.5 flex gap-1 overflow-x-auto">{(['directory','events','donations','outcomes'] as Tab[]).map(item => <button key={item} onClick={() => setTab(item)} className={`px-4 py-2.5 rounded-lg text-sm font-bold capitalize whitespace-nowrap ${tab === item ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>{item}</button>)}</div>

        {loading ? <div className="surface-card py-24 text-center text-slate-500">Loading alumni records…</div> : tab === 'directory' ? <>
            <div className="flex flex-col sm:flex-row gap-3"><label className="relative flex-1"><Search className="absolute left-4 top-3.5 text-slate-400" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, employer, or university" className="input pl-11"/></label><select value={year} onChange={e => setYear(e.target.value)} className="input sm:w-48"><option value="all">All graduation years</option>{years.map(item => <option key={item}>{item}</option>)}</select></div>
            <div className="surface-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700"><th className="p-4">Graduate</th><th className="p-4">Class</th><th className="p-4">Current outcome</th><th className="p-4">Location</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.length ? filtered.map(item => <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[.03]"><td className="p-4"><p className="font-bold text-slate-900 dark:text-white">{item.firstName} {item.lastName}</p><p className="text-xs text-slate-500">{item.email || item.phone || 'No contact details'}</p></td><td className="p-4"><p className="font-semibold">{item.graduationYear}</p><p className="text-xs text-slate-500">{item.program || '—'}</p></td><td className="p-4"><span className="text-xs font-bold capitalize px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{item.employmentStatus.replaceAll('_',' ')}</span><p className="text-xs text-slate-500 mt-1">{item.jobTitle && item.employer ? `${item.jobTitle} · ${item.employer}` : item.university || 'Outcome not updated'}</p></td><td className="p-4 text-sm text-slate-500">{item.currentCity || '—'}</td><td className="p-4 text-right"><button onClick={() => openAlumni(item)} className="text-indigo-600 font-bold text-sm mr-4">Edit</button><button aria-label="Delete graduate" onClick={() => remove('alumni', item.id, `${item.firstName} ${item.lastName}`)} className="text-rose-500"><Trash2 size={17}/></button></td></tr>) : <tr><td colSpan={5} className="py-20 text-center text-slate-500">No graduates match this search.</td></tr>}</tbody></table></div></div>
        </> : tab === 'events' ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{data.events.length ? data.events.map(item => <article key={item.id} className="surface-card p-5"><div className="flex justify-between"><span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"><CalendarDays size={20}/></span><button onClick={() => remove('events', item.id, item.title)} className="text-slate-400 hover:text-rose-500"><Trash2 size={17}/></button></div><h3 className="font-black text-lg mt-4">{item.title}</h3><p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description || 'No description provided.'}</p><p className="text-sm font-semibold mt-4">{new Date(item.startsAt).toLocaleString()}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-2"><MapPin size={13}/>{item.location || 'Location TBA'} · {item.attendeeCount}{item.capacity ? ` / ${item.capacity}` : ''} attending</p></article>) : <Empty label="No alumni events scheduled."/>}</div>
        : tab === 'donations' ? <div className="surface-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/60"><th className="p-4">Donor</th><th className="p-4">Purpose</th><th className="p-4">Date</th><th className="p-4">Amount</th><th className="p-4"></th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{data.donations.map(item => <tr key={item.id}><td className="p-4 font-bold">{item.donorName}</td><td className="p-4 text-sm text-slate-500">{item.purpose || 'General fund'}</td><td className="p-4 text-sm">{new Date(item.donatedAt).toLocaleDateString()}</td><td className="p-4 font-black text-emerald-600">{item.currency} {item.amount.toLocaleString()}</td><td className="p-4 text-right"><button onClick={() => remove('donations', item.id, 'this donation')} className="text-slate-400 hover:text-rose-500"><Trash2 size={17}/></button></td></tr>)}{!data.donations.length && <tr><td colSpan={5} className="py-20 text-center text-slate-500">No donations recorded.</td></tr>}</tbody></table></div></div>
        : <Outcomes alumni={data.alumni}/>}

        {modal && <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm overflow-y-auto p-4 flex items-center justify-center"><div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"><div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between z-10"><h2 className="text-xl font-black">{modal === 'alumni' ? (editing ? 'Edit alumni profile' : 'Add a graduate') : modal === 'event' ? 'Create alumni event' : 'Record a donation'}</h2><button onClick={close} aria-label="Close"><X/></button></div>
            {modal === 'alumni' ? <AlumniForm form={alumniForm} setForm={setAlumniForm} submit={submitAlumni} saving={saving}/>: modal === 'event' ? <EventForm form={eventForm} setForm={setEventForm} submit={submitEvent} saving={saving}/> : <DonationForm form={donationForm} setForm={setDonationForm} alumni={data.alumni} submit={submitDonation} saving={saving}/>}</div></div>}
    </div>;
}

const input = 'input';
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`text-sm font-bold text-slate-700 dark:text-slate-200 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}</label>; }
function AlumniForm({ form, setForm, submit, saving }: any) { const set = (key: string, value: string) => setForm({ ...form, [key]: value }); return <form onSubmit={submit} className="p-6 grid sm:grid-cols-2 gap-4"><Field label="First name"><input required value={form.firstName} onChange={e=>set('firstName',e.target.value)} className={input}/></Field><Field label="Last name"><input required value={form.lastName} onChange={e=>set('lastName',e.target.value)} className={input}/></Field><Field label="Email"><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className={input}/></Field><Field label="Phone"><input value={form.phone} onChange={e=>set('phone',e.target.value)} className={input}/></Field><Field label="Graduation year"><input required type="number" min="1900" max="2200" value={form.graduationYear} onChange={e=>set('graduationYear',e.target.value)} className={input}/></Field><Field label="Program / class"><input value={form.program} onChange={e=>set('program',e.target.value)} className={input}/></Field><Field label="Employment status"><select value={form.employmentStatus} onChange={e=>set('employmentStatus',e.target.value)} className={input}><option value="unknown">Unknown</option><option value="employed">Employed</option><option value="self_employed">Self-employed</option><option value="seeking">Seeking work</option><option value="studying">Studying</option></select></Field><Field label="Current city"><input value={form.currentCity} onChange={e=>set('currentCity',e.target.value)} className={input}/></Field><Field label="Employer"><input value={form.employer} onChange={e=>set('employer',e.target.value)} className={input}/></Field><Field label="Job title"><input value={form.jobTitle} onChange={e=>set('jobTitle',e.target.value)} className={input}/></Field><Field label="University"><input value={form.university} onChange={e=>set('university',e.target.value)} className={input}/></Field><Field label="Degree / course"><input value={form.degree} onChange={e=>set('degree',e.target.value)} className={input}/></Field><Field label="Notes" wide><textarea rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} className={input}/></Field><button disabled={saving} className="sm:col-span-2 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">{saving ? 'Saving…' : 'Save alumni profile'}</button></form> }
function EventForm({ form, setForm, submit, saving }: any) { const set=(k:string,v:string)=>setForm({...form,[k]:v}); return <form onSubmit={submit} className="p-6 grid sm:grid-cols-2 gap-4"><Field label="Event title" wide><input required value={form.title} onChange={e=>set('title',e.target.value)} className={input}/></Field><Field label="Date and time"><input required type="datetime-local" value={form.startsAt} onChange={e=>set('startsAt',e.target.value)} className={input}/></Field><Field label="Location"><input value={form.location} onChange={e=>set('location',e.target.value)} className={input}/></Field><Field label="Capacity"><input type="number" min="1" value={form.capacity} onChange={e=>set('capacity',e.target.value)} className={input}/></Field><Field label="Registered attendees"><input type="number" min="0" value={form.attendeeCount} onChange={e=>set('attendeeCount',e.target.value)} className={input}/></Field><Field label="Description" wide><textarea rows={4} value={form.description} onChange={e=>set('description',e.target.value)} className={input}/></Field><button disabled={saving} className="sm:col-span-2 py-3 rounded-xl bg-indigo-600 text-white font-bold">{saving?'Saving…':'Create event'}</button></form> }
function DonationForm({ form, setForm, alumni, submit, saving }: any) { const set=(k:string,v:string)=>setForm({...form,[k]:v}); return <form onSubmit={submit} className="p-6 grid sm:grid-cols-2 gap-4"><Field label="Donor name"><input required value={form.donorName} onChange={e=>set('donorName',e.target.value)} className={input}/></Field><Field label="Linked graduate"><select value={form.alumniId} onChange={e=>set('alumniId',e.target.value)} className={input}><option value="">Not linked</option>{alumni.map((a:Alumni)=><option key={a.id} value={a.id}>{a.firstName} {a.lastName} · {a.graduationYear}</option>)}</select></Field><Field label="Amount"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} className={input}/></Field><Field label="Currency"><input required value={form.currency} onChange={e=>set('currency',e.target.value.toUpperCase())} maxLength={3} className={input}/></Field><Field label="Donation date"><input required type="date" value={form.donatedAt} onChange={e=>set('donatedAt',e.target.value)} className={input}/></Field><Field label="Purpose"><input value={form.purpose} onChange={e=>set('purpose',e.target.value)} className={input}/></Field><button disabled={saving} className="sm:col-span-2 py-3 rounded-xl bg-indigo-600 text-white font-bold">{saving?'Saving…':'Record donation'}</button></form> }
function Empty({label}:{label:string}) { return <div className="surface-card md:col-span-2 xl:col-span-3 py-20 text-center text-slate-500">{label}</div> }
function Outcomes({alumni}:{alumni:Alumni[]}) { const statuses=['employed','self_employed','studying','seeking','unknown']; return <div className="grid lg:grid-cols-2 gap-5"><div className="surface-card p-6"><h3 className="font-black text-lg">Employment outcomes</h3><div className="space-y-4 mt-6">{statuses.map(status=>{const count=alumni.filter(a=>a.employmentStatus===status).length;const pct=alumni.length?Math.round(count/alumni.length*100):0;return <div key={status}><div className="flex justify-between text-sm mb-1"><span className="capitalize font-semibold">{status.replaceAll('_',' ')}</span><span className="text-slate-500">{count} · {pct}%</span></div><div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{width:`${pct}%`}}/></div></div>})}</div></div><div className="surface-card p-6"><h3 className="font-black text-lg">University destinations</h3><div className="mt-5 space-y-3">{Object.entries(alumni.filter(a=>a.university).reduce((m,a)=>({...m,[a.university! as string]:(m[a.university! as string]||0)+1}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=><div key={name} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3"><span className="font-semibold">{name}</span><span className="text-sm text-slate-500">{count} graduate{count===1?'':'s'}</span></div>)}{!alumni.some(a=>a.university)&&<p className="text-slate-500 py-12 text-center">No university outcomes recorded yet.</p>}</div></div></div> }
