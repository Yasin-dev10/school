"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
    Loader2, Search, ChevronDown, Filter,
    ShieldAlert, Plus, RefreshCw, Trash2, LogIn
} from 'lucide-react';

export default function AuditLogsPage() {
    const [logs, setLogs]         = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/logs');
            setLogs(data.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const actionMeta = (action: string) => {
        const a = (action || '').toUpperCase();
        if (a === 'CREATE') return { cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25', icon: <Plus className="w-3 h-3" /> };
        if (a === 'UPDATE') return { cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',         icon: <RefreshCw className="w-3 h-3" /> };
        if (a === 'DELETE') return { cls: 'bg-red-500/15 text-red-400 border border-red-500/25',             icon: <Trash2 className="w-3 h-3" /> };
        if (a === 'LOGIN')  return { cls: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',   icon: <LogIn className="w-3 h-3" /> };
        return { cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/20', icon: null };
    };

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        const matchQ = !search
            || (l.module || '').toLowerCase().includes(q)
            || (l.details || '').toLowerCase().includes(q)
            || (l.performedBy?.firstName || '').toLowerCase().includes(q)
            || (l.performedBy?.lastName || '').toLowerCase().includes(q);
        const matchA = actionFilter === 'all' || (l.action || '').toUpperCase() === actionFilter;
        return matchQ && matchA;
    });

    // Count per action for stats
    const createCount = logs.filter(l => l.action === 'CREATE').length;
    const updateCount = logs.filter(l => l.action === 'UPDATE').length;
    const deleteCount = logs.filter(l => l.action === 'DELETE').length;
    const loginCount  = logs.filter(l => l.action === 'LOGIN').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                    <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/60 hover:bg-slate-600 border border-white/8 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Create',  count: createCount, cls: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Update',  count: updateCount, cls: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
                    { label: 'Delete',  count: deleteCount, cls: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Login',   count: loginCount,  cls: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                        <p className={`text-2xl font-black ${s.cls}`}>{loading ? '—' : s.count}</p>
                    </div>
                ))}
            </div>

            {/* Table Container */}
            <div className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border-b border-white/8">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search module, details, user…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={actionFilter}
                            onChange={e => setActionFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        >
                            <option value="all">All Actions</option>
                            <option value="CREATE">Create</option>
                            <option value="UPDATE">Update</option>
                            <option value="DELETE">Delete</option>
                            <option value="LOGIN">Login</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                        No logs found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Timestamp</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Action</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Module</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Performed By</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((log, idx) => {
                                    const meta = actionMeta(log.action);
                                    return (
                                        <tr
                                            key={log._id || log.id || idx}
                                            className={`border-b border-white/5 last:border-0 transition hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-800/20' : ''}`}
                                        >
                                            {/* Timestamp */}
                                            <td className="py-3.5 px-5 text-slate-400 text-xs whitespace-nowrap">
                                                {new Date(log.createdAt).toLocaleString('en-US', {
                                                    month: 'short', day: 'numeric', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>

                                            {/* Action */}
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${meta.cls}`}>
                                                    {meta.icon} {log.action}
                                                </span>
                                            </td>

                                            {/* Module */}
                                            <td className="py-3.5 px-5 text-white font-medium">{log.module}</td>

                                            {/* Performed By */}
                                            <td className="py-3.5 px-5">
                                                <div>
                                                    <p className="text-white font-medium text-sm">
                                                        {log.performedBy?.firstName} {log.performedBy?.lastName}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-mono">{log.performedBy?.email}</p>
                                                </div>
                                            </td>

                                            {/* Details */}
                                            <td className="py-3.5 px-5 text-slate-400 text-xs max-w-xs truncate" title={log.details}>
                                                {log.details || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
