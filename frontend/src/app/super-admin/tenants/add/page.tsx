"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';
import LogoUpload from '../../../../components/LogoUpload';
import { ArrowLeft, School, UserCog, CheckCircle2, XCircle } from 'lucide-react';

const inputCls = 'w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition';
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

export default function AddTenantPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const [formData, setFormData] = useState({
        name: '', tenantId: '', domain: '',
        adminEmail: '', adminFirstName: '', adminLastName: '', adminPassword: '',
        plan: 'basic', logoUrl: '',
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
                name:       formData.name,
                tenantId:   formData.tenantId,
                domain:     formData.domain,
                adminEmail: formData.adminEmail,
                adminDetails: {
                    firstName: formData.adminFirstName,
                    lastName:  formData.adminLastName,
                    password:  formData.adminPassword,
                },
                subscription: { plan: formData.plan },
                config:       { logoUrl: formData.logoUrl },
            });
            router.push('/super-admin/tenants');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create school');
        } finally { setLoading(false); }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <Link href="/super-admin/tenants" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm mb-4 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Schools
                </Link>
                <h1 className="text-2xl font-bold text-white">Register New School</h1>
                <p className="text-slate-400 text-sm mt-1">Onboard a new institution and set up their administrator.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                        <XCircle className="w-4 h-4 shrink-0" /> {error}
                    </div>
                )}

                {/* School Details */}
                <section className="bg-slate-800/60 border border-white/5 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 text-white font-bold text-sm pb-3 border-b border-white/5">
                        <School className="w-4 h-4 text-indigo-400" /> School Details
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Official Name <span className="text-red-400">*</span></label>
                            <input name="name" required value={formData.name} onChange={handleChange}
                                placeholder="e.g. Oakridge International School" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Tenant ID (Unique Key) <span className="text-red-400">*</span></label>
                            <input name="tenantId" required value={formData.tenantId} onChange={handleChange}
                                placeholder="e.g. oakridge" className={inputCls} />
                        </div>
                    </div>

                    <LogoUpload
                        logo={formData.logoUrl}
                        onLogoChange={logo => setFormData({ ...formData, logoUrl: logo })}
                        label="School Logo"
                        containerSize="large"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Custom Domain (Optional)</label>
                            <input name="domain" value={formData.domain} onChange={handleChange}
                                placeholder="e.g. oakridge.org" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Subscription Plan</label>
                            <select name="plan" value={formData.plan} onChange={handleChange} className={inputCls}>
                                <option value="basic">Basic (Entry Level)</option>
                                <option value="premium">Premium (All Features)</option>
                                <option value="enterprise">Enterprise (Unlimited)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Admin Details */}
                <section className="bg-slate-800/60 border border-white/5 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2 text-white font-bold text-sm pb-3 border-b border-white/5">
                        <UserCog className="w-4 h-4 text-indigo-400" /> Principal / School Admin
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Admin First Name <span className="text-red-400">*</span></label>
                            <input name="adminFirstName" required value={formData.adminFirstName} onChange={handleChange}
                                placeholder="John" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Admin Last Name <span className="text-red-400">*</span></label>
                            <input name="adminLastName" required value={formData.adminLastName} onChange={handleChange}
                                placeholder="Doe" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Admin Email <span className="text-red-400">*</span></label>
                            <input type="email" name="adminEmail" required value={formData.adminEmail} onChange={handleChange}
                                placeholder="admin@oakridge.edu" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Initial Password <span className="text-red-400">*</span></label>
                            <input type="password" name="adminPassword" required value={formData.adminPassword} onChange={handleChange}
                                placeholder="Set a secure password" className={inputCls} />
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="flex gap-3">
                    <button type="submit" disabled={loading}
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 text-sm">
                        {loading ? 'Processing…' : 'Create School Account'}
                    </button>
                    <Link href="/super-admin/tenants"
                        className="flex-1 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition text-sm text-center border border-white/5">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
