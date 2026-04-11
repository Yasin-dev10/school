'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ContactMessage {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    institution?: string;
    role: string;
    message: string;
    status: 'new' | 'read' | 'replied' | 'archived';
    reply?: string;
    repliedBy?: {
        firstName: string;
        lastName: string;
        email: string;
    };
    repliedAt?: string;
    createdAt: string;
    updatedAt: string;
}

interface Stats {
    total: number;
    todayCount: number;
    statusCounts: {
        new: number;
        read: number;
        replied: number;
        archived: number;
    };
}

export default function ContactMessagesPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchMessages();
    }, [filterStatus]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/contact-messages/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = filterStatus === 'all'
                ? 'http://localhost:5000/api/contact-messages'
                : `http://localhost:5000/api/contact-messages?status=${filterStatus}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
            } else if (response.status === 403) {
                alert('Access denied. This page is only accessible to super-admins.');
                router.push('/super-admin/dashboard');
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewMessage = async (message: ContactMessage) => {
        setSelectedMessage(message);
        setReplyText(message.reply || '');
    };

    const handleUpdateStatus = async (messageId: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/contact-messages/${messageId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                fetchMessages();
                fetchStats();
                if (selectedMessage?._id === messageId) {
                    setSelectedMessage(null);
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleReply = async () => {
        if (!selectedMessage || !replyText.trim()) return;

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/contact-messages/${selectedMessage._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'replied',
                    reply: replyText
                })
            });

            if (response.ok) {
                alert('Reply saved successfully!');
                fetchMessages();
                fetchStats();
                setSelectedMessage(null);
                setReplyText('');
            }
        } catch (error) {
            console.error('Error sending reply:', error);
            alert('Failed to save reply');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (messageId: string) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/api/contact-messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchMessages();
                fetchStats();
                if (selectedMessage?._id === messageId) {
                    setSelectedMessage(null);
                }
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'read': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'replied': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'archived': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-8 space-y-6 bg-slate-950 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Contact Messages</h1>
                    <p className="text-slate-400 mt-1">Manage inquiries from the contact form</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Total Messages</p>
                                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
                            </div>
                            <div className="text-3xl">📧</div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">New</p>
                                <p className="text-2xl font-bold text-blue-400 mt-1">{stats.statusCounts.new}</p>
                            </div>
                            <div className="text-3xl">🆕</div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Read</p>
                                <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.statusCounts.read}</p>
                            </div>
                            <div className="text-3xl">👁️</div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Replied</p>
                                <p className="text-2xl font-bold text-green-400 mt-1">{stats.statusCounts.replied}</p>
                            </div>
                            <div className="text-3xl">✅</div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Today</p>
                                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.todayCount}</p>
                            </div>
                            <div className="text-3xl">📅</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-white/5">
                {['all', 'new', 'read', 'replied', 'archived'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 font-medium capitalize transition ${filterStatus === status
                            ? 'text-indigo-400 border-b-2 border-indigo-400'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Messages List */}
            <div className="bg-slate-900/50 rounded-xl border border-white/5 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No messages found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        From
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Institution
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Message Preview
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {messages.map((message) => (
                                    <tr key={message._id} className="hover:bg-slate-800/30 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-white">
                                                    {message.firstName} {message.lastName}
                                                </div>
                                                <div className="text-sm text-slate-400">{message.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                            {message.institution || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                            {message.role || 'Other'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-white truncate max-w-xs">
                                                {message.message}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(message.status)}`}>
                                                {message.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                            {formatDate(message.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewMessage(message)}
                                                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(message._id)}
                                                    className="text-red-400 hover:text-red-300 font-medium"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Message Detail Modal */}
            {selectedMessage && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
                        <div className="p-6 border-b border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">
                                        Message from {selectedMessage.firstName} {selectedMessage.lastName}
                                    </h2>
                                    <p className="text-slate-400 mt-1">{selectedMessage.email}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Message Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-400">Institution</label>
                                    <p className="text-white mt-1">{selectedMessage.institution || 'Not provided'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400">Sender Role</label>
                                    <p className="text-white mt-1 font-bold">{selectedMessage.role || 'Other'}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400">Message</label>
                                    <p className="text-white mt-1 whitespace-pre-wrap">{selectedMessage.message}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400">Received</label>
                                    <p className="text-white mt-1">{formatDate(selectedMessage.createdAt)}</p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-400">Status</label>
                                    <div className="mt-2 flex gap-2">
                                        {['new', 'read', 'replied', 'archived'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleUpdateStatus(selectedMessage._id, status)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${selectedMessage.status === status
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Reply Section */}
                            <div className="border-t border-white/10 pt-6">
                                <label className="text-sm font-medium text-slate-400">Reply (for internal notes)</label>
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={4}
                                    className="w-full mt-2 px-4 py-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="Add your reply or notes here..."
                                />

                                {selectedMessage.repliedBy && (
                                    <div className="mt-2 text-sm text-slate-400">
                                        Replied by {selectedMessage.repliedBy.firstName} {selectedMessage.repliedBy.lastName} on {formatDate(selectedMessage.repliedAt!)}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleReply}
                                        disabled={isSubmitting || !replyText.trim()}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Reply'}
                                    </button>
                                    <button
                                        onClick={() => setSelectedMessage(null)}
                                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
