"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '../../../../utils/api';
import Link from 'next/link';

export default function EditTeacherPage() {
    const router = useRouter();
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        designation: '',
        qualification: '',
        phone: '',
        salary: ''
    });

    useEffect(() => {
        const fetchTeacher = async () => {
            try {
                const { data } = await api.get(`/teachers/${id}`);
                const teacher = data.data;
                setFormData({
                    firstName: teacher.firstName,
                    lastName: teacher.lastName,
                    email: teacher.email,
                    designation: teacher.profile?.designation || '',
                    qualification: teacher.profile?.qualification || '',
                    phone: teacher.profile?.phone || '',
                    salary: teacher.profile?.salary || ''
                });
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to fetch teacher details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTeacher();
        }
    }, [id]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            await api.put(`/teachers/${id}`, {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                profile: {
                    designation: formData.designation,
                    qualification: formData.qualification,
                    phone: formData.phone,
                    salary: formData.salary
                }
            });

            alert('Teacher profile updated successfully');
            router.push(`/dashboard/teachers/${id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update teacher');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="p-20 text-center text-slate-500 font-medium animate-pulse italic">Loading faculty profile...</div>;
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-10">
                <Link href={`/dashboard/teachers/${id}`} className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm font-medium">
                    <span>←</span> Back to Profile
                </Link>
                <h1 className="text-4xl font-black text-white tracking-tight">Edit Faculty Profile</h1>
                <p className="text-slate-500 mt-1">Update employment details and personal information.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Personal Info */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">👨‍🏫</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                            <input
                                name="firstName" required value={formData.firstName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                            <input
                                name="lastName" required value={formData.lastName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contact Email</label>
                            <input
                                type="email" name="email" required value={formData.email} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                            <input
                                name="phone" value={formData.phone} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                    </div>
                </section>

                {/* Professional Details */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">🎓</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Professional Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Designation</label>
                            <input
                                name="designation" required value={formData.designation} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Qualification</label>
                            <input
                                name="qualification" value={formData.qualification} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Current Salary</label>
                            <input
                                type="number" name="salary" value={formData.salary} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                            />
                        </div>
                    </div>
                </section>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-4.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[1.5rem] font-black text-lg transition shadow-xl shadow-purple-500/25 active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                    <Link href={`/dashboard/teachers/${id}`} className="px-10 py-4.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-[1.5rem] font-bold text-center transition">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
