"use client";
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="absolute top-0 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
            <div className="absolute bottom-0 -right-48 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-md p-8">
                <div className="glass-dark p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
                        <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-4zM14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Reset Password</h1>

                    <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                        For security reasons in our multi-tenant system, password resets must be initiated by your school administrator or the person who created your account.
                    </p>

                    <div className="space-y-4">
                        <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-sm text-slate-500 dark:text-slate-400">
                            If you are a <strong>School Admin</strong> and lost access, please contact SchoolOS Global Support.
                        </div>

                        <Link
                            href="/login"
                            className="block w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
