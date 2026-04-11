"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';

export default function TenantDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const { data } = await api.get(`/tenants/${id}`);
                setTenant(data.data);
            } catch (error) {
                console.error("Failed to fetch school details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTenant();
    }, [id]);

    if (loading) return <div className="p-20 text-center text-slate-500">Loading school profile...</div>;
    if (!tenant) return <div className="p-20 text-center text-red-500">School not found.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <Link href="/super-admin/tenants" className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm">
                        <span>←</span> Back to Schools
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center text-3xl shadow-2xl">
                            🏫
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white">{tenant.name}</h1>
                            <p className="text-slate-500 font-mono tracking-tighter">ID: {tenant.tenantId} • Status: <span className="text-green-400 capitalize">{tenant.status}</span></p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link href={`/super-admin/tenants/${id}/edit`} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition">
                        Edit Profile
                    </Link>
                    <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold border border-white/5 transition">
                        Suspend Access
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Col: Core Stats */}
                <div className="md:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                            { label: 'Total Students', value: '0', icon: '👤' },
                            { label: 'Total Teachers', value: '0', icon: '👨‍🏫' },
                            { label: 'Courses', value: '0', icon: '📚' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition">
                                <span className="text-2xl mb-4 block">{stat.icon}</span>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black text-white mt-1 group-hover:text-indigo-400 transition">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="glass-dark p-8 rounded-3xl border border-white/5">
                        <h3 className="text-xl font-bold text-white mb-6">Recent Academic Activity</h3>
                        <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
                            <p className="text-slate-600 italic">No recent activity detected for this institution.</p>
                        </div>
                    </div>
                </div>

                {/* Right Col: Details Card */}
                <div className="space-y-6">
                    <div className="glass-dark p-6 rounded-3xl border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold text-white border-b border-white/5 pb-3">Account Information</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Subscription Plan</p>
                                <p className="text-sm font-medium text-indigo-400 capitalize">{tenant.subscription?.plan || 'Basic'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Domain Alias</p>
                                <p className="text-sm font-medium text-slate-300">{tenant.domain || 'No custom domain'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Onboarded Date</p>
                                <p className="text-sm font-medium text-slate-300">{new Date(tenant.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                        <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest">Danger Zone</h3>
                        <p className="text-xs text-slate-500">Deleting this school will result in permanent data loss for all its users.</p>
                        <button
                            onClick={() => {
                                if (confirm("Delete school permanently?")) {
                                    api.delete(`/tenants/${id}`).then(() => router.push('/super-admin/tenants'));
                                }
                            }}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-sm font-bold transition border border-red-500/20"
                        >
                            Delete School Permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
