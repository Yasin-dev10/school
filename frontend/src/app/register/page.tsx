"use client";
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="absolute top-0 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
            <div className="absolute bottom-0 -right-48 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>

            <div className="z-10 w-full max-w-2xl p-8 text-center">
                <div className="glass-dark p-12 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-8 shadow-lg shadow-indigo-500/30">
                        <span className="text-white text-4xl font-serif italic font-bold">S</span>
                    </div>

                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
                        Join School<span className="text-indigo-500">OS</span>
                    </h1>

                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-lg mx-auto">
                        To register your institution and start your journey with SchoolOS, please connect with our sales and onboarding team.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/contact"
                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            Contact Sales
                        </Link>
                        <Link
                            href="/login"
                            className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm active:scale-[0.98]"
                        >
                            Back to Login
                        </Link>
                    </div>

                    <div className="mt-12 pt-12 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">School Admin</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage teachers, students, and finances from one dashboard.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Multi-Tenancy</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Complete data isolation for every institution in the network.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Mobile Ready</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Native apps for parents and teachers to stay connected.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
