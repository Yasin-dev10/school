"use client";
import { useState } from 'react';

export default function GlobalSettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    const tabs = [
        { id: 'general', label: 'General', icon: '🌍' },
        { id: 'security', label: 'Security', icon: '🛡️' },
        { id: 'notifications', label: 'Email & SMS', icon: '✉️' },
        { id: 'backup', label: 'Data & Backup', icon: '💾' },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Global Platform Settings</h1>
                <p className="text-slate-400 mt-1">Configure infrastructure, security, and integration defaults for the entire platform.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Tabs Sidebar */}
                <aside className="w-full md:w-64 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition font-medium text-sm text-left ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </aside>

                {/* Settings Form Area */}
                <main className="flex-1 glass-dark p-8 rounded-3xl border border-white/5 min-h-[500px]">
                    {activeTab === 'general' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4">Branding & Identity</h3>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-500 ml-1">Platform Name</label>
                                        <input type="text" defaultValue="SchoolOS" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-500 ml-1">Support Email</label>
                                        <input type="email" defaultValue="support@schoolos.com" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-4">Registration Policy</h3>
                                <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="font-semibold text-white">Public Registration</p>
                                        <p className="text-xs text-slate-500">Allow schools to register themselves without invitation.</p>
                                    </div>
                                    <div className="w-12 h-6 bg-slate-800 rounded-full relative cursor-not-allowed">
                                        <div className="absolute left-1 top-1 w-4 h-4 bg-slate-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition">Save Changes</button>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <span className="text-6xl">🔒</span>
                            <h3 className="text-xl font-bold text-white">Security Settings</h3>
                            <p className="text-slate-500 max-w-sm">Configure MFA, session timeouts, and IP whitelisting for Super Admin accounts.</p>
                            <p className="px-4 py-2 bg-indigo-600/10 text-indigo-400 text-xs font-mono rounded-lg border border-indigo-500/20">Coming in next Sprint</p>
                        </div>
                    )}

                    {activeTab !== 'general' && activeTab !== 'security' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <span className="text-6xl">🛠️</span>
                            <h3 className="text-xl font-bold text-white">Module Under Construction</h3>
                            <p className="text-slate-500 max-w-sm">This module is currently being optimized for high-traffic environments.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
