"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function CommunicationPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetRole: 'student',
        targetClass: '',
        channels: ['email']
    });

    const fetchData = async () => {
        try {
            const { data } = await api.get('/notifications');
            setMessages(data.data);
        } catch (error) {
            console.error("Fetch failed", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/notifications', {
                ...formData,
                type: 'announcement'
            });
            setIsModalOpen(false);
            setFormData({ title: '', message: '', targetRole: 'student', targetClass: '', channels: ['email'] });
            fetchData();
            alert("Message broadcasted successfully");
        } catch (err: any) {
            alert(err.response?.data?.message || "Send failed");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Communication Portal</h1>
                    <p className="text-slate-500 mt-1">Send secure messages and announcements to students and parents.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition shadow-lg shadow-indigo-500/20"
                >
                    + New Message
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Message History</h2>
                    {loading ? (
                        <div className="py-20 text-center text-slate-500 animate-pulse font-medium italic">Loading history...</div>
                    ) : messages.length === 0 ? (
                        <div className="glass-dark p-20 rounded-[2.5rem] border border-white/5 text-center text-slate-600 italic">No messages sent yet.</div>
                    ) : messages.map((m: any) => (
                        <div key={m._id} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        🔔
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{m.title}</h3>
                                        <p className="text-[10px] text-slate-500 font-mono uppercase">To: {m.targetRole} {m.targetClass && `(${m.targetClass})`}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">{new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed mb-4">{m.message}</p>
                            <div className="flex gap-2">
                                {m.channels.map((c: string) => (
                                    <span key={c} className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-slate-500 font-black uppercase border border-white/5">{c}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white mb-4">Quick Shortcuts</h2>
                    <div className="space-y-3">
                        {['All Students', 'Class A Parents', 'Teaching Staff'].map(group => (
                            <button key={group} className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                <p className="text-sm font-bold text-slate-300 group-hover:text-indigo-400">{group}</p>
                                <p className="text-[10px] text-slate-500">Quick broadcast to {group.toLowerCase()}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="glass-dark w-full max-w-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h2 className="text-3xl font-black text-white mb-8">Compose Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Role</label>
                                    <select
                                        value={formData.targetRole}
                                        onChange={e => setFormData({ ...formData, targetRole: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    >
                                        <option value="all">Everyone</option>
                                        <option value="student">Students Only</option>
                                        <option value="parent">Parents Only</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Specific Class (Optional)</label>
                                    <input
                                        value={formData.targetClass}
                                        onChange={e => setFormData({ ...formData, targetClass: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="e.g. 10-A"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Subject / Title</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    placeholder="Brief summary of the message"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Message Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.message}
                                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                                    className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                    placeholder="Type your announcement here..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Delivery Channels</label>
                                <div className="flex gap-4">
                                    {['in-app', 'email', 'sms'].map(channel => (
                                        <label key={channel} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={formData.channels.includes(channel)}
                                                onChange={e => {
                                                    const newChannels = e.target.checked
                                                        ? [...formData.channels, channel]
                                                        : formData.channels.filter(c => c !== channel);
                                                    setFormData({ ...formData, channels: newChannels });
                                                }}
                                                className="w-5 h-5 rounded-lg accent-indigo-600 bg-slate-900 border-white/10"
                                            />
                                            <span className="text-sm font-bold text-slate-400 group-hover:text-white capitalize">{channel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-bold transition shadow-xl shadow-indigo-500/20">
                                    Broadcast Message
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 bg-slate-800 text-slate-400 rounded-[1.5rem] font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
