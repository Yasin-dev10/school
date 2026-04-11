"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AuditLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data } = await api.get('/logs');
                setLogs(data.data);
            } catch (error) {
                console.error("Failed to fetch logs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'text-green-400 bg-green-400/10 border-green-500/20';
            case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border-blue-500/20';
            case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-500/20';
            case 'LOGIN': return 'text-indigo-400 bg-indigo-400/10 border-indigo-500/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-500/20';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Platform Audit Logs</h1>
                <p className="text-slate-400 mt-1">Real-time tracking of sensitive administrative actions.</p>
            </div>

            <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-xs uppercase bg-slate-950/50 text-slate-400">
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-5">Timestamp</th>
                                <th className="px-6 py-5">Action</th>
                                <th className="px-6 py-5">Module</th>
                                <th className="px-6 py-5">Performed By</th>
                                <th className="px-6 py-5">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                    </td>
                                </tr>
                            ) : logs.map((log: any) => (
                                <tr key={log._id} className="hover:bg-white/5 transition group">
                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-300 font-medium">{log.module}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{log.performedBy?.firstName} {log.performedBy?.lastName}</span>
                                            <span className="text-[10px] text-slate-500">{log.performedBy?.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={log.details}>
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No logs found yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
