"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../utils/api';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await api.post('/auth/login', {
                identifier: identifier.trim(),
                password,
            });

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (data.user.role === 'super-admin') {
                router.push('/super-admin/dashboard');
            } else if (data.user.role === 'student') {
                router.push('/dashboard/student');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error('Login error FULL:', err);
            console.error('Login error response data:', err.response?.data);
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            <div className="absolute top-0 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 -right-48 w-96 h-96 bg-violet-600/15 rounded-full blur-[128px] pointer-events-none" />

            <div className="z-10 w-full max-w-md p-6 sm:p-8">
                <div className="glass-dark p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
                            <GraduationCap className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                            Teachers and students sign in with their generated username. Parents and staff can use email.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm rounded-xl animate-shake">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-0.5">
                                Username or email
                            </label>
                            <input
                                type="text"
                                required
                                autoComplete="username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                placeholder="TCH-SCHOOL-0001 or you@school.edu"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-0.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs px-0.5">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
                                <input
                                    type="checkbox"
                                    className="rounded bg-white dark:bg-slate-900 border-slate-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Remember me</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <Button type="submit" loading={loading} fullWidth size="lg">
                            {loading ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>

                    <p className="text-center text-slate-500 mt-8 text-sm leading-relaxed">
                        Don&apos;t have an institution registered?
                        <br />
                        <Link
                            href="/register"
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold"
                        >
                            Contact sales
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
