"use client";
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Search, ZoomIn, ZoomOut, Edit3, Printer, Calendar, ChevronDown } from 'lucide-react';

const TEMPLATES = [
  { id: 'transfer', name: 'Transfer Certificate (TC)', icon: '📄', type: 'Course Completion' },
  { id: 'excellence', name: 'Excellence Award', icon: '🏆', type: 'Academic Excellence' },
  { id: 'student-id', name: 'Student ID Card', icon: '🪪', type: 'Graduation' },
  { id: 'character', name: 'Character Certificate', icon: '⭐', type: 'Extra-Curricular' },
  { id: 'report', name: 'Report Card', icon: '📊', type: 'Perfect Attendance' },
];

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
    const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
    const [zoom, setZoom] = useState(1);
    const [issueDate, setIssueDate] = useState('');
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');

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
                examType: exam?.term || ''
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
            setShowIssueModal(false);
            setEditingCert(null);
            setForm(initialForm);
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
        setShowIssueModal(true);
    };


    const downloadPDF = async (cert: any) => {
        setDownloading(cert._id);

        const element = document.createElement('div');
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '1122px';
        element.style.height = '793px';
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
                .cert-container { width:100%;height:100%;padding:40px;background-color:#fdfbf7;position:relative;box-sizing:border-box;border:2px solid #D4AF37; }
                .outer-border { border:15px solid #D4AF37;height:100%;width:100%;position:relative;padding:20px;box-sizing:border-box; }
                .inner-border { border:2px solid #D4AF37;height:100%;width:100%;padding:40px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;text-align:center; }
                .corner { position:absolute;width:100px;height:100px;border:5px solid #D4AF37; }
                .corner-tl { top:-5px;left:-5px;border-right:none;border-bottom:none; }
                .corner-tr { top:-5px;right:-5px;border-left:none;border-bottom:none; }
                .corner-bl { bottom:-5px;left:-5px;border-right:none;border-top:none; }
                .corner-br { bottom:-5px;right:-5px;border-left:none;border-top:none; }
                .header-title { font-family:'Cinzel',serif;font-size:54px;color:#0c2340;margin-top:40px;text-transform:uppercase;letter-spacing:4px;font-weight:700; }
                .sub-header { font-family:'Cinzel',serif;font-size:24px;color:#D4AF37;margin-top:10px;letter-spacing:10px;text-transform:uppercase; }
                .separator { width:400px;height:2px;background:linear-gradient(to right,transparent,#D4AF37,transparent);margin:40px 0; }
                .presentation { font-family:'EB Garamond',serif;font-style:italic;font-size:22px;color:#4a5568;margin-bottom:20px; }
                .student-name { font-family:'Great Vibes',cursive;font-size:72px;color:#0c2340;margin-bottom:20px; }
                .description { font-family:'EB Garamond',serif;font-size:18px;color:#4a5568;max-width:800px;line-height:1.6;margin-bottom:40px; }
                .metadata-text { font-family:'Cinzel',serif;font-size:16px;color:#0c2340;font-weight:bold;margin-bottom:40px;text-transform:uppercase; }
                .footer { width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding:0 40px 40px 40px; }
                .signature-box { width:250px;text-align:center; }
                .sig-line { border-top:1px solid #D4AF37;margin-bottom:10px; }
                .sig-label { font-family:'Cinzel',serif;font-size:12px;color:#0c2340;letter-spacing:2px; }
            </style>
            <div class="cert-container">
                <div class="outer-border">
                    <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
                    <div class="corner corner-bl"></div><div class="corner corner-br"></div>
                    <div class="inner-border">
                        ${cert.metadata?.schoolLogo ? `<img src="${cert.metadata.schoolLogo}" style="width:80px;height:80px;margin-bottom:10px;object-fit:contain;display:block;" />` : ''}
                        ${cert.metadata?.schoolName ? `<div style="font-family:'Cinzel',serif;font-size:28px;color:#0c2340;font-weight:bold;margin-bottom:20px;text-transform:uppercase;">${cert.metadata.schoolName}</div>` : ''}
                        <div class="header-title">Certificate of</div>
                        <div class="sub-header">${cert.certificateType.toUpperCase()}</div>
                        <div class="separator"></div>
                        <div class="presentation">This certificate is proudly presented to</div>
                        <div class="student-name">${cert.student?.firstName || ''} ${cert.student?.lastName || ''}</div>
                        <div class="description">${cert.description || 'In recognition of achieving outstanding results and demonstrating exemplary dedication during the academic period at our institution.'}</div>
                        <div class="metadata-text">
                            ${cert.metadata?.examType ? `${cert.metadata.examType.toUpperCase()} EXAMINATION<br/>` : ''}
                            DATE OF ISSUE: ${issueDate} <br/>
                            ID: ${cert.certificateNumber}
                        </div>
                        <div class="footer">
                            <div class="signature-box"><div class="sig-line"></div><div class="sig-label">PRINCIPAL</div></div>
                            <div style="width:150px;height:150px;">
                                <svg width="150" height="150" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="#D4AF37" stroke="#8E731F" stroke-width="2" />
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#FFFFFF" stroke-width="0.5" stroke-dasharray="1,1" />
                                    <path d="M50 20 L25 35 L50 50 L75 35 Z" fill="#0c2340"/>
                                    <path d="M75 35 L75 55" stroke="#0c2340" stroke-width="2"/>
                                    <circle cx="75" cy="55" r="3" fill="#0c2340"/>
                                    <text x="50" y="80" font-family="Cinzel" font-size="8" text-anchor="middle" fill="#0c2340" font-weight="bold">OFFICIAL SEAL</text>
                                </svg>
                            </div>
                            <div class="signature-box"><div class="sig-line"></div><div class="sig-label">DIRECTOR</div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(element);
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                allowTaint: true
            });
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`${cert.student?.firstName}_${cert.student?.lastName}_Certificate.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setDownloading(null);
            if (document.body.contains(element)) document.body.removeChild(element);
        }
    };

    const isStaff = user && ['school-admin', 'teacher'].includes(user.role);

    const selectedStudent = students.find(s => s._id === form.studentId);

    const filteredTemplates = TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );


    // Inline certificate preview component
    const CertificatePreviewComponent = ({ cert, zoom: zoomLevel }: { cert: any; zoom: number }) => {
        const studentName = cert.student
            ? `${cert.student.firstName || ''} ${cert.student.lastName || ''}`.trim()
            : (selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '[Student Name]');
        const certType = cert.certificateType || selectedTemplate?.type || 'Academic Excellence';
        const description = cert.description || 'In recognition of achieving outstanding results and demonstrating exemplary dedication during the academic period at our institution.';
        const certDate = cert.issueDate
            ? new Date(cert.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : (issueDate ? new Date(issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '[Date]');
        const certNumber = cert.certificateNumber || 'PREVIEW';

        return (
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s' }}>
                <div className="w-[700px] h-[495px] bg-[#fdfbf7] relative border border-[#D4AF37] p-1 shadow-2xl">
                    <div className="border-[8px] border-[#D4AF37] h-full w-full relative p-3 box-border font-serif overflow-hidden">
                        {/* Corners */}
                        <div className="absolute top-[-4px] left-[-4px] w-8 h-8 border-t-[3px] border-l-[3px] border-[#D4AF37]"></div>
                        <div className="absolute top-[-4px] right-[-4px] w-8 h-8 border-t-[3px] border-r-[3px] border-[#D4AF37]"></div>
                        <div className="absolute bottom-[-4px] left-[-4px] w-8 h-8 border-b-[3px] border-l-[3px] border-[#D4AF37]"></div>
                        <div className="absolute bottom-[-4px] right-[-4px] w-8 h-8 border-b-[3px] border-r-[3px] border-[#D4AF37]"></div>
                        <div className="border border-[#D4AF37] h-full w-full p-4 box-border flex flex-col items-center text-center overflow-hidden">
                            {cert.metadata?.schoolLogo && (
                                <img src={cert.metadata.schoolLogo} alt="Logo" className="w-10 h-10 object-contain mb-1" />
                            )}
                            {cert.metadata?.schoolName && (
                                <div className="font-serif text-sm text-[#0c2340] font-bold uppercase tracking-widest mb-1">
                                    {cert.metadata.schoolName}
                                </div>
                            )}
                            <h1 className="font-serif text-2xl text-[#0c2340] mt-1 tracking-[3px] uppercase font-bold">Certificate of</h1>
                            <h2 className="font-serif text-xs text-[#D4AF37] mt-0.5 tracking-[6px] uppercase">{certType}</h2>
                            <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-2"></div>
                            <p className="italic text-[10px] text-slate-600 mb-1">This certificate is proudly presented to</p>
                            <h3 className="text-3xl text-[#0c2340] mb-1" style={{ fontFamily: "'Great Vibes', cursive, serif" }}>{studentName}</h3>
                            <p className="text-[9px] text-slate-600 max-w-lg leading-snug mb-2">{description}</p>
                            <div className="text-[8px] font-serif font-bold text-[#0c2340] mb-2 uppercase tracking-widest">
                                {cert.metadata?.examType && <span>{cert.metadata.examType} Examination &nbsp;|&nbsp; </span>}
                                DATE OF ISSUE: {certDate} &nbsp;|&nbsp; ID: {certNumber}
                            </div>
                            <div className="w-full flex justify-between items-end mt-auto px-6 pb-2">
                                <div className="w-32 text-center">
                                    <div className="border-t border-[#D4AF37] mb-1"></div>
                                    <span className="text-[8px] font-serif tracking-widest text-[#0c2340]">PRINCIPAL</span>
                                </div>
                                <div className="w-14 h-14">
                                    <svg viewBox="0 0 100 100" className="w-full h-full text-[#D4AF37]">
                                        <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
                                        <path d="M50 25 L30 40 L50 55 L70 40 Z" fill="#0c2340" />
                                        <text x="50" y="80" fontFamily="serif" fontSize="7" textAnchor="middle" fill="#0c2340" fontWeight="bold">OFFICIAL SEAL</text>
                                    </svg>
                                </div>
                                <div className="w-32 text-center">
                                    <div className="border-t border-[#D4AF37] mb-1"></div>
                                    <span className="text-[8px] font-serif tracking-widest text-[#0c2340]">DIRECTOR</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Build a mock preview cert when template + student selected but no real cert chosen
    const mockPreviewCert = selectedTemplate && (form.studentId || selectedTemplate)
        ? {
            certificateType: selectedTemplate.type,
            title: selectedTemplate.name,
            description: '',
            issueDate: issueDate || null,
            certificateNumber: 'PREVIEW',
            student: selectedStudent || null,
            metadata: { examType: '', schoolName: '', schoolLogo: '' }
          }
        : null;

    const activeCert = previewCert || mockPreviewCert;


    return (
        <div
            className="flex h-full gap-0 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800"
            style={{ minHeight: 'calc(100vh - 120px)' }}
        >
            {/* ── LEFT PANEL ── */}
            <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
                {/* Header */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Certificates &amp; Documents</h2>
                    {isStaff && (
                        <button
                            onClick={() => { setEditingCert(null); setForm(initialForm); setShowIssueModal(true); }}
                            className="text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
                        >
                            + New
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            value={templateSearch}
                            onChange={e => setTemplateSearch(e.target.value)}
                            placeholder="Search templates..."
                            className="bg-transparent text-sm outline-none text-slate-600 dark:text-slate-300 placeholder-slate-400 flex-1"
                        />
                    </div>
                </div>

                {/* Template Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 gap-3">
                        {filteredTemplates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setSelectedTemplate(t); setPreviewCert(null); }}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    selectedTemplate?.id === t.id
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
                                }`}
                            >
                                <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-3xl">
                                    {t.icon}
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 text-center leading-tight">
                                    {t.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Issued Certificates List */}
                    {!loading && certificates.length > 0 && (
                        <div className="mt-5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issued Certificates</p>
                            <div className="space-y-1.5">
                                {certificates.map(cert => (
                                    <button
                                        key={cert._id}
                                        onClick={() => { setPreviewCert(cert); setSelectedTemplate(null); }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                                            previewCert?._id === cert._id
                                                ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                        }`}
                                    >
                                        <span className="text-base">📜</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{cert.title}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{cert.student?.firstName} {cert.student?.lastName}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Form */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Select Student</label>
                        <div className="relative">
                            <select
                                value={form.studentId}
                                onChange={e => setForm({ ...form, studentId: e.target.value })}
                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none appearance-none pr-8"
                            >
                                <option value="">Select student...</option>
                                {students.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.firstName} {s.lastName} - {s.profile?.class?.name || 'N/A'}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Date of Issue</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={issueDate}
                                onChange={e => setIssueDate(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => { if (activeCert && activeCert.certificateNumber !== 'PREVIEW') downloadPDF(activeCert); }}
                        disabled={!activeCert || activeCert.certificateNumber === 'PREVIEW' || downloading !== null}
                        className="w-full py-3 bg-[#1a2744] hover:bg-[#243460] disabled:opacity-40 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                        <Printer className="w-4 h-4" />
                        {downloading ? 'Generating PDF...' : 'Print / Download'}
                    </button>
                </div>
            </div>


            {/* ── RIGHT PANEL - Preview ── */}
            <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950">
                {/* Preview Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-800 dark:text-white">Preview</h2>
                    {previewCert && isStaff && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleEdit(previewCert)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors font-semibold"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(previewCert._id)}
                                className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-semibold"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                    {loading ? (
                        <div className="text-center text-slate-400">
                            <div className="text-5xl mb-4 animate-pulse">📜</div>
                            <p className="text-sm">Loading...</p>
                        </div>
                    ) : activeCert ? (
                        <CertificatePreviewComponent cert={activeCert} zoom={zoom} />
                    ) : (
                        <div className="text-center text-slate-400">
                            <div className="text-6xl mb-4">📜</div>
                            <p className="text-sm">Select a template or issued certificate to preview</p>
                            {!loading && certificates.length === 0 && isStaff && (
                                <button
                                    onClick={() => { setEditingCert(null); setForm(initialForm); setShowIssueModal(true); }}
                                    className="mt-4 text-indigo-500 text-xs font-bold uppercase tracking-widest hover:text-indigo-400 transition-colors"
                                >
                                    Issue First Certificate
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Zoom Toolbar */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                    <button
                        onClick={() => setZoom(z => Math.max(0.3, parseFloat((z - 0.1).toFixed(1))))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ZoomOut className="w-4 h-4" /> Zoom Out
                    </button>
                    <span className="text-xs text-slate-400 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(z => Math.min(2, parseFloat((z + 0.1).toFixed(1))))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <ZoomIn className="w-4 h-4" /> Zoom In
                    </button>
                    <button
                        onClick={() => { setEditingCert(previewCert || null); if (previewCert) { handleEdit(previewCert); } else { setForm(initialForm); setShowIssueModal(true); } }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Details
                    </button>
                </div>
            </div>


            {/* ── ISSUE / EDIT MODAL ── */}
            {showIssueModal && isStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="relative w-full max-w-3xl bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <h3 className="text-xl font-black text-white">{editingCert ? 'Edit Certificate' : 'Issue New Certificate'}</h3>
                            <button
                                onClick={() => { setShowIssueModal(false); setEditingCert(null); setForm(initialForm); }}
                                className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-slate-400 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Top Performers Assistant */}
                            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Rank Assistant</p>
                                <div className="flex flex-col md:flex-row items-end gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Exam</label>
                                        <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm">
                                            <option value="">Select Exam...</option>
                                            {exams.map(e => <option key={e._id} value={e._id}>{e.name} ({e.term})</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Class</label>
                                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm">
                                            <option value="">Select Class...</option>
                                            {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
                                        </select>
                                    </div>
                                    <button type="button" onClick={fetchTopPerformers} disabled={fetchingTops}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                                        {fetchingTops ? 'Finding...' : 'Find Top 3'}
                                    </button>
                                </div>
                                {topPerformers.length > 0 && (
                                    <div className="grid grid-cols-3 gap-3 mt-4">
                                        {topPerformers.map((tp, idx) => (
                                            <button key={tp.student._id} type="button" onClick={() => handleApplyTopPerformer(tp)}
                                                className="p-3 bg-slate-950/50 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-xl text-left transition-all">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase">Rank {tp.rank}</span>
                                                </div>
                                                <p className="text-xs font-bold text-white">{tp.student.firstName} {tp.student.lastName}</p>
                                                <p className="text-[9px] text-slate-500 font-mono">{tp.percentage.toFixed(2)}%</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleIssue} className="space-y-5">
                                {/* School Info */}
                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School Name</label>
                                        <input value={form.metadata.schoolName}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, schoolName: e.target.value } })}
                                            placeholder="e.g. Springfield High School"
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School Logo</label>
                                        <div className="flex items-center gap-3">
                                            {form.metadata.schoolLogo && (
                                                <img src={form.metadata.schoolLogo} alt="Logo" className="w-10 h-10 bg-white rounded-lg p-0.5 object-contain" />
                                            )}
                                            <input type="file" accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setForm({ ...form, metadata: { ...form.metadata, schoolLogo: reader.result as string } });
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white text-xs outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-600 file:text-white" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</label>
                                        <select value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" required>
                                            <option value="">Select Student...</option>
                                            {students.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.profile?.admissionNumber})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Certificate Type</label>
                                        <select value={form.certificateType} onChange={e => setForm({ ...form, certificateType: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm">
                                            <option>Academic Excellence</option>
                                            <option>Perfect Attendance</option>
                                            <option>Course Completion</option>
                                            <option>Sports Achievement</option>
                                            <option>Extra-Curricular</option>
                                            <option>Graduation</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Title</label>
                                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. Highest Achievement in Mathematics"
                                        className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" required />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none h-24 text-sm resize-none"
                                        placeholder="Details about the achievement..." />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Academic Year</label>
                                        <input value={form.metadata.academicYear}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, academicYear: e.target.value } })}
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rank</label>
                                        <input value={form.metadata.rank}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, rank: e.target.value } })}
                                            placeholder="e.g. 1"
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score/Grade</label>
                                        <input value={form.metadata.score}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, score: e.target.value } })}
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exam Type</label>
                                        <select value={form.metadata.examType}
                                            onChange={e => setForm({ ...form, metadata: { ...form.metadata, examType: e.target.value } })}
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-white outline-none text-sm">
                                            <option value="">N/A</option>
                                            <option value="Monthly">Monthly Exam</option>
                                            <option value="Mid-term">Mid-term Exam</option>
                                            <option value="Final">Final Exam</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button type="submit" disabled={issuing}
                                        className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50 text-sm">
                                        {issuing ? 'Processing...' : (editingCert ? 'Update Certificate' : 'Issue Certificate')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
