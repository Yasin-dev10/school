"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../utils/api';
import Link from 'next/link';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export default function StudentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [classes, setClasses] = useState([]);
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('profile'); // profile, idcard, documents
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [assignData, setAssignData] = useState({ class: '', section: 'A' });
    const [editData, setEditData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        dob: '',
        gender: 'male',
        studentId: '',
        admissionNo: '',
        rollNo: '',
        parentRelationship: 'Guardian'
    });
    const idCardRef = useRef<HTMLDivElement>(null);

    const fetchStudent = async () => {
        try {
            const [studentRes, classRes, tenantRes] = await Promise.all([
                api.get(`/students/${id}`),
                api.get('/classes'),
                api.get('/tenants/me')
            ]);
            setStudent(studentRes.data.data);
            setClasses(classRes.data.data);
            setTenant(tenantRes.data.data);
            setAssignData({
                class: studentRes.data.data.profile?.class || '',
                section: studentRes.data.data.profile?.section || 'A'
            });
            setEditData({
                firstName: studentRes.data.data.firstName || '',
                lastName: studentRes.data.data.lastName || '',
                email: studentRes.data.data.email || '',
                phone: studentRes.data.data.profile?.phone || '',
                address: studentRes.data.data.profile?.address || '',
                dob: studentRes.data.data.profile?.dob ? new Date(studentRes.data.data.profile.dob).toISOString().split('T')[0] : '',
                gender: studentRes.data.data.profile?.gender || 'male',
                studentId: studentRes.data.data.profile?.studentId || '',
                admissionNo: studentRes.data.data.profile?.admissionNo || '',
                rollNo: studentRes.data.data.profile?.rollNo || '',
                parentRelationship: studentRes.data.data.profile?.parentRelationship || 'Guardian'
            });
        } catch (error) {
            console.error("Failed to fetch student profile", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudent();
    }, [id]);

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/students/${id}`, {
                firstName: editData.firstName,
                lastName: editData.lastName,
                email: editData.email,
                profile: {
                    ...student.profile,
                    phone: editData.phone,
                    address: editData.address,
                    dob: editData.dob,
                    gender: editData.gender,
                    studentId: editData.studentId,
                    admissionNo: editData.admissionNo,
                    rollNo: editData.rollNo,
                    parentRelationship: editData.parentRelationship
                }
            });
            alert("Profile updated successfully");
            setIsEditModalOpen(false);
            fetchStudent();
        } catch (err: any) {
            alert(err.response?.data?.message || "Update failed");
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
            pdf.save(`${student.firstName}_ID_Card.pdf`);
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-500 font-medium animate-pulse italic">Retrieving academic profile...</div>;
    if (!student) return <div className="p-20 text-center text-red-500 font-bold">Student record not found.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <Link href="/dashboard/students" className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition">
                        ←
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-indigo-500/30">
                            {student.firstName.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">{student.firstName} {student.lastName}</h1>
                            <p className="text-slate-500 font-mono text-sm">{student.profile?.admissionNo} • {student.profile?.class} - {student.profile?.section}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setView('idcard')} className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/10 transition-all">
                        🪪 View ID Card
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all">
                        🏫 Assign Class
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} className="flex-1 md:flex-none px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold border border-white/5 hover:bg-slate-700 transition">
                        ✏️ Edit Profile
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-dark w-full max-w-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-black text-white mb-6">Edit Student Profile</h2>

                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                                    <input
                                        required
                                        value={editData.firstName}
                                        onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                                    <input
                                        required
                                        value={editData.lastName}
                                        onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={editData.email}
                                        onChange={e => setEditData({ ...editData, email: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Phone</label>
                                    <input
                                        value={editData.phone}
                                        onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={editData.dob}
                                        onChange={e => setEditData({ ...editData, dob: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                                    <select
                                        value={editData.gender}
                                        onChange={e => setEditData({ ...editData, gender: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Student ID</label>
                                    <input
                                        value={editData.studentId}
                                        onChange={e => setEditData({ ...editData, studentId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Admission No</label>
                                    <input
                                        value={editData.admissionNo}
                                        onChange={e => setEditData({ ...editData, admissionNo: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Roll No</label>
                                    <input
                                        value={editData.rollNo}
                                        onChange={e => setEditData({ ...editData, rollNo: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Parent Relationship</label>
                                        <select
                                            value={editData.parentRelationship}
                                            onChange={e => setEditData({ ...editData, parentRelationship: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition"
                                        >
                                            <option value="Father">Father</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Guardian">Guardian</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Address</label>
                                <textarea
                                    value={editData.address}
                                    onChange={e => setEditData({ ...editData, address: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition h-24"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="submit" className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition">
                                    Save Changes
                                </button>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-8 border-b border-white/5">
                {['profile', 'attendance', 'exams', 'finance', 'documents'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setView(tab)}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative ${view === tab ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab}
                        {view === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-full"></div>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {view === 'profile' && (
                    <>
                        <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="glass-dark p-8 rounded-[2rem] border border-white/5 space-y-8">
                                <h3 className="text-xl font-bold text-white">Full Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { label: 'Date of Birth', value: student.profile?.dob ? new Date(student.profile.dob).toLocaleDateString() : 'Not Set' },
                                        { label: 'Gender', value: student.profile?.gender || 'Not Set' },
                                        { label: 'Phone', value: student.profile?.phone || 'Not Set' },
                                        { label: 'Email', value: student.email },
                                        { label: 'Address', value: student.profile?.address || 'Not Set' },
                                        { label: 'Student ID', value: student.profile?.studentId || 'N/A' },
                                        { label: 'Admission No', value: student.profile?.admissionNo || 'N/A' },
                                        { label: 'Roll Number', value: student.profile?.rollNo || 'N/A' },
                                        { label: 'Password', value: student.password_plain || '••••••••' },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{item.label}</p>
                                            <p className="text-slate-200 font-medium">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Guardians</h3>
                                {student.profile?.parentIds?.length > 0 ? student.profile.parentIds.map((parent: any) => (
                                    <div key={parent._id} className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-white">{parent.firstName} {parent.lastName}</p>
                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                {student.profile?.parentRelationship || 'Guardian'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500">{parent.email}</p>
                                        <p className="text-[10px] text-indigo-400 font-medium">{parent.profile?.phone || 'No phone'}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-500 italic px-2">No guardian linked.</p>
                                )}
                            </div>

                            <div className="glass-dark p-6 rounded-3xl border border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Monthly Attendance</span>
                                        <span className="text-green-400 font-bold">92%</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Last GPA</span>
                                        <span className="text-indigo-400 font-bold">3.8</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {view === 'attendance' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Attendance History</h3>
                            <div className="flex gap-4">
                                <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Present Rate</p>
                                    <p className="text-green-400 font-black text-xl">92%</p>
                                </div>
                                <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Total Absences</p>
                                    <p className="text-red-400 font-black text-xl">4</p>
                                </div>
                            </div>
                        </div>
                        <div className="glass-dark rounded-[2rem] border border-white/5 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-4">Date</th>
                                        <th className="px-8 py-4">Status</th>
                                        <th className="px-8 py-4">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr>
                                        <td className="px-8 py-4 text-slate-400 text-xs">Dec 28, 2025</td>
                                        <td className="px-8 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-green-400/10 text-green-400">Present</span></td>
                                        <td className="px-8 py-4 text-slate-500 text-xs italic">On time</td>
                                    </tr>
                                    <tr>
                                        <td className="px-8 py-4 text-slate-400 text-xs">Dec 27, 2025</td>
                                        <td className="px-8 py-4"><span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-400/10 text-red-400">Absent</span></td>
                                        <td className="px-8 py-4 text-slate-500 text-xs italic">Medical leave requested</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'documents' && (
                    <div className="lg:col-span-3 space-y-6 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Student Documents</h3>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm">+ Upload New</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                { name: 'Admission Form', size: '1.2 MB', date: 'Oct 12, 2025' },
                                { name: 'Birth Certificate', size: '850 KB', date: 'Oct 12, 2025' },
                                { name: 'Previous Result', size: '2.4 MB', date: 'Nov 05, 2025' },
                            ].map((doc, i) => (
                                <div key={i} className="glass-dark p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition group flex justify-between items-center">
                                    <div>
                                        <p className="text-white font-bold">{doc.name}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">{doc.size} • {doc.date}</p>
                                    </div>
                                    <button className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center grayscale group-hover:grayscale-0 transition">📥</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'idcard' && (
                    <div className="lg:col-span-3 flex flex-col items-center py-10 animate-in zoom-in duration-300 gap-8">
                        <div ref={idCardRef} className="w-[350px] h-[520px] bg-[#020617] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col items-center shadow-2xl relative">
                            {/* Premium Design Elements */}
                            <div className="absolute top-0 w-full h-40 bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#1e1b4b] -skew-y-6 -translate-y-12"></div>

                            {/* School Brand Header */}
                            <div className="absolute top-6 left-8 z-20 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg overflow-hidden">
                                    {tenant?.config?.logoUrl ? (
                                        <img src={tenant.config.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white font-black text-xl italic">{tenant?.name?.charAt(0) || 'S'}</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-xs tracking-widest uppercase">
                                        {tenant?.name || 'SchoolOS'}
                                    </span>
                                    <span className="text-white/60 font-medium text-[7px] tracking-widest uppercase -mt-0.5">Official Student ID</span>
                                </div>
                            </div>

                            <div className="absolute top-4 right-6 z-20">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></div>
                                    <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Official</span>
                                </div>
                            </div>

                            <div className="z-10 mt-14 mb-8">
                                <div className="w-32 h-32 rounded-[2.5rem] bg-[#0f172a] border-4 border-[#020617] flex items-center justify-center text-5xl font-black text-white shadow-2xl relative group overflow-hidden">
                                    <div className="absolute inset-0 bg-[#4f46e5]/20 group-hover:bg-[#4f46e5]/30 transition-colors"></div>
                                    <span className="relative z-10">{student.firstName.charAt(0)}</span>
                                </div>
                            </div>

                            <div className="z-10 text-center px-8 w-full">
                                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{student.firstName} {student.lastName}</h2>
                                <p className="text-[#818cf8] font-black uppercase tracking-[0.2em] text-[10px] my-2 bg-[#818cf8]/10 inline-block px-3 py-1 rounded-full border border-[#818cf8]/20">Student ID Card</p>

                                <div className="mt-10 space-y-6 w-full">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col items-center border-r border-white/5">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Student ID</p>
                                            <p className="text-white font-mono text-xs font-bold">{student.profile?.studentId || 'N/A'}</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Adm No</p>
                                            <p className="text-white font-mono text-xs font-bold">{student.profile?.admissionNo || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-4">
                                        <div className="border-r border-white/5 text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Grade</p>
                                            <p className="text-white text-[10px] font-black">{student.profile?.class}</p>
                                        </div>
                                        <div className="border-r border-white/5 text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Sec</p>
                                            <p className="text-white text-[10px] font-black uppercase">{student.profile?.section}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[7px] text-[#64748b] uppercase font-black tracking-widest mb-1">Roll</p>
                                            <p className="text-white text-[10px] font-black">{student.profile?.rollNo || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex flex-col items-center gap-3">
                                        <div className="w-24 h-24 bg-white p-2.5 rounded-2xl shadow-inner flex items-center justify-center relative overflow-hidden group border border-slate-200">
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-[#4f46e5]"></div>
                                            {/* Minimal Barcode Pattern */}
                                            <div className="w-full h-full flex gap-1 items-end justify-center">
                                                {[3, 6, 4, 8, 5, 7, 4, 6, 3, 5].map((h, i) => (
                                                    <div key={i} className={`w-1 bg-[#020617] rounded-full`} style={{ height: `${h * 10}%` }}></div>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-[8px] font-mono text-[#64748b] tracking-[0.3em]">{Date.now().toString().slice(-10)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-6 w-full text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <p className="text-[10px] font-black text-[#94a3b8] tracking-[0.2em] uppercase">Contact: {student.profile?.phone || 'N/A'}</p>
                                </div>
                                <p className="text-[7px] text-[#475569] font-medium">Valid until academic year 2025-26</p>
                            </div>
                        </div>

                        <button
                            onClick={downloadIDCard}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95"
                        >
                            <span></span>
                            Download PDF Version
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
