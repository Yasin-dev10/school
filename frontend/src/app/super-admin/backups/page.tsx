"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { HardDriveDownload, Loader2, Database, School, Users, FileText } from 'lucide-react';

export default function BackupsPage() {
    const [stats, setStats]   = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/tenants');
            const tenants: any[] = data.data || [];
            setStats({
                totalSchools: tenants.length,
                active: tenants.filter((t: any) => t.status === 'active').length,
                lastUpdated: new Date().toISOString(),
            });
        } catch (e) {
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Data & Backups</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                    Platform data overview and backup management.
                </p>
            </div>

            {/* Platform stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                        <School className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Schools</p>
                        <p className="text-3xl font-black text-white">{loading ? '—' : stats?.totalSchools ?? '—'}</p>
                    </div>
                </div>
                <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                        <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Active Schools</p>
                        <p className="text-3xl font-black text-emerald-400">{loading ? '—' : stats?.active ?? '—'}</p>
                    </div>
                </div>
                <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Checked</p>
                        <p className="text-sm font-bold text-white mt-1">
                            {loading ? '—' : stats ? new Date(stats.lastUpdated).toLocaleString() : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Backup info */}
            <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                        <HardDriveDownload className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white">Automated Backups</h2>
                        <p className="text-xs text-slate-400">Database backup configuration</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { label: 'Backup Provider', value: 'PostgreSQL / Prisma' },
                        { label: 'Backup Frequency', value: 'Configure via your hosting provider (e.g. Supabase, Railway, Render)' },
                        { label: 'Recommended Tools', value: 'pg_dump, Supabase automated backups, Railway backups' },
                        { label: 'Retention Policy', value: 'Set in your database hosting panel' },
                    ].map(item => (
                        <div key={item.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-white/5 last:border-0">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider sm:w-48 shrink-0">{item.label}</p>
                            <p className="text-sm text-slate-300">{item.value}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-sm text-blue-300 font-medium">
                        To export your data manually, use <code className="bg-blue-500/20 px-1.5 py-0.5 rounded text-xs font-mono">pg_dump</code> from your terminal or configure automated backups through your database hosting provider.
                    </p>
                </div>
            </div>
        </div>
    );
}
