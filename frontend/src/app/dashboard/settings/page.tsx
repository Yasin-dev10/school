"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import LogoUpload from '../../../components/LogoUpload';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [startingYear, setStartingYear] = useState(false);
    const [yearError, setYearError] = useState('');
    const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '' });
    const [selectedYearId, setSelectedYearId] = useState('');
    const [yearRecords, setYearRecords] = useState<any>(null);
    const [loadingRecords, setLoadingRecords] = useState(false);

    const [form, setForm] = useState({
        name: '',
        academicYear: '',
        primaryColor: '#4f46e5',
        secondaryColor: '#1e293b',
        logoUrl: '',
        address: '',
        contactEmail: '',
        contactPhone: '',
        vision: '',
        mission: ''
    });

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const { data } = await api.get('/tenants/me');
                // The API returns flat fields (not nested under config)
                const t = data.data;
                setTenant(t);
                setForm({
                    name: t.name || '',
                    academicYear: t.academicYear || '',
                    primaryColor: t.primaryColor || '#4f46e5',
                    secondaryColor: t.secondaryColor || '#1e293b',
                    logoUrl: t.logoUrl || '',
                    address: t.address || '',
                    contactEmail: t.contactEmail || '',
                    contactPhone: t.contactPhone || '',
                    vision: t.vision || '',
                    mission: t.mission || ''
                });
                const match = String(t.academicYear || '').match(/^(\d{4})-(\d{4})$/);
                const nextStart = match ? Number(match[2]) : new Date().getFullYear();
                setYearForm({
                    name: `${nextStart}-${nextStart + 1}`,
                    startDate: `${nextStart}-09-01`,
                    endDate: `${nextStart + 1}-08-31`
                });

                try {
                    const yearsResponse = await api.get('/tenants/me/academic-years');
                    setAcademicYears(yearsResponse.data.data || []);
                } catch (yearRequestError: any) {
                    const apiMessage = yearRequestError.response?.data?.message;
                    setYearError(apiMessage || 'Academic-year history is not ready yet. Restart the backend and apply the latest database migration.');
                }
            } catch (tenantRequestError: any) {
                setError(tenantRequestError.response?.data?.message || 'Failed to load school settings. Please refresh and try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchTenant();
    }, []);

    const handleStartAcademicYear = async () => {
        setYearError('');
        setSuccess('');
        if (!window.confirm(`Start ${yearForm.name}? The current academic year will be archived, but none of its data will be deleted.`)) return;

        setStartingYear(true);
        try {
            const { data } = await api.post('/tenants/me/academic-years', yearForm);
            const yearsResponse = await api.get('/tenants/me/academic-years');
            setAcademicYears(yearsResponse.data.data || []);
            setTenant((current: any) => ({ ...current, academicYear: data.data.name }));
            setForm(current => ({ ...current, academicYear: data.data.name }));
            window.dispatchEvent(new CustomEvent('tenant-updated', { detail: { academicYear: data.data.name } }));
            setSuccess(`✅ ${data.data.name} is now active. Previous school-year data is safely archived.`);

            const endYear = Number(data.data.name.split('-')[1]);
            setYearForm({
                name: `${endYear}-${endYear + 1}`,
                startDate: `${endYear}-09-01`,
                endDate: `${endYear + 1}-08-31`
            });
        } catch (err: any) {
            setYearError(err.response?.data?.message || 'Failed to start the new academic year');
        } finally {
            setStartingYear(false);
        }
    };

    const viewAcademicYearRecords = async (yearId: string) => {
        if (selectedYearId === yearId) {
            setSelectedYearId('');
            setYearRecords(null);
            return;
        }
        setSelectedYearId(yearId);
        setLoadingRecords(true);
        setYearError('');
        try {
            const { data } = await api.get(`/tenants/me/academic-years/${yearId}`);
            setYearRecords(data.data);
        } catch (err: any) {
            setYearError(err.response?.data?.message || 'Failed to load records for this academic year');
            setYearRecords(null);
        } finally {
            setLoadingRecords(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            console.log('Submitting form with logoUrl:', form.logoUrl ? 'Present' : 'Empty');
            
            const payload = {
                name: form.name,
                config: {
                    academicYear: form.academicYear,
                    primaryColor: form.primaryColor,
                    secondaryColor: form.secondaryColor,
                    logoUrl: form.logoUrl,
                    address: form.address,
                    contactEmail: form.contactEmail,
                    contactPhone: form.contactPhone,
                    vision: form.vision,
                    mission: form.mission
                }
            };

            const response = await api.put('/tenants/me', payload);
            console.log('Update successful:', response.data);

            // Update tenant name in layout/topbar by dispatching a custom event
            window.dispatchEvent(new CustomEvent('tenant-updated', { detail: { name: form.name, logoUrl: form.logoUrl } }));

            setSuccess("✅ Institutional settings updated successfully!");
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to update settings";
            console.error('Update error:', errorMsg);
            setError(`❌ ${errorMsg}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
            <div className="text-slate-500 animate-pulse font-black uppercase tracking-widest text-xs sm:text-base">Initialising Settings Matrix...</div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">System Branding</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your institution's digital identity and visual presence.</p>
                </div>
                <div className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full shrink-0">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">ID: {tenant?.tenantId}</span>
                </div>
            </div>

            <section className="glass-dark rounded-[2rem] border border-white/5 p-5 sm:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-white">Academic Years</h2>
                        <p className="mt-1 text-sm text-slate-400">Start a new year without deleting exams, attendance, invoices, or payments from previous years.</p>
                    </div>
                    <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                        Current: {tenant?.academicYear || 'Not set'}
                    </span>
                </div>

                {yearError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{yearError}</div>}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        New year
                        <input value={yearForm.name} onChange={e => setYearForm({ ...yearForm, name: e.target.value })} placeholder="2026-2027" className="block w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Start date
                        <input type="date" value={yearForm.startDate} onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })} className="block w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none" />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        End date
                        <input type="date" value={yearForm.endDate} onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })} className="block w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm normal-case text-white outline-none" />
                    </label>
                    <button type="button" onClick={handleStartAcademicYear} disabled={startingYear || !yearForm.name || !yearForm.startDate || !yearForm.endDate} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-50">
                        {startingYear ? 'Starting…' : 'Start New Year'}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {academicYears.map(year => (
                        <article key={year.id} className={`rounded-2xl border p-4 ${year.isCurrent ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-slate-900/40'}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-black text-white">{year.name}</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">{new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${year.isCurrent ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                                    {year.isCurrent ? 'Current' : 'Archived'}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                                <div className="rounded-lg bg-white/5 p-2"><span className="block text-slate-500">Exams</span><b className="text-white">{year.stats?.exams || 0}</b></div>
                                <div className="rounded-lg bg-white/5 p-2"><span className="block text-slate-500">Attendance</span><b className="text-white">{year.stats?.attendanceRecords || 0}</b></div>
                                <div className="rounded-lg bg-white/5 p-2"><span className="block text-slate-500">Invoices</span><b className="text-white">{year.stats?.invoices || 0}</b></div>
                                <div className="rounded-lg bg-white/5 p-2"><span className="block text-slate-500">Payments</span><b className="text-white">{year.stats?.payments || 0}</b></div>
                            </div>
                            <button type="button" onClick={() => viewAcademicYearRecords(year.id)} className="mt-3 w-full rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20">
                                {selectedYearId === year.id ? 'Hide records' : 'View records'}
                            </button>
                        </article>
                    ))}
                </div>

                {selectedYearId && (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5">
                        {loadingRecords ? (
                            <p className="py-8 text-center text-sm font-bold text-slate-400 animate-pulse">Loading preserved records…</p>
                        ) : yearRecords && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="font-black text-white">Records for {yearRecords.year.name}</h3>
                                    <p className="text-xs text-slate-500">Up to 100 latest records are shown in each category.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <RecordList title="Exams" empty="No exams in this year" items={yearRecords.exams.map((exam: any) => ({ id: exam.id, primary: exam.name, secondary: `${exam.term} • ${new Date(exam.startDate).toLocaleDateString()} • ${exam.status}` }))} />
                                    <RecordList title="Attendance" empty="No attendance in this year" items={yearRecords.attendance.map((record: any) => ({ id: record.id, primary: `${record.student.firstName} ${record.student.lastName}`, secondary: `${record.class.name} ${record.class.section} • ${new Date(record.date).toLocaleDateString()} • ${record.status}` }))} />
                                    <RecordList title="Invoices" empty="No invoices in this year" items={yearRecords.invoices.map((invoice: any) => ({ id: invoice.id, primary: `${invoice.invoiceNumber} — ${invoice.student.firstName} ${invoice.student.lastName}`, secondary: `${invoice.status} • ${invoice.paidAmount}/${invoice.totalAmount}` }))} />
                                    <RecordList title="Payments" empty="No payments in this year" items={yearRecords.payments.map((payment: any) => ({ id: payment.id, primary: `${payment.invoice.invoiceNumber} — ${payment.amount}`, secondary: `${payment.paymentMethod} • ${new Date(payment.paymentDate).toLocaleDateString()}` }))} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Status Messages */}
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
                        {success}
                    </div>
                )}

                {/* General & Visual Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">🏛️</span>
                                School Identity
                            </h2>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Official School Name</label>
                                    <input
                                        required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-lg font-bold"
                                        placeholder="e.g. Hogwarts School of Magic"
                                    />
                                </div>
                                <LogoUpload
                                    logo={form.logoUrl}
                                    onLogoChange={(logo) => setForm({ ...form, logoUrl: logo })}
                                    label="School Logo"
                                    containerSize="small"
                                />
                            </div>
                        </div>

                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">📍</span>
                                Contact Details
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Physical Address</label>
                                    <input
                                        value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-xl text-white outline-none"
                                        placeholder="123 Education Dr, Tech City"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Public Email</label>
                                        <input
                                            value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-xl text-white outline-none"
                                            placeholder="info@school.edu"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contact Phone</label>
                                        <input
                                            value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-xl text-white outline-none"
                                            placeholder="+1 234 567 890"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-2xl">
                            <h2 className="text-lg font-bold text-white mb-2">Primary Color</h2>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="color" value={form.primaryColor} onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                                    className="w-16 h-16 rounded-2xl bg-slate-900 border-none cursor-pointer"
                                />
                                <div className="flex-1">
                                    <p className="text-xs text-white font-mono">{form.primaryColor}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Dashboard Accent</p>
                                </div>
                            </div>

                            <hr className="border-white/5" />

                            <h2 className="text-lg font-bold text-white mb-2">Sidebar Color</h2>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="color" value={form.secondaryColor} onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                                    className="w-16 h-16 rounded-2xl bg-slate-900 border-none cursor-pointer"
                                />
                                <div className="flex-1">
                                    <p className="text-xs text-white font-mono">{form.secondaryColor}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Base UI Tone</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-dark p-6 rounded-[2rem] border border-white/5 bg-indigo-500/5">
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                                "These settings reflect institutional identity and determine how your community perceives the platform. Visual changes may require a page refresh for all users."
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mission & Vision Section */}
                <div className="glass-dark p-8 rounded-[2.5rem] border border-white/5 h-full shadow-2xl">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-8">
                        <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">✨</span>
                        Mission & Vision
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Vision</label>
                            <textarea
                                value={form.vision} onChange={e => setForm({ ...form, vision: e.target.value })}
                                className="w-full h-32 px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                placeholder="Describe the future goal..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Mission</label>
                            <textarea
                                value={form.mission} onChange={e => setForm({ ...form, mission: e.target.value })}
                                className="w-full h-32 px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                placeholder="Describe the daily purpose..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'Syncing...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}

function RecordList({ title, items, empty }: { title: string; items: Array<{ id: string; primary: string; secondary: string }>; empty: string }) {
    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <h4 className="border-b border-white/10 px-4 py-3 text-sm font-black text-white">{title} <span className="text-slate-500">({items.length})</span></h4>
            <div className="max-h-64 overflow-y-auto">
                {items.length === 0 ? <p className="p-4 text-xs text-slate-500">{empty}</p> : items.map(item => (
                    <div key={item.id} className="border-b border-white/5 px-4 py-2.5 last:border-0">
                        <p className="text-xs font-bold text-slate-200">{item.primary}</p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{item.secondary}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
