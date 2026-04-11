'use client';

import Link from 'next/link';
import { useState } from 'react';
import { validateContactMessage, ValidationError } from '@/utils/validation';
import { ValidationMessage } from '@/components/ui/ValidationMessage';

export default function ContactPage() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        institution: '',
        message: '',
        role: 'Other'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData({
            ...formData,
            [id]: value
        });
        // Clear field error when user starts typing
        if (fieldErrors[id]) {
            setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[id];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus({ type: null, message: '' });
        setValidationErrors([]);
        setFieldErrors({});

        // Client-side validation
        const validationResult = validateContactMessage(formData);
        if (!validationResult.isValid && validationResult.errors) {
            setValidationErrors(validationResult.errors);
            // Map errors to field errors for individual field highlighting
            const fieldErrorsMap: Record<string, string> = {};
            validationResult.errors.forEach(error => {
                fieldErrorsMap[error.field] = error.message;
            });
            setFieldErrors(fieldErrorsMap);
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/contact-messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitStatus({
                    type: 'success',
                    message: data.message || 'Thank you for contacting us! We will get back to you soon.'
                });
                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    institution: '',
                    message: '',
                    role: 'Other'
                });
                setValidationErrors([]);
                setFieldErrors({});
            } else {
                // Handle API validation errors
                if (data.errors && Array.isArray(data.errors)) {
                    setValidationErrors(data.errors);
                    const fieldErrorsMap: Record<string, string> = {};
                    data.errors.forEach((error: ValidationError) => {
                        fieldErrorsMap[error.field] = error.message;
                    });
                    setFieldErrors(fieldErrorsMap);
                    setSubmitStatus({
                        type: 'error',
                        message: data.message || 'Please fix the validation errors below.'
                    });
                } else {
                    setSubmitStatus({
                        type: 'error',
                        message: data.message || 'Failed to send message. Please try again.'
                    });
                }
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            setSubmitStatus({
                type: 'error',
                message: 'Network error. Please check your connection and try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Navbar */}
            <nav className="w-full px-8 py-6 flex justify-between items-center glass-dark sticky top-0 z-50 border-b border-white/5">
                <Link href="/" className="text-2xl font-bold tracking-tighter text-white flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-serif italic font-bold">S</span>
                    </div>
                    <span>School<span className="text-indigo-400">OS</span></span>
                </Link>
                <div className="flex gap-4 items-center">
                    <Link href="/login" className="hidden md:block text-sm font-medium text-white hover:text-indigo-300 transition">
                        Log in
                    </Link>
                    <Link href="/register" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition shadow-lg shadow-indigo-500/30 text-sm">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Contact Section */}
            <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-24 relative">
                {/* Background Elements */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none"></div>
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none"></div>

                <div className="z-10 max-w-4xl w-full space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
                            Get in <span className="premium-text">Touch</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                            Have questions about SchoolOS? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                        </p>
                    </div>

                    {/* Contact Form */}
                    <div className="glass-dark p-8 md:p-12 rounded-3xl border border-white/5 max-w-2xl mx-auto">
                        {/* Status Messages */}
                        {submitStatus.type && (
                            <div className={`mb-6 p-4 rounded-lg ${submitStatus.type === 'success'
                                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                                : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                }`}>
                                <p className="text-sm font-medium">{submitStatus.message}</p>
                            </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <div className="mb-6">
                                <ValidationMessage errors={validationErrors} />
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                                            fieldErrors.firstName ? 'border-red-500 bg-red-500/10' : 'border-white/10'
                                        }`}
                                        placeholder="Enter Your First Name"
                                    />
                                    {fieldErrors.firstName && (
                                        <p className="mt-1 text-sm text-red-400">{fieldErrors.firstName}</p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                        className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                                            fieldErrors.lastName ? 'border-red-500 bg-red-500/10' : 'border-white/10'
                                        }`}
                                        placeholder="Enter Your Last Name"
                                    />
                                    {fieldErrors.lastName && (
                                        <p className="mt-1 text-sm text-red-400">{fieldErrors.lastName}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                                        fieldErrors.email ? 'border-red-500 bg-red-500/10' : 'border-white/10'
                                    }`}
                                    placeholder="Enter Your Email Address"
                                />
                                {fieldErrors.email && (
                                    <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="institution" className="block text-sm font-medium text-slate-300 mb-2">
                                    Institution Name
                                </label>
                                <input
                                    type="text"
                                    id="institution"
                                    value={formData.institution}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="Your School"
                                />
                            </div>

                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-2">
                                    Who are you?
                                </label>
                                <select
                                    id="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                >
                                    <option value="Parent">I am a Parent</option>
                                    <option value="Student">I am a Student</option>
                                    <option value="Admin">I am an Administrator</option>
                                    <option value="Other">Other / Interested Party</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none ${
                                        fieldErrors.message ? 'border-red-500 bg-red-500/10' : 'border-white/10'
                                    }`}
                                    placeholder="Tell us about your needs..."
                                ></textarea>
                                {fieldErrors.message && (
                                    <p className="mt-1 text-sm text-red-400">{fieldErrors.message}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition transform hover:-translate-y-1 hover:shadow-2xl shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    </div>

                    {/* Contact Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                        <div className="glass-dark p-6 rounded-2xl border border-white/5">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold mb-1">Email</h3>
                            <p className="text-slate-400 text-sm">groupg@schoolos.com</p>
                        </div>

                        <div className="glass-dark p-6 rounded-2xl border border-white/5">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold mb-1">Phone</h3>
                            <p className="text-slate-400 text-sm">+252 610 88 88 88</p>
                        </div>

                        <div className="glass-dark p-6 rounded-2xl border border-white/5">
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-white font-semibold mb-1">Office</h3>
                            <p className="text-slate-400 text-sm">Mogadishu, Somalia</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
