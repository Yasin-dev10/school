"use client";
import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function NotificationsPage() {
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Form State
    const [form, setForm] = useState({
        title: '',
        message: '',
        type: 'announcement',
        channels: ['in-app'],
        targetRole: 'all',
        targetClass: ''
    });

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data.data);
        } catch (err) {
            console.error("Failed to fetch notifications");
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const { data } = await api.get('/notifications/unread/count');
            setUnreadCount(data.count);
        } catch (err) {
            console.error("Failed to fetch unread count");
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            await api.put(`/notifications/${notificationId}/read`);
            // Update local state
            setNotifications(prev => prev.map(n =>
                n._id === notificationId ? { ...n, isRead: true } : n
            ));
            fetchUnreadCount();
        } catch (err) {
            console.error("Failed to mark as read");
        }
    };

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUser(JSON.parse(userStr));
        fetchNotifications();
        fetchUnreadCount();

        // Socket Listener
        const { getSocket } = require('../../utils/socket');
        const socket = getSocket();

        if (socket) {
            socket.on('notification-received', (newNotif: any) => {
                setNotifications((prev: any) => [newNotif, ...prev]);
                fetchUnreadCount();
            });
        }

        return () => {
            if (socket) {
                socket.off('notification-received');
            }
        };
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/notifications', form);
            setIsComposeModalOpen(false);
            setForm({
                title: '',
                message: '',
                type: 'announcement',
                channels: ['in-app'],
                targetRole: 'all',
                targetClass: ''
            });
            fetchNotifications();
            alert("Broadcast sent successfully!");
        } catch (err) {
            alert("Failed to send notification");
        }
    };

    const isAdmin = user && ['school-admin', 'teacher'].includes(user.role);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Notification Center</h1>
                    <p className="text-slate-500 mt-1">
                        Manage announcements and multi-channel broadcasts.
                        {unreadCount > 0 && (
                            <span className="ml-2 px-2 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full">
                                {unreadCount} unread
                            </span>
                        )}
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsComposeModalOpen(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        + Create Broadcast
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-slate-600 animate-pulse italic font-bold">Synchronizing feed...</div>
                ) : notifications.length > 0 ? notifications.map((n: any) => (
                    <div
                        key={n._id}
                        onClick={() => !n.isRead && markAsRead(n._id)}
                        className={`glass-dark p-6 rounded-[2rem] border transition-all group ${n.isRead
                                ? 'border-white/5 hover:border-white/10'
                                : 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/50 cursor-pointer'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${n.type === 'alert' ? 'bg-red-500/10 text-red-400' :
                                    n.type === 'fee_reminder' ? 'bg-green-500/10 text-green-400' :
                                        'bg-indigo-500/10 text-indigo-400'
                                    }`}>
                                    {n.type === 'alert' ? '🚨' : n.type === 'fee_reminder' ? '💰' : '📢'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition">{n.title}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                                        From: {n.sender?.firstName} {n.sender?.lastName} • {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {n.channels.map((c: string) => (
                                    <span key={c} className="px-2 py-1 bg-white/5 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-tighter border border-white/5">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <p className="text-slate-400 leading-relaxed text-sm pl-16">
                            {n.message}
                        </p>
                    </div>
                )) : (
                    <div className="text-center py-20 bg-slate-900/40 rounded-[2rem] border border-white/5">
                        <p className="text-slate-500 font-bold">No active notifications found.</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {isComposeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="glass-dark w-full max-w-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl animate-in zoom-in-95">
                        <h2 className="text-2xl font-black text-white mb-6">Dispatch Broadcast</h2>
                        <form onSubmit={handleSend} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50"
                                        placeholder="e.g. Laboratory Closure"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Priority Type</label>
                                    <select
                                        value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                    >
                                        <option value="announcement">Announcement</option>
                                        <option value="alert">Critical Alert</option>
                                        <option value="fee_reminder">Fee Reminder</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Message Content</label>
                                <textarea
                                    required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                                    className="w-full h-32 px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                    placeholder="Write your broadcast message here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Audience</label>
                                    <select
                                        value={form.targetRole} onChange={e => setForm({ ...form, targetRole: e.target.value })}
                                        className="w-full px-5 py-3 bg-slate-900 border border-white/10 rounded-2xl text-white outline-none"
                                    >
                                        <option value="all">Everyone</option>
                                        <option value="student">Only Students</option>
                                        <option value="teacher">Only Teachers</option>
                                        <option value="parent">Only Parents</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Delivery Channels</label>
                                    <div className="flex gap-2">
                                        {['in-app', 'sms', 'email'].map(ch => (
                                            <button
                                                key={ch}
                                                type="button"
                                                onClick={() => {
                                                    const channels = form.channels.includes(ch)
                                                        ? form.channels.filter(c => c !== ch)
                                                        : [...form.channels, ch];
                                                    setForm({ ...form, channels });
                                                }}
                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${form.channels.includes(ch)
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-slate-900 border-white/10 text-slate-500'
                                                    }`}
                                            >
                                                {ch}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black shadow-lg shadow-indigo-500/20">Send Broadcast</button>
                                <button type="button" onClick={() => setIsComposeModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-[2rem] font-bold">Discard</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
