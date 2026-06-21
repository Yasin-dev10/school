"use client";
import { useState } from 'react';
import LogoUpload from '../../../components/LogoUpload';
import api from '../../utils/api';
import {
    Globe, User, Shield, Mail, Database,
    CheckCircle2, XCircle,
} from 'lucide-react';

const tabs = [
    { id: 'general',       label: 'General',      icon: <Globe className="w-4 h-4" /> },
    { id: 'admin',         label: 'Admin',         icon: <User className="w-4 h-4" /> },
    { id: 'security',      label: 'Security',      icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Email & SMS',   icon: <Mail className="w-4 h-4" /> },
    { id: 'backup',        label: 'Data & Backup', icon: <Database className="w-4 h-4" /> },
];

const inputCls = 'w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition';
const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

export default function GlobalSettingsPage() {
    const [activeTab, setActiveTab]     = useState('general');
    const [platformLogo, setPlatformLogo] = useState('');
    const [loading, setLoading]         = useState(false);
    const [message, setMessage]         = useState('');

    const [adminForm, setAdminForm] = useState({
        firstName: '', lastName: '', email: '',
        currentPassword: '', newPassword: '', confirmPassword: '',
    });

    const handleAdminUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            if (adminForm.newPassword && adminForm.newPassword !== adminForm.confirmPassword) {
                setMessage('error:New passwords do not match');
                setLoading(false);
                return;
            }
            // Update profile fields
            if (adminForm.firstName || adminForm.lastName || adminForm.email) {
                await api.put('/auth/profile', {
                    firstName: adminForm.firstName || undefined,
                    lastName:  adminForm.lastName  || undefined,
                    email:     adminForm.email     || undefined,
                });
            }
            // Change password if requested
            if (adminForm.newPassword) {
                await api.put('/auth/change-password', {
                    currentPassword: adminForm.currentPassword,
                    newPassword: adminForm.newPassword,
                });
            }
            setMessage('success:Admin profile updated successfully');
            setAdminForm({ firstName: '', lastName: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            setMessage('error:' + (error.response?.data?.message || 'Failed to update admin'));
        } finally { setLoading(false); }
    };

    const isSuccess = message.startsWith('success:');
    const msgText   = message.replace(/^(success|error):/, '');

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Global Platform Settings</h1>
                <p className="text-slate-400 text-sm mt-1">Configure infrastructure, security, and integration defaults for the entire platform.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Tabs sidebar */}
                <aside className="w-full md:w-52 shrink-0 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition font-medium text-sm text-left ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className={activeTab === tab.id ? 'text-white' : 'text-slate-500'}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Content panel */}
                <div className="flex-1 bg-slate-800/50 border border-white/5 rounded-2xl p-6 min-h-[480px]">

                    {/* ── GENERAL ── */}
                    {activeTab === 'general' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-base font-bold text-white mb-5">Branding & Identity</h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelCls}>Platform Name</label>
                                        <input type="text" defaultValue="SchoolOS" className={inputCls} />
                                    </div>
                                    <LogoUpload
                                        logo={platformLogo}
                                        onLogoChange={setPlatformLogo}
                                        label="Platform Logo"
                                        containerSize="medium"
                                    />
                                    <div>
                                        <label className={labelCls}>Support Email</label>
                                        <input type="email" defaultValue="support@schoolos.com" className={inputCls} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-white mb-4">Registration Policy</h3>
                                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
                                    <div>
                                        <p className="font-semibold text-white text-sm">Public Registration</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Allow schools to register without invitation.</p>
                                    </div>
                                    <div className="w-11 h-6 bg-slate-700 rounded-full relative cursor-not-allowed">
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-slate-500 rounded-full" />
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition">
                                Save Changes
                            </button>
                        </div>
                    )}

                    {/* ── ADMIN ── */}
                    {activeTab === 'admin' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-white">Admin Profile Settings</h3>
                                <p className="text-slate-400 text-sm mt-1">Update your admin account information and change your password.</p>
                            </div>

                            {message && (
                                <div className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-medium ${
                                    isSuccess
                                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                                }`}>
                                    {isSuccess
                                        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        : <XCircle className="w-4 h-4 shrink-0" />}
                                    {msgText}
                                </div>
                            )}

                            <form onSubmit={handleAdminUpdate} className="space-y-5">
                                {/* Personal */}
                                <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personal Information</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>First Name</label>
                                            <input type="text" placeholder="Enter first name" value={adminForm.firstName}
                                                onChange={e => setAdminForm({ ...adminForm, firstName: e.target.value })}
                                                className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Last Name</label>
                                            <input type="text" placeholder="Enter last name" value={adminForm.lastName}
                                                onChange={e => setAdminForm({ ...adminForm, lastName: e.target.value })}
                                                className={inputCls} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Email Address</label>
                                        <input type="email" placeholder="admin@example.com" value={adminForm.email}
                                            onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                                            className={inputCls} />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="bg-slate-900/50 p-5 rounded-xl border border-white/5 space-y-4">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Change Password</p>
                                    <p className="text-xs text-slate-500">Leave blank if you don&apos;t want to change your password</p>
                                    <div>
                                        <label className={labelCls}>Current Password <span className="text-red-400">*</span></label>
                                        <input type="password" placeholder="Enter current password" value={adminForm.currentPassword}
                                            onChange={e => setAdminForm({ ...adminForm, currentPassword: e.target.value })}
                                            required className={inputCls} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>New Password</label>
                                            <input type="password" placeholder="Leave blank to keep current" value={adminForm.newPassword}
                                                onChange={e => setAdminForm({ ...adminForm, newPassword: e.target.value })}
                                                className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Confirm New Password</label>
                                            <input type="password" placeholder="Confirm new password" value={adminForm.confirmPassword}
                                                onChange={e => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                                                className={inputCls} />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold transition shadow-lg shadow-indigo-500/20">
                                    {loading ? 'Updating…' : 'Update Admin Profile'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* ── SECURITY ── */}
                    {activeTab === 'security' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                                <Shield className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Security Settings</h3>
                            <p className="text-slate-400 max-w-sm text-sm">Configure MFA, session timeouts, and IP whitelisting for Super Admin accounts.</p>
                            <span className="px-4 py-2 bg-indigo-600/10 text-indigo-400 text-xs font-mono rounded-lg border border-indigo-500/20">
                                Coming in next Sprint
                            </span>
                        </div>
                    )}

                    {/* ── OTHER TABS ── */}
                    {activeTab !== 'general' && activeTab !== 'security' && activeTab !== 'admin' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center">
                                <Database className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Module Under Construction</h3>
                            <p className="text-slate-400 max-w-sm text-sm">This module is currently being optimized for high-traffic environments.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
