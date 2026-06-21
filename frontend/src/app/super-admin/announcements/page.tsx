"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { ScrollText, Send, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading]             = useState(true);
    const [sending, setSending]             = useState(false);
    const [error, setError]                 = useState('');
    const [message, setMessage]             = useState('');
    const [form, setForm]                   = useState({ title: '', message: '' });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/notifications/announcements');
            setAnnouncements(data.data || []);
        } catch (e: any) {
            setError('Failed to load announcements.');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) return;
        try {
            setSending(true);
            setMessage('');
            const { data } = await api.post('/notifications/announcements', form);
            setMessage(`success:${data.message}`);
            setForm({ title: '', message: '' });
            setTimeout(() => setMessage(''), 4000);
            fetchAnnouncements();
        } catch (e: any) {
            setMessage('error:' + (e?.response?.data?.message || 'Failed to send announcement'));
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            await api.delete(`/notifications/${id}`);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch {
            alert('Failed to delete announcement.');
        }
    };

    const isSuccess = message.startsWith('success:');
    const msgText   = message.replace(/^(success|error):/, '');

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Platform Announcements</h1>
                <p className="text-slate-400 text-sm mt-0.5">
                    Broadcast announcements to all active schools on the platform.
                </p>
            </div>

            {/* Compose */}
            <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-400" />
                    New Announcement
                </h2>

                {message && (
                    <div className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-medium mb-4 ${
                        isSuccess
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                        {isSuccess ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        {msgText}
                    </div>
                )}

                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Title
                        </label>
                        <input
                            type="text"
                            placeholder="Announcement title…"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                            Message
                        </label>
                        <textarea
                            placeholder="Write your announcement here…"
                            value={form.message}
                            onChange={e => setForm({ ...form, message: e.target.value })}
                            required
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={sending || !form.title.trim() || !form.message.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-indigo-500/20"
                    >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending ? 'Sending…' : 'Broadcast to All Schools'}
                    </button>
                </form>
            </div>

            {/* History */}
            <div className="bg-slate-800/60 border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-slate-400" />
                        Sent Announcements
                    </h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="py-16 text-center text-slate-500">No announcements sent yet.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {announcements.map(ann => (
                            <div key={ann.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-white/3 transition-colors group">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-white text-sm">{ann.title}</p>
                                    <p className="text-slate-400 text-sm mt-1 line-clamp-2">{ann.message}</p>
                                    <p className="text-[10px] text-slate-500 mt-2">
                                        {new Date(ann.createdAt).toLocaleString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                        {ann.sender && ` · by ${ann.sender.firstName} ${ann.sender.lastName}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(ann.id)}
                                    className="shrink-0 opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
