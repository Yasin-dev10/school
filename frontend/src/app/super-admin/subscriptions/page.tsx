"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function SubscriptionsPage() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const { data } = await api.get('/tenants');
                setTenants(data.data);
            } catch (error) {
                console.error("Failed to fetch subscriptions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTenants();
    }, []);

    const getPlanColor = (plan: string) => {
        switch (plan?.toLowerCase()) {
            case 'enterprise': return 'text-purple-400 bg-purple-400/10 border-purple-500/20';
            case 'premium': return 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-500/20';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white">Institutional Subscriptions</h1>
                    <p className="text-slate-400 mt-1">Monitor revenue, plan distribution, and renewal dates.</p>
                </div>
                <div className="bg-indigo-600/10 border border-indigo-500/20 px-6 py-3 rounded-2xl">
                    <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest mb-1">Total MRR (Simulated)</p>
                    <p className="text-2xl font-black text-white">$12,450.00</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Basic', count: tenants.filter((t: any) => t.subscription?.plan === 'basic').length, color: 'text-slate-400' },
                    { label: 'Premium', count: tenants.filter((t: any) => t.subscription?.plan === 'premium').length, color: 'text-indigo-400' },
                    { label: 'Enterprise', count: tenants.filter((t: any) => t.subscription?.plan === 'enterprise').length, color: 'text-purple-400' },
                    { label: 'Expired', count: 0, color: 'text-red-400' },
                ].map((stat, i) => (
                    <div key={i} className="glass-dark p-6 rounded-2xl border border-white/5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.count}</p>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs uppercase bg-slate-950/50 text-slate-400">
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-5">School Name</th>
                                <th className="px-6 py-5">Plan Type</th>
                                <th className="px-6 py-5">Amount</th>
                                <th className="px-6 py-5">Next Renewal</th>
                                <th className="px-6 py-5">Auto-Renew</th>
                                <th className="px-6 py-5">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 italic">Processing data...</td></tr>
                            ) : tenants.map((tenant: any) => (
                                <tr key={tenant._id} className="hover:bg-white/5 transition group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{tenant.name}</span>
                                            <span className="text-[10px] text-slate-500 font-mono italic">{tenant.tenantId}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase ${getPlanColor(tenant.subscription?.plan)}`}>
                                            {tenant.subscription?.plan || 'Basic'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 font-medium">
                                        ${tenant.subscription?.plan === 'enterprise' ? '999' : tenant.subscription?.plan === 'premium' ? '299' : '99'}/mo
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-2 text-green-400">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Enabled
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="text-indigo-400 hover:text-white transition">Manage billing</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
