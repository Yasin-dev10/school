"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({ tenants: 0, activeSubscriptions: 0 });
    const [recentTenants, setRecentTenants] = useState([]);

    useEffect(() => {
        // Fetch dashboard data
        const fetchData = async () => {
            try {
                const { data } = await api.get('/tenants');
                setStats({
                    tenants: data.count,
                    // Simulation of active subscriptions count since backend doesn't aggregate it yet
                    activeSubscriptions: data.data.filter((t: any) => t.status === 'active').length
                });
                setRecentTenants(data.data.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
                    <p className="text-slate-400">Overview of platform performance and schools.</p>
                </div>
                <Link href="/super-admin/tenants/add" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition">
                    + Add New School
                </Link>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Schools</h3>
                    <p className="text-4xl font-bold text-white mt-2">{stats.tenants}</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Active Subscriptions</h3>
                    <p className="text-4xl font-bold text-green-400 mt-2">{stats.activeSubscriptions}</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">System Status</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xl font-bold text-white">Operational</span>
                    </div>
                </div>
            </div>

            {/* Recent Tenants Table */}
            <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-white">Recent Schools</h2>
                    <Link href="/super-admin/tenants" className="text-sm text-indigo-400 hover:text-indigo-300">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-400">
                        <thead className="text-xs uppercase bg-slate-900/50 text-slate-300">
                            <tr>
                                <th className="px-6 py-4">School Name</th>
                                <th className="px-6 py-4">Domain</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentTenants.map((tenant: any) => (
                                <tr key={tenant.id || tenant._id || Math.random()} className="hover:bg-white/5 transition">
                                    <td className="px-6 py-4 font-medium text-white">{tenant.name}</td>
                                    <td className="px-6 py-4">{tenant.domain || tenant.tenantId}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${tenant.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {tenant.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 capitalize">{tenant.subscription?.plan}</td>
                                    <td className="px-6 py-4">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {recentTenants.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No schools found yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
