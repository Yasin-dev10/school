"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function VerifyCertificate() {
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const verify = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/certificates/verify/${params.code}`);
                setResult(data.data.certificate);
            } catch (err: any) {
                setError(err.response?.data?.message || "Invalid verification code");
            } finally {
                setLoading(false);
            }
        };
        if (params.code) verify();
    }, [params.code]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
            <div className="w-full max-w-2xl bg-slate-900/50 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden text-center">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-600/10 rounded-full blur-[100px]" />

                <div className="mb-10">
                    <div className="w-20 h-20 bg-indigo-600/10 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 border border-white/5">🛡️</div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic">Credential Verification</h1>
                    <p className="text-slate-500 text-sm mt-2 font-mono uppercase tracking-[0.2em]">Authenticity Protocol</p>
                </div>

                {loading ? (
                    <div className="py-20 animate-pulse space-y-4">
                        <div className="h-4 bg-white/5 rounded-full w-3/4 mx-auto" />
                        <div className="h-4 bg-white/5 rounded-full w-1/2 mx-auto" />
                        <p className="text-xs text-slate-600 font-black uppercase tracking-widest mt-8 font-mono">Deciphering Signature...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 px-8 bg-red-500/5 rounded-[2.5rem] border border-red-500/10 space-y-4">
                        <div className="text-4xl">❌</div>
                        <h3 className="text-xl font-bold text-red-400">Verification Failed</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
                        <p className="text-[10px] text-slate-700 font-mono mt-4 uppercase">Error Reference: ERR_INVALID_CODE</p>
                    </div>
                ) : result ? (
                    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
                        <div className="py-12 px-8 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10 border-dashed relative">
                            <div className="absolute top-4 right-8 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 px-3 py-1 rounded-full">✓ Verified Authentic</div>

                            <h2 className="text-4xl font-black text-white mb-2">{result.title}</h2>
                            <p className="text-indigo-400 font-black uppercase tracking-widest text-xs mb-8">{result.type}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left border-t border-white/5 pt-10">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Awarded To</p>
                                    <p className="text-xl font-bold text-slate-200">{result.studentName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Issuing Institution</p>
                                    <p className="text-xl font-bold text-slate-200">{result.schoolName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Issue Date</p>
                                    <p className="text-lg font-bold text-slate-300">{new Date(result.issueDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</p>
                                    <p className="text-lg font-bold text-emerald-400 capitalize">{result.status}</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-slate-600 text-[10px] font-medium leading-relaxed max-w-md mx-auto italic">
                            This document is an official digital record. Any alteration to this certificate renders it null and void. Contact the institution for further authentication requirements.
                        </p>
                    </div>
                ) : null}

                <div className="mt-16 pt-8 border-t border-white/5">
                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest mb-2 font-mono">SchoolOS Verified Registry</p>
                    <div className="flex justify-center gap-6 opacity-20">
                        <span className="text-xs font-bold text-white">ISO 27001</span>
                        <span className="text-xs font-bold text-white">SHA-256</span>
                        <span className="text-xs font-bold text-white">BLOCK-RECORDS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
