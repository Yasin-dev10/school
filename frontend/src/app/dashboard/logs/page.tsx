"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data } = await api.get('/logs');
                setLogs(data.data);
            } catch (err) {
                console.error("Failed to fetch logs");
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
            case 'LOGIN': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case 'SUSPEND': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            case 'ACTIVATE': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">System Audit Logs</h1>
                <p className="text-slate-500 mt-1">Real-time tracking of critical administrative actions and security events.</p>
            </div>

            <div className="glass-dark rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">Timestamp</th>
                                <th className="px-6 py-5">Action</th>
                                <th className="px-6 py-5">Module</th>
                                <th className="px-6 py-5">Performed By</th>
                                <th className="px-6 py-5">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-600 animate-pulse font-medium italic">Scanning audit database...</td></tr>
                            ) : logs.map((log: any) => (
                                <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">{log.module}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-[10px]">
                                                {log.performedBy?.firstName?.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{log.performedBy?.firstName} {log.performedBy?.lastName}</span>
                                                <span className="text-[10px] text-slate-500 uppercase">{log.performedBy?.role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 max-w-md truncate">
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-600 font-medium italic">No logs found in the current session.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
