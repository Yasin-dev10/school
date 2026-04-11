"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';

export default function AddTenantPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        tenantId: '',
        domain: '',
        adminEmail: '',
        adminFirstName: '',
        adminLastName: '',
        adminPassword: '',
        plan: 'basic'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/tenants', {
                name: formData.name,
                tenantId: formData.tenantId,
                domain: formData.domain,
                adminEmail: formData.adminEmail,
                adminDetails: {
                    firstName: formData.adminFirstName,
                    lastName: formData.adminLastName,
                    password: formData.adminPassword
                },
                subscription: { plan: formData.plan }
            });

            alert('School created successfully!');
            router.push('/super-admin/tenants');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create school');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <Link href="/super-admin/tenants" className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm">
                    <span>←</span> Back to Schools
                </Link>
                <h1 className="text-3xl font-bold text-white">Register New School</h1>
                <p className="text-slate-400 mt-1">Onboard a new institution and set up their administrator.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                        {error}
                    </div>
                )}

                {/* School Information */}
                <section className="glass-dark p-8 rounded-3xl border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">School Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Official Name</label>
                            <input
                                name="name" required value={formData.name} onChange={handleChange}
                                placeholder="e.g. Oakridge International School"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Tenant ID (Unique Key)</label>
                            <input
                                name="tenantId" required value={formData.tenantId} onChange={handleChange}
                                placeholder="e.g. oakridge"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Custom Domain (Optional)</label>
                            <input
                                name="domain" value={formData.domain} onChange={handleChange}
                                placeholder="e.g. oakridge.org"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Subscription Plan</label>
                            <select
                                name="plan" value={formData.plan} onChange={handleChange}
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="basic">Basic (Entry Level)</option>
                                <option value="premium">Premium (All Features)</option>
                                <option value="enterprise">Enterprise (Unlimited)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Administrator Information */}
                <section className="glass-dark p-8 rounded-3xl border border-white/5 space-y-6">
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Principal / School Admin</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Admin First Name</label>
                            <input
                                name="adminFirstName" required value={formData.adminFirstName} onChange={handleChange}
                                placeholder="John"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Admin Last Name</label>
                            <input
                                name="adminLastName" required value={formData.adminLastName} onChange={handleChange}
                                placeholder="Doe"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Admin Email</label>
                            <input
                                type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleChange}
                                placeholder="admin@oakridge.edu"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400 ml-1">Initial Password</label>
                            <input
                                type="password" name="adminPassword" required value={formData.adminPassword} onChange={handleChange}
                                placeholder="Set a secure password"
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </section>

                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Create School Account'}
                    </button>
                    <Link href="/super-admin/tenants" className="flex-1 py-4 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-300 rounded-2xl font-bold text-lg text-center transition">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
