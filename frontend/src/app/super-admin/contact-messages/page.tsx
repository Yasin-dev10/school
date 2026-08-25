'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/app/utils/api';

const secureFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const csrf = document.cookie.split('; ').find(v => v.startsWith('csrfToken='))?.split('=').slice(1).join('=');
    return fetch(input, { ...init, credentials: 'include', headers: { ...(init.headers || {}), ...(csrf ? { 'X-CSRF-Token': decodeURIComponent(csrf) } : {}) } });
};
import {
    Search, MessageSquare, Loader2, X,
    CheckCircle2, Trash2, Reply, Filter
} from 'lucide-react';

interface ContactMessage {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    institution?: string;
    role: string;
    message: string;
    status: 'new' | 'read' | 'replied' | 'archived';
    reply?: string;
    repliedBy?: { firstName: string; lastName: string; email: string };
    repliedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface Stats {
    total: number;
    todayCount: number;
    statusCounts: { new: number; read: number; replied: number; archived: number };
}

export default function ContactMessagesPage() {
    const router = useRouter();
    const [messages, setMessages]       = useState<ContactMessage[]>([]);
    const [stats, setStats]             = useState<Stats | null>(null);
    const [loading, setLoading]         = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [filterStatus, setFilterStatus]       = useState<string>('all');
    const [search, setSearch]           = useState('');
    const [replyText, setReplyText]     = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { fetchStats(); fetchMessages(); }, [filterStatus]);

    const authHeaders = () => ({});

