"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Link from 'next/link';

export default function TenantsPage() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchTenants = async () => {
        try {
            const { data } = await api.get('/tenants');
            setTenants(data.data);
        } catch (error) {
            console.error("Failed to fetch schools", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            await api.delete(`/tenants/${id}`);
            setTenants(tenants.filter((t: any) => t._id !== id));
            alert("School deleted successfully.");
        } catch (error) {
            alert("Failed to delete school.");
        }
    };

    const filteredTenants = tenants.filter((t: any) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tenantId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Registered Schools</h1>
                    <p className="text-slate-400 mt-1">Manage all institutions on the platform.</p>
                </div>
                <Link href="/super-admin/tenants/add" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20">
                    + Add New School
                </Link>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-400 text-sm focus:outline-none">
                        <option>All Status</option>
                        <option>Active</option>
                        <option>Suspended</option>
                    </select>
                    <button className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-white/5 hover:bg-slate-700 transition">
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Grid View */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTenants.map((tenant: any) => (
                        <div key={tenant._id} className="glass-dark border border-white/5 rounded-3xl overflow-hidden group hover:border-indigo-500/30 transition shadow-xl">
                            <div className="h-2 bg-indigo-600 w-full group-hover:bg-indigo-400 transition"></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl">
                                        {tenant.config?.logoUrl ? <img src={tenant.config.logoUrl} alt="Logo" /> : '🏫'}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tenant.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition">{tenant.name}</h3>
                                <p className="text-slate-500 text-sm font-mono mt-1">{tenant.domain || `${tenant.tenantId}.platform.com`}</p>

                                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Plan</p>
                                        <p className="text-sm font-medium text-slate-200 capitalize">{tenant.subscription?.plan || 'Standard'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Students</p>
                                        <p className="text-sm font-medium text-slate-200">0</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <Link href={`/super-admin/tenants/${tenant._id}`} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-medium transition border border-white/5 text-center">
                                        Details
                                    </Link>
                                    <Link href={`/super-admin/tenants/${tenant._id}/edit`} className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 rounded-xl transition border border-indigo-600/20">
                                        ✏️
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(tenant._id, tenant.name)}
                                        className="p-2.5 bg-red-400/10 hover:bg-red-400/20 text-red-400 rounded-xl transition border border-red-400/20"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredTenants.length === 0 && (
                        <div className="col-span-full py-20 text-center glass-dark rounded-3xl border border-dashed border-white/10">
                            <p className="text-slate-500 italic">No schools matching your search were found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
