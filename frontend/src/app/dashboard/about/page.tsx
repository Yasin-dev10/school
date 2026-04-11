"use client";
import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Mail, Phone, MapPin, Globe, Building2, Server, ShieldCheck } from 'lucide-react';

export default function AboutPage() {
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/tenants/me')
            .then(res => {
                setTenant(res.data.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const appVersion = "2.1.0"; // Synchronize with README

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-12">
                <div className="absolute top-0 right-0 p-16 opacity-10">
                    <Building2 size={300} />
                </div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-extrabold mb-4">{tenant?.name || 'SchoolOS'}</h1>
                    <p className="text-lg text-indigo-100 max-w-2xl">
                        Empowering education through technology. This institution is managed using the SchoolOS Multi-Tenant Platform, ensuring secure, efficient, and data-driven operations.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* School Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <Building2 className="text-indigo-600" />
                            <span>Institution Details</span>
                        </h2>

                        {loading ? (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Address</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {tenant?.address || 'Not Provided'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                            <Phone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Phone</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {tenant?.phone || 'Not Provided'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Email</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {tenant?.email || 'Not Provided'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                                            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">Website</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {tenant?.website ? (
                                                    <a href={tenant.website} target="_blank" rel="noreferrer" className="hover:text-indigo-500 underline decoration-indigo-500/30">
                                                        {tenant.website}
                                                    </a>
                                                ) : 'Not Provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                        <h2 className="text-2xl font-bold mb-4">Mission & Vision</h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {tenant?.description || "Our mission is to provide a comprehensive and innovative educational environment that fosters academic excellence and personal growth. We are dedicated to nurturing the potential of every student through modern teaching methodologies and world-class facilities."}
                        </p>
                    </div>
                </div>

                {/* System Info */}
                <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Server className="w-5 h-5 text-indigo-500" />
                            System Information
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800/50 last:border-0">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Platform Version</span>
                                <span className="font-mono text-sm font-medium">{appVersion}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800/50 last:border-0">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Environment</span>
                                <span className="font-mono text-sm font-medium text-green-600 dark:text-green-400">Production</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-800/50 last:border-0">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium border border-green-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Operational
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-indigo-500" />
                            Privacy & Security
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                            Your data is securely stored and encrypted. SchoolOS adheres to strict data privacy regulations to ensure the safety of student and staff information.
                        </p>
                        <button className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                            View Privacy Policy
                        </button>
                    </div>
                </div>
            </div>

            <footer className="text-center pt-8 border-t border-slate-200 dark:border-slate-800 mt-12">
                <p className="text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} {tenant?.name || 'SchoolOS'}. All rights reserved.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    Powered by <span className="font-bold text-indigo-500">SchoolOS</span> Multi-Tenant Platform
                </p>
            </footer>
        </div>
    );
}
