"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../utils/api';
import Link from 'next/link';
import LogoUpload from '../../../../../components/LogoUpload';
import { ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const inputCls = 'w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition';
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

export default function EditTenantPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState('');

    const [formData, setFormData] = useState({
        name: '', domain: '', status: 'active', plan: 'basic', logoUrl: '',
    });

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/tenants/${id}`);
                const tenant   = data.data;
                setFormData({
                    name:    tenant.name,
                    domain:  tenant.domain || '',
                    status:  tenant.status,
                    plan:    tenant.subscription?.plan || 'basic',
                    logoUrl: tenant.config?.logoUrl || '',
                });
            } catch {
                setError('Failed to load school details');
            } finally { setLoading(false); }
        })();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await api.put(`/tenants/${id}`, {
                name:         formData.name,
                domain:       formData.domain,
                status:       formData.status,
                subscription: { plan: formData.plan },
                config:       { logoUrl: formData.logoUrl },
            });
            router.push('/super-admin/tenants');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update school');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-64">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
    );

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link href="/super-admin/tenants" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-4 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Schools
                </Link>
                <h1 className="text-2xl font-bold text-white">Edit School Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Update the school details and configuration.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                        <XCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-6 space-y-5">
                    <div>
                        <label className={labelCls}>School Name</label>
                        <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className={inputCls} required />
                    </div>

                    <LogoUpload
                        logo={formData.logoUrl}
                        onLogoChange={logo => setFormData({ ...formData, logoUrl: logo })}
                        label="School Logo"
                        containerSize="large"
                    />

                    <div>
                        <label className={labelCls}>Custom Domain</label>
                        <input value={formData.domain} onChange={e => setFormData({ ...formData, domain: e.target.value })}
                            placeholder="e.g. school.org" className={inputCls} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Platform Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className={inputCls}>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Subscription Plan</label>
                            <select value={formData.plan} onChange={e => setFormData({ ...formData, plan: e.target.value })}
                                className={inputCls}>
                                <option value="basic">Basic</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button type="submit" disabled={saving}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 text-sm flex items-center justify-center gap-2">
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => router.push('/super-admin/tenants')}
                        className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition text-sm border border-white/5">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
