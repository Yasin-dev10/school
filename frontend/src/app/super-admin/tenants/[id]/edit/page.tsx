"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../utils/api';
import Link from 'next/link';

export default function EditTenantPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        status: 'active',
        plan: 'basic'
    });

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const { data } = await api.get(`/tenants/${id}`);
                const tenant = data.data;
                setFormData({
                    name: tenant.name,
                    domain: tenant.domain || '',
                    status: tenant.status,
                    plan: tenant.subscription?.plan || 'basic'
                });
            } catch (err) {
                setError('Failed to load school details');
            } finally {
                setLoading(false);
            }
        };
        fetchTenant();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await api.put(`/tenants/${id}`, {
                name: formData.name,
                domain: formData.domain,
                status: formData.status,
                subscription: { plan: formData.plan }
            });
            alert('School updated successfully');
            router.push('/super-admin/tenants');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update school');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-400 italic">Finding school...</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-8">
                <Link href="/super-admin/tenants" className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm">
                    <span>←</span> Back to Schools
                </Link>
                <h1 className="text-3xl font-bold text-white">Edit School Settings</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}

                <div className="glass-dark p-8 rounded-3xl border border-white/5 space-y-6 shadow-2xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">School Name</label>
                        <input
                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-400">Custom Domain</label>
                        <input
                            value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Platform Status</label>
                            <select
                                value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-400">Subscription Plan</label>
                            <select
                                value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        type="submit" disabled={saving}
                        className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-xl shadow-indigo-500/20"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button" onClick={() => router.push('/super-admin/tenants')}
                        className="flex-1 py-4 bg-slate-900 text-slate-300 rounded-2xl font-bold border border-white/5"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
