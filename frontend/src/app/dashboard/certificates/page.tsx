"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function CertificatesPage() {
    const [user, setUser] = useState<any>(null);
    const [view, setView] = useState('list'); // 'list', 'issue'
    const [certificates, setCertificates] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [previewCert, setPreviewCert] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [topPerformers, setTopPerformers] = useState<any[]>([]);
    const [fetchingTops, setFetchingTops] = useState(false);
    const [editingCert, setEditingCert] = useState<any>(null);

    // Form State
    const initialForm = {
        studentId: '',
        certificateType: 'Academic Excellence',
        title: '',
        description: '',
        metadata: {
            grade: '',
            academicYear: '2025-26',
            rank: '',
            score: '',
            examType: '',
            schoolName: '',
            schoolLogo: ''
        }
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const userData = JSON.parse(userStr);
            setUser(userData);
        }

        const fetchData = async () => {
            try {
                const userStr = localStorage.getItem('user');
                const userData = userStr ? JSON.parse(userStr) : null;

                let certUrl = '/certificates';
                if (userData?.role === 'student') certUrl = '/certificates/my';

                const [certRes, stuRes, examRes, classRes] = await Promise.all([
                    api.get(certUrl),
                    userData?.role !== 'student' ? api.get('/students') : Promise.resolve({ data: { data: [] } }),
                    userData?.role !== 'student' ? api.get('/exams') : Promise.resolve({ data: { data: [] } }),
                    userData?.role !== 'student' ? api.get('/classes') : Promise.resolve({ data: { data: [] } })
                ]);

                setCertificates(certRes.data.data.certificates || certRes.data.data.results || []);
                setStudents(stuRes.data.data || []);
                setExams(examRes.data.data || []);
                setClasses(classRes.data.data || []);
            } catch (err) {
                console.error("Fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchTopPerformers = async () => {
        if (!selectedExam || !selectedClass) {
            alert("Please select both Exam and Class");
            return;
        }
        setFetchingTops(true);
        try {
            const { data } = await api.get(`/exams/top-performers/${selectedExam}/${selectedClass}`);
            setTopPerformers(data.data);
            if (data.data.length === 0) {
                alert("No marks found for this exam and class.");
            }
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to fetch top performers");
        } finally {
            setFetchingTops(false);
        }
    };

    const handleApplyTopPerformer = (tp: any) => {
        const exam = exams.find(e => e._id === selectedExam);
        setForm({
            ...form,
            studentId: tp.student._id,
            title: `Certificate of Academic Excellence - Rank ${tp.rank}`,
            description: `This certificate is awarded to ${tp.student.firstName} ${tp.student.lastName} for achieving Rank ${tp.rank} in the ${exam?.name || 'Academic'} examination with a total score of ${tp.totalObtained}/${tp.totalMax} (${tp.percentage.toFixed(2)}%).`,
            metadata: {
                ...form.metadata,
                rank: tp.rank.toString(),
                score: `${tp.percentage.toFixed(2)}%`,
                examType: exam?.term || '' // Use term as exam type
            }
        });
    };

    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIssuing(true);
        try {
            if (editingCert) {
                await api.patch(`/certificates/${editingCert._id}`, form);
                alert("Certificate updated successfully!");
            } else {
                await api.post('/certificates', form);
                alert("Certificate issued successfully!");
            }
            setView('list');
            setEditingCert(null);
            setForm(initialForm);
            // Refresh list
            const userStr = localStorage.getItem('user');
            const userData = userStr ? JSON.parse(userStr) : null;
            let certUrl = '/certificates';
            if (userData?.role === 'student') certUrl = '/certificates/my';
            const { data } = await api.get(certUrl);
            setCertificates(data.data.certificates || data.data.results || []);
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to process certificate");
        } finally {
            setIssuing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this certificate?")) return;
        try {
            await api.delete(`/certificates/${id}`);
            setCertificates(prev => prev.filter(c => c._id !== id));
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to delete certificate");
        }
    };

    const handleEdit = (cert: any) => {
        setEditingCert(cert);
        setForm({
            studentId: cert.student?._id || cert.student,
            certificateType: cert.certificateType,
            title: cert.title,
            description: cert.description || '',
            metadata: {
                grade: cert.metadata?.grade || '',
                academicYear: cert.metadata?.academicYear || '2025-26',
                rank: cert.metadata?.rank || '',
                score: cert.metadata?.score || '',
                examType: cert.metadata?.examType || '',
                schoolName: cert.metadata?.schoolName || '',
                schoolLogo: cert.metadata?.schoolLogo || ''
            }
        });
        setView('issue');
    };

    const downloadPDF = async (cert: any) => {
        setDownloading(cert._id);

        // Create a temporary container for height-quality rendering
        const element = document.createElement('div');
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '1122px'; // A4 Landscape width in pixels at standard DPI
        element.style.height = '793px'; // A4 Landscape height
        element.style.zIndex = '-9999';
        element.style.overflow = 'hidden';
        element.style.visibility = 'visible';
        element.style.background = '#FFFFFF';
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
        element.style.fontFamily = "'Times New Roman', serif";

        const issueDate = new Date(cert.issueDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        element.innerHTML = `
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Great+Vibes&family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap');
                .cert-container {
                    width: 100%;
                    height: 100%;
                    padding: 40px;
                    background-color: #fdfbf7;
                    position: relative;
                    box-sizing: border-box;
                    border: 2px solid #D4AF37;
                }
                .outer-border {
                    border: 15px solid #D4AF37;
                    height: 100%;
                    width: 100%;
                    position: relative;
                    padding: 20px;
                    box-sizing: border-box;
                }
                .inner-border {
                    border: 2px solid #D4AF37;
                    height: 100%;
                    width: 100%;
                    padding: 40px;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                .corner {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    border: 5px solid #D4AF37;
                }
                .corner-tl { top: -5px; left: -5px; border-right: none; border-bottom: none; }
                .corner-tr { top: -5px; right: -5px; border-left: none; border-bottom: none; }
                .corner-bl { bottom: -5px; left: -5px; border-right: none; border-top: none; }
                .corner-br { bottom: -5px; right: -5px; border-left: none; border-top: none; }
                
                .header-title {
                    font-family: 'Cinzel', serif;
                    font-size: 54px;
                    color: #0c2340;
                    margin-top: 40px;
                    text-transform: uppercase;
                    letter-spacing: 4px;
                    font-weight: 700;
                }
                .sub-header {
                    font-family: 'Cinzel', serif;
                    font-size: 24px;
                    color: #D4AF37;
                    margin-top: 10px;
                    letter-spacing: 10px;
                    text-transform: uppercase;
                }
                .separator {
                    width: 400px;
                    height: 2px;
                    background: linear-gradient(to right, transparent, #D4AF37, transparent);
                    margin: 40px 0;
                }
                .presentation {
                    font-family: 'EB Garamond', serif;
                    font-style: italic;
                    font-size: 22px;
                    color: #4a5568;
                    margin-bottom: 20px;
                }
                .student-name {
                    font-family: 'Great Vibes', cursive;
                    font-size: 72px;
                    color: #0c2340;
                    margin-bottom: 20px;
                }
                .description {
                    font-family: 'EB Garamond', serif;
                    font-size: 18px;
                    color: #4a5568;
                    max-width: 800px;
                    line-height: 1.6;
                    margin-bottom: 40px;
                }
                .metadata-text {
                    font-family: 'Cinzel', serif;
                    font-size: 16px;
                    color: #0c2340;
                    font-weight: bold;
                    margin-bottom: 40px;
                    text-transform: uppercase;
                }
                .footer {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-top: auto;
                    padding: 0 40px 40px 40px;
                }
                .signature-box {
                    width: 250px;
                    text-align: center;
                }
                .sig-line {
                    border-top: 1px solid #D4AF37;
                    margin-bottom: 10px;
                }
                .sig-label {
                    font-family: 'Cinzel', serif;
                    font-size: 12px;
                    color: #0c2340;
                    letter-spacing: 2px;
                }
                .seal {
                    width: 150px;
                    height: 150px;
                    position: relative;
                }
            </style>
            <div class="cert-container">
                <div class="outer-border">
                    <div class="corner corner-tl"></div>
                    <div class="corner corner-tr"></div>
                    <div class="corner corner-bl"></div>
                    <div class="corner corner-br"></div>
                    
                    <div class="inner-border">
                        ${cert.metadata?.schoolLogo ? `<img src="${cert.metadata.schoolLogo}" style="width: 80px; height: 80px; margin-bottom: 10px; object-fit: contain; display: block;" />` : ''}
                        ${cert.metadata?.schoolName ? `<div style="font-family: 'Cinzel', serif; font-size: 28px; color: #0c2340; font-weight: bold; margin-bottom: 20px; text-transform: uppercase;">${cert.metadata.schoolName}</div>` : ''}
                        <div class="header-title">Certificate of</div>
                        <div class="sub-header">${cert.certificateType.toUpperCase()}</div>
                        
                        <div class="separator"></div>
                        
                        <div class="presentation">This certificate is proudly presented to</div>
                        <div class="student-name">${cert.student?.firstName || ''} ${cert.student?.lastName || ''}</div>
                        
                        <div class="description">
                            ${cert.description || `In recognition of achieving outstanding results and demonstrating exemplary dedication during the academic period at our institution. We commend the recipient for their hard work and excellence.`}
                        </div>
                        
                        <div class="metadata-text">
                            ${cert.metadata?.examType ? `${cert.metadata.examType.toUpperCase()} EXAMINATION<br/>` : ''}
                            DATE OF ISSUE: ${issueDate} <br/>
                            ID: ${cert.certificateNumber}
                        </div>
                        
                        <div class="footer">
                            <div class="signature-box">
                                <div class="sig-line"></div>
                                <div class="sig-label">PRINCIPAL</div>
                            </div>
                            
                            <div class="seal">
                                <svg width="150" height="150" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="#D4AF37" stroke="#8E731F" stroke-width="2" />
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" stroke-width="0.5" stroke-dasharray="1,1" />
                                    <path d="M50 20 L25 35 L50 50 L75 35 Z" fill="#0c2340"/>
                                    <path d="M75 35 L75 55" stroke="#0c2340" stroke-width="2"/>
                                    <circle cx="75" cy="55" r="3" fill="#0c2340"/>
                                    <text x="50" y="80" font-family="Cinzel" font-size="8" text-anchor="middle" fill="#0c2340" font-weight="bold">OFFICIAL SEAL</text>
                                </svg>
                            </div>
                            
                            <div class="signature-box">
                                <div class="sig-line"></div>
                                <div class="sig-label">DIRECTOR</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(element);

        // Wait significantly for styles and images to render
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const canvas = await html2canvas(element, {
                scale: 3, // Even higher resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true
            });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`${cert.student?.firstName}_${cert.student?.lastName}_Certificate.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setDownloading(null);
            if (document.body.contains(element)) {
                document.body.removeChild(element);
            }
        }
    };

    const isStaff = user && ['school-admin', 'teacher'].includes(user.role);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Digital Certificates</h1>
                    <p className="text-slate-500 mt-1">Manage and track student achievements and credentials.</p>
                </div>
                {isStaff && (
                    <button
                        onClick={() => {
                            if (view === 'issue') {
                                setView('list');
                                setEditingCert(null);
                                setForm(initialForm);
                            } else {
                                setView('issue');
                            }
                        }}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        {view === 'list' ? '+ Issue Certificate' : 'View All'}
                    </button>
                )}
            </div>

            {view === 'issue' && isStaff ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* Top Performers Assistant */}
                    <div className="glass-dark p-8 rounded-[2rem] border border-white/5 bg-indigo-500/5">
                        <div className="flex flex-col md:flex-row items-end gap-6">
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Rank Assistant: Select Exam</label>
                                <select
                                    value={selectedExam}
                                    onChange={e => setSelectedExam(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                                >
                                    <option value="">Select Exam...</option>
                                    {exams.map(e => (
                                        <option key={e._id} value={e._id}>{e.name} ({e.term})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Select Class</label>
                                <select
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm"
                                >
                                    <option value="">Select Class...</option>
                                    {classes.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} {c.section}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={fetchTopPerformers}
                                disabled={fetchingTops}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                            >
                                {fetchingTops ? 'Finding...' : 'Find Top 3'}
                            </button>
                        </div>

                        {topPerformers.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-in slide-in-from-top-2">
                                {topPerformers.map((tp, idx) => (
                                    <button
                                        key={tp.student._id}
                                        type="button"
                                        onClick={() => handleApplyTopPerformer(tp)}
                                        className="p-4 bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-2xl text-left transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xl">
                                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                            </span>
                                            <span className="text-[10px] font-black text-indigo-400 uppercase">Rank {tp.rank}</span>
                                        </div>
                                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {tp.student.firstName} {tp.student.lastName}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-1">Score: {tp.percentage.toFixed(2)}%</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-dark p-10 rounded-[3rem] border border-white/5">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-white">{editingCert ? 'Edit Certificate' : 'Issue New Certificate'}</h2>
                            <p className="text-slate-500 text-sm mt-1">{editingCert ? 'Modify the details of this issued credential.' : 'Create a new digital credential for a student.'}</p>
                        </div>
                        <form onSubmit={handleIssue} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 space-y-4 border-b border-white/5 pb-8">
                                <h3 className="text-lg font-bold text-white mb-4">School Administration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">School Name</label>
                                        <input
                                            value={form.metadata.schoolName}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, schoolName: e.target.value } })}
                                            placeholder="e.g. Springfield High School"
                                            className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">School Logo</label>
                                        <div className="flex items-center gap-4">
                                            {form.metadata.schoolLogo && (
                                                <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center">
                                                    <img src={form.metadata.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setForm({ ...form, metadata: { ...form.metadata, schoolLogo: reader.result as string } })
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full px-5 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Student</label>
                                    <select
                                        value={form.studentId}
                                        onChange={e => setForm({ ...form, studentId: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        required
                                    >
                                        <option value="">Select Student...</option>
                                        {students.map(s => (
                                            <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.profile?.admissionNumber})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Certificate Type</label>
                                    <select
                                        value={form.certificateType}
                                        onChange={e => setForm({ ...form, certificateType: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    >
                                        <option>Academic Excellence</option>
                                        <option>Perfect Attendance</option>
                                        <option>Course Completion</option>
                                        <option>Sports Achievement</option>
                                        <option>Extra-Curricular</option>
                                        <option>Graduation</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Title</label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Highest Achievement in Mathematics"
                                        className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 h-32"
                                        placeholder="Details about the achievement..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Year</label>
                                        <input
                                            value={form.metadata.academicYear}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, academicYear: e.target.value } })}
                                            className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rank/Order</label>
                                        <input
                                            value={form.metadata.rank}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, rank: e.target.value } })}
                                            placeholder="e.g. 1"
                                            className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Score/Grade</label>
                                        <input
                                            value={form.metadata.score}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, score: e.target.value } })}
                                            className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2 ">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exam Type</label>
                                        <select
                                            value={form.metadata.examType}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, examType: e.target.value } })}
                                            className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30"
                                        >
                                            <option value="">N/A</option>
                                            <option value="Monthly">Monthly Exam</option>
                                            <option value="Mid-term">Mid-term Exam</option>
                                            <option value="Final">Final Exam</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={issuing}
                                    className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                                >
                                    {issuing ? 'Processing...' : (editingCert ? 'Update Certificate' : 'Issue Digital Certificate')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {loading ? (
                        <div className="py-24 text-center text-slate-600 font-bold tracking-widest uppercase text-xs animate-pulse font-mono">Loading Credentials Pool...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {certificates.length > 0 ? certificates.map((cert: any) => (
                                <div key={cert._id} className="glass-dark p-8 rounded-[3rem] border border-white/5 relative group hover:border-white/10 transition-all overflow-hidden">
                                    {/* Background Stamp */}
                                    <div className="absolute top-4 right-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none select-none z-0">
                                        <span className="text-4xl">🏆</span>
                                    </div>

                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl text-indigo-400">📜</div>
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${cert.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {cert.status}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-black text-white mb-1">{cert.title}</h3>
                                    <div className="flex items-center gap-2 mb-4">
                                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{cert.certificateType}</p>
                                        {cert.metadata?.examType && (
                                            <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-500 text-[9px] font-bold uppercase tracking-tight">
                                                {cert.metadata.examType}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                {cert.student?.firstName?.charAt(0)}{cert.student?.lastName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-300 font-bold">{cert.student?.firstName} {cert.student?.lastName}</p>
                                                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-tighter">Issue: {new Date(cert.issueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                                            <p className="text-[9px] text-slate-500 font-black uppercase mb-10">Verification Number</p>
                                            <p className="text-xs font-mono font-bold text-slate-300">{cert.certificateNumber}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-auto relative z-10">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPreviewCert(cert)}
                                                className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-indigo-600/20 text-slate-700 dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/5 hover:border-indigo-500/30"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => downloadPDF(cert)}
                                                disabled={downloading === cert._id}
                                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
                                            >
                                                {downloading === cert._id ? 'Generating...' : 'Download PDF'}
                                            </button>
                                        </div>
                                        {isStaff && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(cert)}
                                                    className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-amber-500/20"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cert._id)}
                                                    className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-red-500/20"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-24 text-center glass-dark rounded-[3.5rem] border border-white/5 border-dashed">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl opacity-30">📭</div>
                                    <p className="text-slate-500 text-lg font-medium">No certificates have been issued yet.</p>
                                    {isStaff && (
                                        <button onClick={() => setView('issue')} className="mt-4 text-indigo-400 text-sm font-black uppercase tracking-widest hover:text-indigo-300">Commence Issuance</button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            {/* Preview Modal */}
            {previewCert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                    <div className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 my-8">
                        <button
                            onClick={() => setPreviewCert(null)}
                            className="absolute top-6 right-6 z-10 w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center text-black transition-colors"
                        >
                            ✕
                        </button>

                        <div className="p-4 md:p-12 overflow-x-auto">
                            <div className="aspect-[1.414/1] w-[800px] md:w-full mx-auto bg-[#fdfbf7] relative border-[1px] border-[#D4AF37] p-1 md:p-4 box-border shadow-inner">
                                <div className="border-[5px] md:border-[15px] border-[#D4AF37] h-full w-full relative p-1 md:p-6 box-border font-serif overflow-hidden">
                                    {/* Corners */}
                                    <div className="absolute top-[-5px] left-[-5px] w-8 h-8 md:w-12 md:h-12 border-t-[3px] md:border-t-[5px] border-l-[3px] md:border-l-[5px] border-[#D4AF37]"></div>
                                    <div className="absolute top-[-5px] right-[-5px] w-8 h-8 md:w-12 md:h-12 border-t-[3px] md:border-t-[5px] border-r-[3px] md:border-r-[5px] border-[#D4AF37]"></div>
                                    <div className="absolute bottom-[-5px] left-[-5px] w-8 h-8 md:w-12 md:h-12 border-b-[3px] md:border-b-[5px] border-l-[3px] md:border-l-[5px] border-[#D4AF37]"></div>
                                    <div className="absolute bottom-[-5px] right-[-5px] w-8 h-8 md:w-12 md:h-12 border-b-[3px] md:border-b-[5px] border-r-[3px] md:border-r-[5px] border-[#D4AF37]"></div>

                                    <div className="border-[1px] md:border-[2px] border-[#D4AF37] h-full w-full p-2 md:p-10 box-border flex flex-col items-center text-center">
                                        {previewCert.metadata?.schoolLogo && (
                                            <img
                                                src={previewCert.metadata.schoolLogo}
                                                alt="School Logo"
                                                className="w-16 h-16 md:w-24 md:h-24 object-contain mb-2 md:mb-4"
                                            />
                                        )}
                                        {previewCert.metadata?.schoolName && (
                                            <div className="font-serif text-lg md:text-3xl text-[#0c2340] font-bold uppercase tracking-widest mb-2 md:mb-4">
                                                {previewCert.metadata.schoolName}
                                            </div>
                                        )}
                                        <h1 className="font-serif text-xl md:text-5xl lg:text-6xl text-[#0c2340] mt-2 md:mt-4 tracking-[1px] md:tracking-[4px] uppercase font-bold">Certificate of</h1>
                                        <h2 className="font-serif text-xs md:text-2xl text-[#D4AF37] mt-1 md:mt-2 tracking-[3px] md:tracking-[10px] uppercase">{previewCert.certificateType}</h2>

                                        <div className="w-24 md:w-96 h-[1px] md:h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-2 md:my-10"></div>

                                        <p className="italic text-[10px] md:text-xl text-slate-600 mb-1 md:mb-6" style={{ fontFamily: "'EB Garamond', serif" }}>This certificate is proudly presented to</p>
                                        <h3 className="text-2xl md:text-6xl lg:text-8xl text-[#0c2340] mb-2 md:mb-8" style={{ fontFamily: "'Great Vibes', cursive" }}>{previewCert.student?.firstName} {previewCert.student?.lastName}</h3>

                                        <p className="text-[9px] md:text-lg text-slate-600 max-w-2xl leading-tight md:leading-relaxed mb-3 md:mb-12" style={{ fontFamily: "'EB Garamond', serif" }}>
                                            {previewCert.description || "In recognition of achieving outstanding results and demonstrating exemplary dedication during the academic period at our institution. We commend the recipient for their hard work and excellence."}
                                        </p>

                                        <div className="text-[8px] md:text-sm font-serif font-bold text-[#0c2340] mb-2 md:mb-6 uppercase tracking-widest">
                                            {previewCert.metadata?.examType && <span>{previewCert.metadata.examType} Examination &nbsp; | &nbsp; </span>}
                                            DATE OF ISSUE: {new Date(previewCert.issueDate).toLocaleDateString()} &nbsp; | &nbsp; ID: {previewCert.certificateNumber}
                                        </div>

                                        <div className="w-full flex justify-between items-end mt-auto px-1 md:px-10 pb-1 md:pb-6">
                                            <div className="w-16 md:w-60 text-center">
                                                <div className="border-t border-[#D4AF37] mb-1 md:mb-2"></div>
                                                <span className="text-[5px] md:text-xs font-serif tracking-widest text-[#0c2340]">PRINCIPAL</span>
                                            </div>

                                            <div className="w-8 h-8 md:w-24 md:h-24 relative mb-[-4px] md:mb-0">
                                                <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4AF37]">
                                                    <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.1" />
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
                                                    <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                                                    <path d="M50 25 L30 40 L50 55 L70 40 Z" fill="#0c2340" />
                                                    <path d="M70 40 L70 60" stroke="#0c2340" strokeWidth="2" />
                                                    <circle cx="70" cy="60" r="3" fill="#0c2340" />
                                                    <text x="50" y="82" fontFamily="serif" fontSize="7" textAnchor="middle" fill="#0c2340" fontWeight="bold">OFFICIAL SEAL</text>
                                                </svg>
                                            </div>

                                            <div className="w-16 md:w-60 text-center">
                                                <div className="border-t border-[#D4AF37] mb-1 md:mb-2"></div>
                                                <span className="text-[5px] md:text-xs font-serif tracking-widest text-[#0c2340]">DIRECTOR</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex justify-center gap-4 relative z-20">
                                <button
                                    onClick={() => setPreviewCert(null)}
                                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        downloadPDF(previewCert);
                                        setPreviewCert(null);
                                    }}
                                    disabled={downloading === previewCert._id}
                                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {downloading === previewCert._id ? 'Generating...' : (
                                        <>
                                            <span>Download PDF</span>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
