"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../utils/api';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ForgotPasswordPage() {
    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        setToken(new URLSearchParams(window.location.search).get('token') || '');
    }, []);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setMessage('');
        if (token && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const response = token
                ? await api.post('/auth/reset-password', { token, password })
                : await api.post('/auth/forgot-password', { email });
            setMessage(response.data.message);
            if (token) {
                setPassword('');
                setConfirmPassword('');
            }
        } catch (requestError: any) {
            setError(requestError.response?.data?.message || 'Could not process the request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="absolute top-4 right-4"><ThemeToggle /></div>
            <form onSubmit={submit} className="w-full max-w-md bg-white dark:bg-slate-900 p-7 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                        {token ? 'Choose a new password' : 'Reset your password'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-2">
                        {token ? 'Enter a secure password with at least 8 characters.' : 'We will email a secure reset link to your account address.'}
                    </p>
                </div>
                {token ? (
                    <>
                        <label className="block text-sm font-semibold">
                            New password
                            <input type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)}
                                className="mt-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                        </label>
                        <label className="block text-sm font-semibold">
                            Confirm password
                            <input type="password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                                className="mt-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                        </label>
                    </>
                ) : (
                    <label className="block text-sm font-semibold">
                        Email address
                        <input type="email" required value={email} onChange={event => setEmail(event.target.value)}
                            className="mt-1 w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                    </label>
                )}
                {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 text-sm">{error}</p>}
                {message && <p className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-sm">{message}</p>}
                <button disabled={loading} className="w-full py-3.5 bg-indigo-600 disabled:opacity-60 text-white rounded-xl font-bold">
                    {loading ? 'Processing...' : token ? 'Save new password' : 'Send reset link'}
                </button>
                <Link href="/login" className="block text-center text-sm text-indigo-600 font-semibold">Back to login</Link>
            </form>
        </div>
    );
}
