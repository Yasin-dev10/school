"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../utils/api';
import { validateStudent } from '@/utils/validation';
import Link from 'next/link';

export default function AddStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [classes, setClasses] = useState([]);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        admissionNo: '',
        studentId: '',
        rollNo: '',
        class: '',
        section: 'A',
        gender: 'male',
        dob: '',
        phone: '',
        address: '',
        parentFirstName: '',
        parentLastName: '',
        parentEmail: '',
        parentPhone: '',
        parentRelationship: 'Guardian'
    });

    useEffect(() => {
        api.get('/classes').then(res => {
            setClasses(res.data.data);
            if (res.data.data.length > 0) {
                // Set default class if available
                // setFormData(prev => ({ ...prev, class: res.data.data[0].name, section: res.data.data[0].section }));
            }
        }).catch(err => console.error("Failed to fetch classes", err));
    }, []);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Client-side Validation
        const validation = validateStudent({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone
        });

        if (!validation.isValid) {
            const firstError = validation.errors && validation.errors.length > 0
                ? validation.errors[0].message
                : validation.message;
            setError(firstError);
            setLoading(false);
            return;
        }

        try {
            const { data } = await api.post('/students', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password || '', // Empty sends trigger to backend for auto-gen
                profile: {
                    admissionNo: formData.admissionNo,
                    studentId: formData.studentId,
                    rollNo: formData.rollNo,
                    class: formData.class,
                    section: formData.section,
                    gender: formData.gender,
                    dob: formData.dob,
                    phone: formData.phone,
                    address: formData.address
                },
                parentDetails: formData.parentEmail ? {
                    firstName: formData.parentFirstName,
                    lastName: formData.parentLastName,
                    email: formData.parentEmail,
                    phone: formData.parentPhone,
                    relationship: formData.parentRelationship
                } : null,
                parentRelationship: formData.parentRelationship
            });

            if (data.tempPassword) {
                alert(`Student registered successfully!\n\nAccess Credentials:\nEmail: ${formData.email}\nPassword: ${data.tempPassword}\n\nPlease copy this password and provide it to the student.`);
            } else {
                alert('Student registered successfully');
            }

            router.push('/dashboard/students');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to register student');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-10">
                <Link href="/dashboard/students" className="text-slate-500 hover:text-white transition flex items-center gap-2 mb-4 text-sm font-medium">
                    <span>←</span> Back to Directory
                </Link>
                <h1 className="text-4xl font-black text-white tracking-tight">Student Admission</h1>
                <p className="text-slate-500 mt-1">Onboard a new student into the institutional record.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}

                {/* Basic Info */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">👤</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                            <input
                                name="firstName" required value={formData.firstName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                            <input
                                name="lastName" required value={formData.lastName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Official Email</label>
                            <input
                                type="email" name="email" required value={formData.email} onChange={handleChange}
                                placeholder="student@school.com"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                            <select
                                name="gender" value={formData.gender} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                            <input
                                name="phone" value={formData.phone} onChange={handleChange}
                                placeholder="+1 234 567 8900"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition shadow-inner"
                            />
                        </div>
                    </div>
                </section>

                {/* Academic Details */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">📝</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Academic Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admission Number</label>
                            <input
                                name="admissionNo" value={formData.admissionNo} onChange={handleChange}
                                placeholder="[Auto-generated]"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student ID</label>
                            <input
                                name="studentId" value={formData.studentId} onChange={handleChange}
                                placeholder="[Auto-generated]"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Class</label>
                            <select
                                name="class" required value={formData.class} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            >
                                <option value="">Select Class</option>
                                {Array.from(new Set(classes.map((c: any) => c.name))).map(name => (
                                    <option key={name as string} value={name as string}>{name as string}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Section</label>
                            <select
                                name="section" required value={formData.section} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            >
                                {classes.filter((c: any) => c.name === formData.class).map((c: any) => (
                                    <option key={c._id} value={c.section}>{c.section}</option>
                                )) || <option value="A">A</option>}
                                {classes.filter((c: any) => c.name === formData.class).length === 0 && <option value="A">A</option>}
                            </select>
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Roll Number</label>
                            <input
                                name="rollNo" value={formData.rollNo} onChange={handleChange}
                                placeholder="[Auto-generated]"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </section>

                {/* Parent Information */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">🏠</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Guardian Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Guardian First Name</label>
                            <input
                                name="parentFirstName" value={formData.parentFirstName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Guardian Last Name</label>
                            <input
                                name="parentLastName" value={formData.parentLastName} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Guardian Email</label>
                            <input
                                type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange}
                                placeholder="Required for account activation"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Guardian Phone/WhatsApp</label>
                            <input
                                name="parentPhone" value={formData.parentPhone} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Relationship</label>
                            <select
                                name="parentRelationship" value={formData.parentRelationship} onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                            >
                                <option value="Father">Father</option>
                                <option value="Mother">Mother</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Account Security */}
                <section className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 pointer-events-none">🔐</div>
                    <h2 className="text-xl font-bold text-white border-b border-white/5 pb-4">Account Security</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student Account Password</label>
                            <input
                                type="password" name="password" value={formData.password} onChange={handleChange}
                                placeholder="Fallback: student123"
                                className="w-full px-5 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                            />
                            <p className="text-[10px] text-slate-500 mt-2 px-1">This will be the standard login credential and can be changed later.</p>
                        </div>
                    </div>
                </section>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-4.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black text-lg transition shadow-xl shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Processing Admission...' : 'Finalize Registration'}
                    </button>
                    <Link href="/dashboard/students" className="px-10 py-4.5 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 rounded-[1.5rem] font-bold text-center transition">
                        Cancel
                    </Link>
                </div>
            </form>
        </div>
    );
}
