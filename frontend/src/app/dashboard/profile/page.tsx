"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { PermissionGuard } from '../../../components/PermissionGuard';
import { ReadOnlyField } from '../../../components/ReadOnlyField';
import { RESOURCES, ACTIONS } from '../../../hooks/usePermission';

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [grades, setGrades] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passSaving, setPassSaving] = useState(false);
    const [viewingID, setViewingID] = useState(false);
    const idCardRef = useRef<HTMLDivElement>(null);

    const [profileForm, setProfileForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        address: ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const [meRes, tenantRes] = await Promise.all([
                    api.get('/auth/me'),
                    api.get('/tenants/me')
                ]);
                const res = meRes.data;
                setUser(res.data);
                setTenant(tenantRes.data.data);
                setProfileForm({
                    firstName: res.data.firstName || '',
                    lastName: res.data.lastName || '',
                    phone: res.data.profile?.phone || '',
                    address: res.data.profile?.address || ''
                });

                if (res.data.role === 'student') {
                    try {
                        const { data: gradesRes } = await api.get('/exams/student-grades');
                        setGrades(gradesRes.data);
                    } catch (err) {
                        console.error("Failed to fetch grades");
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile");
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/auth/profile', profileForm);
            alert("Profile updated successfully!");
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert("New passwords do not match");
            return;
        }
        setPassSaving(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            });
            alert("Password changed successfully!");
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to change password");
        } finally {
            setPassSaving(false);
        }
    };

    const downloadIDCard = async () => {
        if (!idCardRef.current) return;
        try {
            const canvas = await html2canvas(idCardRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: null,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [canvas.width / 4, canvas.height / 4]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 4, canvas.height / 4);
            pdf.save(`${user.firstName}_ID_Card.pdf`);
        } catch (error) {
            console.error("PDF generation failed", error, user);
            alert("Failed to generate PDF");
        }
    };

    if (loading) return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-pulse">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
                <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            </div>
        </div>
    );

    const isStudent = user?.role === 'student';

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl shadow-indigo-500/40 border-4 border-white dark:border-slate-800">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </div>
                    <button className="absolute bottom-1 right-1 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 hover:scale-110 transition-transform shadow-lg">
                        📷
                    </button>
                </div>
                <div className="text-center md:text-left space-y-2">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            {user?.firstName} {user?.lastName}
                        </h1>
                        <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 uppercase tracking-wider">
                            Active Student
                        </span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        ID: {user?.profile?.admissionNo || user?.profile?.rollNo || '20210045'}
                    </p>
                    {isStudent && (
                        <button
                            onClick={() => setViewingID(!viewingID)}
                            className="mt-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 rounded-lg text-xs font-black uppercase tracking-widest border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2"
                        >
                            🪪 {viewingID ? 'Hide ID Card' : 'View ID Card'}
                        </button>
                    )}
                </div>
            </div>

            {viewingID && isStudent && (
                <div className="flex flex-col items-center py-6 animate-in zoom-in duration-300 gap-8 bg-[#4f46e50d] rounded-[3rem] border border-[#4f46e51a]">
                    <div ref={idCardRef} className="w-[350px] h-[520px] bg-[#020617] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col items-center shadow-2xl relative">
                        {/* Premium Design Elements - HEX for PDF compatibility */}
                        <div className="absolute top-0 w-full h-40 bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#1e1b4b] -skew-y-6 -translate-y-12"></div>

                        {/* School Brand Header */}
                        <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg overflow-hidden">
                                {tenant?.config?.logoUrl ? (
                                    <img src={tenant.config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white font-black text-xl italic">{tenant?.name?.charAt(0) || 'S'}</span>
                                )}
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-white font-black text-xs tracking-widest uppercase">
                                    {tenant?.name || 'SchoolOS'}
                                </span>
                                <span className="text-white/60 font-medium text-[7px] tracking-widest uppercase -mt-0.5">Official Student ID</span>
                            </div>
                        </div>

                        <div className="z-10 mt-14 mb-8">
                            <div className="w-32 h-32 rounded-[2.5rem] bg-[#0f172a] border-4 border-[#020617] flex items-center justify-center text-5xl font-black text-white shadow-2xl relative group overflow-hidden">
                                <div className="absolute inset-0 bg-[#4f46e533]"></div>
                                <span className="relative z-10">{user.firstName.charAt(0)}</span>
                            </div>
                        </div>

                        <div className="z-10 text-center px-8 w-full">
                            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{user.firstName} {user.lastName}</h2>
                            <p className="text-[#818cf8] font-black uppercase tracking-[0.2em] text-[10px] my-2 bg-[#818cf81a] inline-block px-3 py-1 rounded-full border border-[#818cf833]">Student ID Card</p>

                            <div className="mt-10 space-y-6 w-full text-slate-200">
                                <div className="flex flex-col items-center">
                                    <p className="text-[9px] text-[#64748b] uppercase font-black tracking-widest mb-1.5">Admission No</p>
                                    <p className="font-mono text-lg font-bold tracking-wider">{user.profile?.admissionNo}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-6">
                                    <div className="border-r border-white/5">
                                        <p className="text-[9px] text-[#64748b] uppercase font-black tracking-widest mb-1.5">Grade</p>
                                        <p className="text-base font-black">{user.profile?.class}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-[#64748b] uppercase font-black tracking-widest mb-1.5">Section</p>
                                        <p className="text-base font-black uppercase">{user.profile?.section}</p>
                                    </div>
                                </div>
                                <div className="pt-2 flex flex-col items-center gap-3">
                                    <div className="w-24 h-24 bg-white p-2.5 rounded-2xl flex items-center justify-center border border-slate-200 shadow-inner">
                                        <div className="w-full h-full flex gap-1 items-end justify-center">
                                            {[3, 6, 4, 8, 5, 7, 4, 6, 3, 5].map((h, i) => (
                                                <div key={i} className={`w-1 bg-[#020617] rounded-full`} style={{ height: `${h * 10}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 w-full text-center">
                            <p className="text-[10px] font-black text-[#94a3b8] tracking-[0.2em] uppercase">Contact: {user?.profile?.phone || 'N/A'}</p>
                            <p className="text-[7px] text-[#475569] font-medium mt-1">Valid until academic year 2025-26</p>
                        </div>
                    </div>
                    <button
                        onClick={downloadIDCard}
                        className="px-8 py-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl font-black transition-all flex items-center gap-3 shadow-lg shadow-[#4f46e533]"
                    >
                        📥 Download PDF Version
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Information Sections */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Academic Information */}
                    {isStudent && (
                        <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-8">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">🎓</span>
                                Academic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InfoItem label="Class" value={user?.profile?.class || 'Not Assigned'} />
                                <InfoItem label="Section" value={user?.profile?.section || 'Not Assigned'} />
                                <InfoItem label="GPA" value={grades?.cumulativeGpa || 'N/A'} isHighlighted />
                                <InfoItem label="Enrollment Year" value={user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : 'N/A'} />
                            </div>
                        </div>
                    )}

                    {/* Personal Details */}
                    <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">👤</span>
                            Personal Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoItem label="Date of Birth" value={user?.profile?.dob ? new Date(user.profile.dob).toLocaleDateString() : 'Not Set'} />
                            <InfoItem label="Gender" value={user?.profile?.gender || 'Not Set'} className="capitalize" />
                            <InfoItem label="Address" value={user?.profile?.address || 'Not Provided'} className="md:col-span-2" />
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">📞</span>
                            Contact Info
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoItem label="Email" value={user?.email} isLink />
                            <InfoItem label="Phone" value={user?.profile?.phone || 'Not Provided'} isPhone />
                        </div>
                    </div>
                </div>

                {/* Edit Profile & Security */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Security Update */}
                    <form onSubmit={handleChangePassword} className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">🛡️</span>
                            Change Password
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder="Current Password"
                                required
                                value={passwordForm.currentPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/50"
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                required
                                value={passwordForm.newPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <input
                                type="password"
                                placeholder="Confirm New Password"
                                required
                                value={passwordForm.confirmPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={passSaving}
                            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
                        >
                            {passSaving ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>

                    {/* Edit Profile Quick Form */}
                    {/* Edit Profile Quick Form */}
                    <form onSubmit={handleUpdateProfile} className="glass dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">✏️</span>
                            Quick Update
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <ReadOnlyField resource={RESOURCES.PROFILE} action={ACTIONS.UPDATE} value={profileForm.firstName} label="First Name">
                                    <input
                                        placeholder="First Name"
                                        value={profileForm.firstName}
                                        onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                                        className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </ReadOnlyField>
                                <ReadOnlyField resource={RESOURCES.PROFILE} action={ACTIONS.UPDATE} value={profileForm.lastName} label="Last Name">
                                    <input
                                        placeholder="Last Name"
                                        value={profileForm.lastName}
                                        onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                                        className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </ReadOnlyField>
                            </div>
                            <ReadOnlyField resource={RESOURCES.PROFILE} action={ACTIONS.UPDATE} value={profileForm.phone} label="Phone">
                                <input
                                    placeholder="Phone"
                                    value={profileForm.phone}
                                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                                    className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </ReadOnlyField>
                            <ReadOnlyField resource={RESOURCES.PROFILE} action={ACTIONS.UPDATE} value={profileForm.address} label="Address">
                                <input
                                    placeholder="Address"
                                    value={profileForm.address}
                                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                    className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </ReadOnlyField>
                        </div>
                        <PermissionGuard resource={RESOURCES.PROFILE} action={ACTIONS.UPDATE}>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </PermissionGuard>
                    </form>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ label, value, isHighlighted = false, isLink = false, isPhone = false, className = "" }: any) {
    return (
        <div className={`flex justify-between items-start group ${className}`}>
            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2">
                {isHighlighted ? (
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black rounded-lg text-sm border border-indigo-500/20">
                        {value}
                    </span>
                ) : (
                    <span className={`text-sm font-bold text-slate-700 dark:text-slate-200 ${isLink || isPhone ? 'text-indigo-500' : ''}`}>
                        {value}
                        {isLink && <span className="ml-1 opacity-50">↗</span>}
                        {isPhone && <span className="ml-1 opacity-50">📞</span>}
                    </span>
                )}
            </div>
        </div>
    );
}
