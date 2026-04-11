"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

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
                const t = data.data;
                setTenant(t);
                setForm({
                    name: t.name || '',
                    academicYear: t.config?.academicYear || '',
                    primaryColor: t.config?.primaryColor || '#4f46e5',
                    secondaryColor: t.config?.secondaryColor || '#1e293b',
                    logoUrl: t.config?.logoUrl || '',
                    address: t.config?.address || '',
                    contactEmail: t.config?.contactEmail || '',
                    contactPhone: t.config?.contactPhone || '',
                    vision: t.config?.vision || '',
                    mission: t.config?.mission || ''
                });
            } catch (err) {
                console.error("Failed to fetch settings");
            } finally {
                setLoading(false);
            }
        };
        fetchTenant();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
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
            await api.put('/tenants/me', payload);
            alert("Institutional settings updated successfully!");
        } catch (err) {
            alert("Failed to update settings");
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

            <form onSubmit={handleSubmit} className="space-y-8">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Current Academic Year</label>
                                        <input
                                            value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-xl text-white outline-none"
                                            placeholder="2024-2025"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Logo URL (Icon)</label>
                                        <input
                                            value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                                            className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-xl text-white outline-none"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
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