    const fetchStats = async () => {
        try {
            const res = await secureFetch(getApiUrl('/contact-messages/stats'), { headers: authHeaders() });
            if (res.ok) setStats(await res.json());
        } catch {}
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const url = filterStatus === 'all'
                ? getApiUrl('/contact-messages')
                : getApiUrl(`/contact-messages?status=${filterStatus}`);
            const res = await secureFetch(url, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            } else if (res.status === 403) {
                router.push('/super-admin/dashboard');
            }
        } catch {} finally { setLoading(false); }
    };

    const handleViewMessage = (msg: ContactMessage) => {
        setSelectedMessage(msg);
        setReplyText(msg.reply || '');
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await secureFetch(getApiUrl(`/contact-messages/${id}`), {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) { fetchMessages(); fetchStats(); if (selectedMessage?.id === id) setSelectedMessage(null); }
        } catch {}
    };

    const handleReply = async () => {
        if (!selectedMessage || !replyText.trim()) return;
        try {
            setIsSubmitting(true);
            const res = await secureFetch(getApiUrl(`/contact-messages/${selectedMessage.id}`), {
                method: 'PATCH',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'replied', reply: replyText }),
            });
            if (res.ok) { fetchMessages(); fetchStats(); setSelectedMessage(null); setReplyText(''); }
        } catch {} finally { setIsSubmitting(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            const res = await secureFetch(getApiUrl(`/contact-messages/${id}`), { method: 'DELETE', headers: authHeaders() });
            if (res.ok) { fetchMessages(); fetchStats(); if (selectedMessage?.id === id) setSelectedMessage(null); }
        } catch {}
    };

    const statusMeta = (status: string) => {
        if (status === 'new')      return { cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',       dot: 'bg-blue-400' };
        if (status === 'read')     return { cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',     dot: 'bg-amber-400' };
        if (status === 'replied')  return { cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25', dot: 'bg-emerald-400' };
        if (status === 'archived') return { cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/20',   dot: 'bg-slate-400' };
        return { cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/20', dot: 'bg-slate-400' };
    };

    const filtered = messages.filter(m => {
        const q = search.toLowerCase();
        return !search
            || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
            || m.email.toLowerCase().includes(q)
            || (m.institution || '').toLowerCase().includes(q)
            || m.message.toLowerCase().includes(q);
    });

    const formatDate = (d: string) => new Date(d).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const STATUS_TABS = ['all', 'new', 'read', 'replied', 'archived'];
    const inputCls = 'w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition';

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <p className="text-slate-400 text-sm font-medium mb-1">Super Admin</p>
                <h1 className="text-2xl font-bold text-white">Contact Messages</h1>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Total',    value: stats.total,                  cls: 'text-white',         bg: 'bg-slate-800/60 border-white/8' },
                        { label: 'New',      value: stats.statusCounts.new,       cls: 'text-blue-400',      bg: 'bg-blue-500/10 border-blue-500/20' },
                        { label: 'Read',     value: stats.statusCounts.read,      cls: 'text-amber-400',     bg: 'bg-amber-500/10 border-amber-500/20' },
                        { label: 'Replied',  value: stats.statusCounts.replied,   cls: 'text-emerald-400',   bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        { label: 'Today',    value: stats.todayCount,             cls: 'text-purple-400',    bg: 'bg-purple-500/10 border-purple-500/20' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table Container */}
            <div className="bg-slate-800/50 border border-white/8 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border-b border-white/8">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search messages…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-700/50 border border-white/8 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    {/* Status filter tabs */}
                    <div className="flex items-center gap-1 bg-slate-700/40 rounded-xl p-1 border border-white/8">
                        {STATUS_TABS.map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                                    filterStatus === s
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                        No messages found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">From</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Institution</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Role</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Message Preview</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Status</th>
                                    <th className="py-3 px-5 text-left text-slate-400 font-semibold text-xs uppercase tracking-wide">Date</th>
                                    <th className="py-3 px-5 text-right text-slate-400 font-semibold text-xs uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((msg, idx) => {
                                    const sm = statusMeta(msg.status);
                                    return (
                                        <tr
                                            key={msg.id}
                                            className={`border-b border-white/5 last:border-0 transition hover:bg-slate-700/30 ${idx % 2 === 1 ? 'bg-slate-800/20' : ''} ${msg.status === 'new' ? 'border-l-2 border-l-blue-500' : ''}`}
                                        >
                                            <td className="py-3.5 px-5">
                                                <div>
                                                    <p className="font-medium text-white text-sm">{msg.firstName} {msg.lastName}</p>
                                                    <p className="text-[10px] text-slate-500">{msg.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-5 text-slate-400 text-sm">{msg.institution || '—'}</td>
                                            <td className="py-3.5 px-5 text-slate-400 text-sm capitalize">{msg.role || 'Other'}</td>
                                            <td className="py-3.5 px-5 max-w-xs">
                                                <p className="text-slate-300 text-sm truncate">{msg.message}</p>
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${sm.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                                                    {msg.status}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 text-slate-400 text-xs whitespace-nowrap">
                                                {formatDate(msg.createdAt)}
                                            </td>
                                            <td className="py-3.5 px-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewMessage(msg)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition"
                                                    >
                                                        <Reply className="w-3.5 h-3.5" /> View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(msg.id)}
                                                        className="flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── View / Reply Modal ──────────────────────────────────────── */}
            {selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMessage(null)} />
                    <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="h-1 bg-gradient-to-r from-indigo-600 to-purple-600" />

                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-6 border-b border-white/8">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {selectedMessage.firstName} {selectedMessage.lastName}
                                </h2>
                                <p className="text-slate-400 text-sm">{selectedMessage.email}</p>
                            </div>
                            <button onClick={() => setSelectedMessage(null)} className="text-slate-500 hover:text-white transition p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-5">
                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/8">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Institution</p>
                                    <p className="text-white text-sm">{selectedMessage.institution || '—'}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/8">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Role</p>
                                    <p className="text-white text-sm capitalize">{selectedMessage.role || 'Other'}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/8">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Received</p>
                                    <p className="text-white text-sm">{formatDate(selectedMessage.createdAt)}</p>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3 border border-white/8">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {['new', 'read', 'replied', 'archived'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => handleUpdateStatus(selectedMessage.id, s)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${selectedMessage.status === s ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</p>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-white/8">
                                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{selectedMessage.message}</p>
                                </div>
                            </div>

                            {/* Reply */}
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reply / Notes</p>
                                <textarea
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    rows={4}
                                    className={inputCls + ' resize-none'}
                                    placeholder="Add your reply or internal notes…"
                                />
                                {selectedMessage.repliedBy && (
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Replied by {selectedMessage.repliedBy.firstName} {selectedMessage.repliedBy.lastName}
                                        {selectedMessage.repliedAt && ` · ${formatDate(selectedMessage.repliedAt)}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-white/8">
                            <button
                                onClick={handleReply}
                                disabled={isSubmitting || !replyText.trim()}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
                            >
                                {isSubmitting
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <CheckCircle2 className="w-4 h-4" />}
                                {isSubmitting ? 'Saving…' : 'Save Reply'}
                            </button>
                            <button
                                onClick={() => handleDelete(selectedMessage.id)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl text-sm font-semibold transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
