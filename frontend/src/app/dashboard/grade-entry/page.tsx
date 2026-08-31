"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../utils/api';
import { Save, Loader2, CheckCircle2, Lock, Unlock, Download, Upload, FileSpreadsheet, AlertCircle, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type GradeConfig = { grade: string; minPercentage: number; maxPercentage: number; gpa: number; remarks?: string };
type Student = { _id: string; id?: string; firstName: string; lastName: string; rollNo?: string; admissionNo?: string; profile?: { rollNo?: string; admissionNo?: string } };
type MarkRow = { studentId: string; score: string; remarks: string; grade?: string; gpa?: number; gradeRemarks?: string; isDirty: boolean };
type Exam = { _id: string; name: string; term: string; isApproved?: boolean; classes?: any[] };
type AClass = { _id: string; name: string; section?: string; grade?: string; subjects?: { subject: Subject }[] };
type Subject = { _id: string; name: string; code: string };

const DEFAULT_GRADES: GradeConfig[] = [
    { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, remarks: 'Excellent' },
    { grade: 'A',  minPercentage: 80, maxPercentage: 89,  gpa: 3.7, remarks: 'Very Good' },
    { grade: 'B+', minPercentage: 70, maxPercentage: 79,  gpa: 3.3, remarks: 'Good' },
    { grade: 'B',  minPercentage: 60, maxPercentage: 69,  gpa: 3.0, remarks: 'Above Average' },
    { grade: 'C',  minPercentage: 50, maxPercentage: 59,  gpa: 2.0, remarks: 'Average' },
    { grade: 'D',  minPercentage: 40, maxPercentage: 49,  gpa: 1.0, remarks: 'Below Average' },
    { grade: 'F',  minPercentage: 0,  maxPercentage: 39,  gpa: 0.0, remarks: 'Fail' },
];

const GRADE_COLOR: Record<string, string> = {
    'A+': 'text-emerald-600 dark:text-emerald-400',
    'A':  'text-green-600 dark:text-green-400',
    'B+': 'text-blue-600 dark:text-blue-400',
    'B':  'text-cyan-600 dark:text-cyan-400',
    'C':  'text-yellow-600 dark:text-yellow-400',
    'D':  'text-orange-600 dark:text-orange-400',
    'F':  'text-red-600 dark:text-red-400',
};

function calcGrade(score: number, maxMarks: number, configs: GradeConfig[]): GradeConfig | null {
    const pct = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
    return configs.find(g => pct >= g.minPercentage && pct <= g.maxPercentage) || null;
}

function gradeColor(grade?: string) {
    if (!grade) return 'text-slate-500';
    return GRADE_COLOR[grade] || 'text-slate-600 dark:text-slate-300';
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function GradeEntryPage() {
    const [exams, setExams]       = useState<Exam[]>([]);
    const [classes, setClasses]   = useState<AClass[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>(DEFAULT_GRADES);

    const [selExam, setSelExam]       = useState('');
    const [selClass, setSelClass]     = useState('');
    const [selSubject, setSelSubject] = useState('');
    const [maxMarks, setMaxMarks]     = useState(100);

    const [students, setStudents] = useState<Student[]>([]);
    const [marks, setMarks]       = useState<Record<string, MarkRow>>({});

    const [loading, setLoading]   = useState(false);
    const [saving, setSaving]     = useState(false);
    const [approving, setApproving] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [search, setSearch]     = useState('');
    const importInputRef = useRef<HTMLInputElement>(null);
    const schoolImportInputRef = useRef<HTMLInputElement>(null);
    const [schoolExcelBusy, setSchoolExcelBusy] = useState(false);

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    /* ── Initial data ─────────────────────────────────────────────────── */
    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) setUserRole(JSON.parse(u).role || '');
        (async () => {
            try {
                const [eRes, cRes, sRes, gRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes'),
                    api.get('/subjects'),
                    api.get('/grades/active').catch(() => null),
                ]);
                setExams(eRes.data.data || []);
                setClasses(cRes.data.data || []);
                setSubjects(sRes.data.data || []);
                if (gRes?.data?.data?.grades?.length) setGradeConfigs(gRes.data.data.grades);
            } catch (e) { console.error(e); }
        })();
    }, []);

    /* ── Load students + existing marks ──────────────────────────────────── */
    useEffect(() => {
        if (!selExam || !selClass || !selSubject) {
            setStudents([]); setMarks({}); return;
        }
        (async () => {
            setLoading(true);
            try {
                const [stuRes, mrkRes] = await Promise.all([
                    api.get(`/students?class=${selClass}`),
                    api.get('/exams/marks', { params: { examId: selExam, classId: selClass, subjectId: selSubject } }),
                ]);
                const stus: Student[] = stuRes.data.data || [];
                const existing: any[] = mrkRes.data.data || [];

                const init: Record<string, MarkRow> = {};
                stus.forEach(s => {
                    const sid = s._id || s.id || '';
                    const found = existing.find(m => (m.student?._id || m.student?.id || m.studentId) === sid);
                    init[sid] = {
                        studentId: sid,
                        score: found ? String(found.marksObtained) : '',
                        remarks: found?.remarks || '',
                        grade: found?.grade || undefined,
                        gpa: found?.gpa ?? undefined,
                        gradeRemarks: found?.gradeRemarks || undefined,
                        isDirty: false,
                    };
                });
                setStudents(stus);
                setMarks(init);
            } catch (e) { console.error(e); showToast('Failed to load data', false); }
            finally { setLoading(false); }
        })();
    }, [selExam, selClass, selSubject]);

    /* ── Derived ─────────────────────────────────────────────────────────── */
    const currentExam = useMemo(() => exams.find(e => e._id === selExam), [exams, selExam]);
    const isLocked    = currentExam?.isApproved === true;
    const isAdmin     = ['school-admin', 'super-admin'].includes(userRole);
    const canEdit     = !isLocked || isAdmin;
    const subjectOptions = useMemo(() => {
        if (userRole !== 'teacher') return subjects;
        const selectedClass = classes.find(c => c._id === selClass);
        return (selectedClass?.subjects || []).map(item => item.subject).filter(Boolean);
    }, [classes, selClass, subjects, userRole]);

    useEffect(() => {
        if (selSubject && !subjectOptions.some(subject => subject._id === selSubject)) setSelSubject('');
    }, [selSubject, subjectOptions]);

    const filteredStudents = useMemo(() => {
        if (!search.trim()) return students;
        const q = search.trim().toLowerCase();
        return students.filter(s => {
            const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
            const rollNo = (s.rollNo || s.profile?.rollNo || '').toLowerCase();
            const admNo  = (s.admissionNo || s.profile?.admissionNo || '').toLowerCase();
            return fullName.includes(q) || rollNo.includes(q) || admNo.includes(q);
        });
    }, [students, search]);

    const stats = useMemo(() => {
        const rows = Object.values(marks).filter(m => m.score !== '');
        const total = rows.length;
        const scores = rows.map(m => Number(m.score));
        const avg = total ? scores.reduce((a, b) => a + b, 0) / total : 0;
        const passed = rows.filter(m => {
            const g = calcGrade(Number(m.score), maxMarks, gradeConfigs);
            return g ? g.grade !== 'F' : Number(m.score) / maxMarks >= 0.5;
        }).length;
        return { total, avg: avg.toFixed(1), passed, failed: total - passed };
    }, [marks, maxMarks, gradeConfigs]);

    /* ── Handlers ────────────────────────────────────────────────────────── */
    const handleChange = (sid: string, field: 'score' | 'remarks', val: string) => {
        setMarks(prev => ({
            ...prev,
            [sid]: {
                ...prev[sid],
                [field]: val,
                ...(field === 'score' ? { isDirty: true, grade: undefined, gpa: undefined, gradeRemarks: undefined } : {}),
            },
        }));
    };

    const handleSave = async (finalize = false) => {
        const payload = Object.values(marks)
            .filter(m => m.score !== '' && m.score !== null)
            .map(m => ({ studentId: m.studentId, score: Number(m.score), maxMarks, remarks: m.remarks || '' }));
        if (!payload.length) { showToast('Enter at least one mark', false); return; }
        setSaving(true);
        try {
            await api.post('/exams/marks/bulk', { examId: selExam, classId: selClass, subjectId: selSubject, maxMarks, marks: payload });
            if (finalize && isAdmin) {
                await api.put(`/exams/${selExam}/approve`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: true } : e));
                showToast('Results finalized & published');
            } else {
                showToast('Draft saved successfully');
            }
            // Refresh marks from server so grades/gpa populate
            const mrkRes = await api.get('/exams/marks', { params: { examId: selExam, classId: selClass, subjectId: selSubject } });
            const existing: any[] = mrkRes.data.data || [];
            setMarks(prev => {
                const updated = { ...prev };
                existing.forEach(m => {
                    const sid = m.student?._id || m.student?.id || m.studentId;
                    if (updated[sid]) {
                        updated[sid] = { ...updated[sid], grade: m.grade, gpa: m.gpa, gradeRemarks: m.gradeRemarks, isDirty: false };
                    }
                });
                return updated;
            });
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Save failed', false);
        } finally { setSaving(false); }
    };

    const handleToggleApproval = async () => {
        if (!selExam || !isAdmin) return;
        setApproving(true);
        try {
            if (isLocked) {
                await api.put(`/exams/${selExam}/unapprove`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: false } : e));
                showToast('Exam unlocked for editing');
            } else {
                await api.put(`/exams/${selExam}/approve`);
                setExams(prev => prev.map(e => e._id === selExam ? { ...e, isApproved: true } : e));
                showToast('Results approved & published');
            }
        } catch (err: any) { showToast(err.response?.data?.message || 'Failed', false); }
        finally { setApproving(false); }
    };

    const handleExportExcel = async () => {
        if (!selExam || !selClass) return;
        try {
            const res = await api.get('/exams/export-matrix', {
                params: { examId: selExam, classId: selClass },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a'); a.href = url; a.download = 'grades-matrix.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch { showToast('Export failed', false); }
    };

    /* ── Download import template ─────────────────────────────────────── */
    const handleDownloadTemplate = () => {
        if (!students.length) { showToast('Select Class, Subject & Exam first', false); return; }
        const examName = currentExam ? `${currentExam.name} - ${currentExam.term}` : 'Exam';
        const subjectName = subjects.find(s => s._id === selSubject)?.name || 'Subject';
        const className  = classes.find(c => c._id === selClass);
        const classLabel = className ? (className.grade || className.name) + (className.section ? ` ${className.section}` : '') : 'Class';

        const rows = students.map((s, idx) => {
            const sid = s._id || s.id || '';
            const rollNo = s.rollNo || s.profile?.rollNo || `S${String(idx + 1).padStart(4, '0')}`;
            const existing = marks[sid];
            return {
                'Student ID': sid,
                'Roll No': rollNo,
                'First Name': s.firstName,
                'Last Name': s.lastName,
                [`Marks (Max: ${maxMarks})`]: existing?.score || '',
                'Remarks': existing?.remarks || '',
            };
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        // Column widths
        ws['!cols'] = [
            { wch: 28 }, // Student ID
            { wch: 10 }, // Roll No
            { wch: 16 }, // First Name
            { wch: 16 }, // Last Name
            { wch: 18 }, // Marks
            { wch: 28 }, // Remarks
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Marks Entry');

        // Add a metadata sheet so import can validate context
        const metaWs = XLSX.utils.json_to_sheet([{
            examId: selExam,
            classId: selClass,
            subjectId: selSubject,
            maxMarks,
            examName,
            subjectName,
            classLabel,
        }]);
        XLSX.utils.book_append_sheet(wb, metaWs, '_meta');

        const fileName = `marks-template_${classLabel}_${subjectName}_${examName}.xlsx`
            .replace(/[/\\?%*:|"<>]/g, '-');
        XLSX.writeFile(wb, fileName);
        showToast('Template downloaded');
    };

    /* ── Import Excel marks ───────────────────────────────────────────── */
    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Reset input so same file can be re-imported
        if (importInputRef.current) importInputRef.current.value = '';

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                const wb   = XLSX.read(data, { type: 'array' });

                // Try to read metadata sheet for validation
                const metaSheet = wb.Sheets['_meta'];
                if (metaSheet) {
                    const [meta] = XLSX.utils.sheet_to_json<any>(metaSheet);
                    if (meta) {
                        if (meta.examId && meta.examId !== selExam) {
                            showToast('This template is for a different Exam', false); return;
                        }
                        if (meta.classId && meta.classId !== selClass) {
                            showToast('This template is for a different Class', false); return;
                        }
                        if (meta.subjectId && meta.subjectId !== selSubject) {
                            showToast('This template is for a different Subject', false); return;
                        }
                    }
                }

                const ws = wb.Sheets['Marks Entry'];
                if (!ws) { showToast('Sheet "Marks Entry" not found in file', false); return; }

                const rows = XLSX.utils.sheet_to_json<any>(ws);
                if (!rows.length) { showToast('No rows found in the file', false); return; }

                const errors: string[] = [];
                let updated = 0;

                // Find the marks column — it starts with "Marks"
                const sampleRow = rows[0];
                const marksCol  = Object.keys(sampleRow).find(k => k.toLowerCase().startsWith('marks'));

                if (!marksCol) {
                    showToast('Could not find Marks column in the file', false); return;
                }

                const newMarks = { ...marks };

                rows.forEach((row: any, i: number) => {
                    const sid = String(row['Student ID'] || '').trim();
                    if (!sid) { errors.push(`Row ${i + 2}: Missing Student ID`); return; }
                    if (!newMarks[sid]) { errors.push(`Row ${i + 2}: Student ID "${sid}" not found in this class`); return; }

                    const rawScore = row[marksCol];
                    if (rawScore === '' || rawScore === undefined || rawScore === null) {
                        // blank — leave unchanged
                        return;
                    }

                    const score = Number(rawScore);
                    if (isNaN(score)) { errors.push(`Row ${i + 2}: Invalid score "${rawScore}" for ${row['First Name']} ${row['Last Name']}`); return; }
                    if (score < 0 || score > maxMarks) {
                        errors.push(`Row ${i + 2}: Score ${score} is out of range (0–${maxMarks}) for ${row['First Name']} ${row['Last Name']}`);
                        return;
                    }

                    newMarks[sid] = {
                        ...newMarks[sid],
                        score: String(score),
                        remarks: String(row['Remarks'] || newMarks[sid].remarks || ''),
                        isDirty: true,
                        grade: undefined,
                        gpa: undefined,
                        gradeRemarks: undefined,
                    };
                    updated++;
                });

                setMarks(newMarks);
                setImportErrors(errors);

                if (updated > 0) {
                    showToast(`Imported ${updated} mark${updated > 1 ? 's' : ''}${errors.length ? ` (${errors.length} warning${errors.length > 1 ? 's' : ''})` : ''}`);
                } else {
                    showToast('No marks were imported — check the file', false);
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to read file. Make sure it is a valid .xlsx file.', false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    /* Download one workbook containing every class and student for the selected exam. */
    const handleDownloadSchoolTemplate = async () => {
        if (!selExam) { showToast('Select an Exam first', false); return; }
        setSchoolExcelBusy(true);
        try {
            const [studentResponses, existingResponse] = await Promise.all([
                Promise.all(classes.map(c => api.get('/students', { params: { class: c._id } }))),
                api.get('/exams/marks', { params: { examId: selExam } }),
            ]);
            const existingMarks: any[] = existingResponse.data.data || [];
            const markMap = new Map<string, number>();
            existingMarks.forEach(mark => {
                const studentId = mark.student?._id || mark.student?.id || mark.studentId;
                const subjectId = mark.subject?._id || mark.subject?.id || mark.subjectId;
                if (studentId && subjectId) markMap.set(`${studentId}:${subjectId}`, mark.marksObtained);
            });

            const workbook = XLSX.utils.book_new();
            const classSheets: { sheetName: string; classId: string; subjects: { id: string; name: string }[] }[] = [];
            const usedSheetNames = new Set<string>();
            let totalStudents = 0;
            classes.forEach((schoolClass, classIndex) => {
                const classStudents: Student[] = studentResponses[classIndex].data.data || [];
                const classSubjects = (schoolClass.subjects || []).map(item => item.subject).filter(Boolean);
                if (!classStudents.length || !classSubjects.length) return;
                const baseName = `${schoolClass.name}${schoolClass.section ? `-${schoolClass.section}` : ''}`
                    .replace(/[\\/?*\[\]:]/g, '-').slice(0, 31) || `Class-${classIndex + 1}`;
                let sheetName = baseName;
                let suffix = 2;
                while (usedSheetNames.has(sheetName)) {
                    const suffixText = `-${suffix++}`;
                    sheetName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
                }
                usedSheetNames.add(sheetName);
                const rows = classStudents.map((student, studentIndex) => {
                    const studentId = student._id || student.id || '';
                    const row: Record<string, string | number> = {
                        'Student ID': studentId,
                        'Roll No': student.rollNo || student.profile?.rollNo || `S${String(studentIndex + 1).padStart(4, '0')}`,
                        'First Name': student.firstName,
                        'Last Name': student.lastName,
                    };
                    classSubjects.forEach(subject => {
                        row[subject.name] = markMap.get(`${studentId}:${subject._id}`) ?? '';
                    });
                    return row;
                });
                const worksheet = XLSX.utils.json_to_sheet(rows, {
                    header: ['Student ID', 'Roll No', 'First Name', 'Last Name', ...classSubjects.map(subject => subject.name)],
                });
                worksheet['!cols'] = [
                    { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 22 },
                    ...classSubjects.map(() => ({ wch: 16 })),
                ];
                if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
                classSheets.push({
                    sheetName,
                    classId: schoolClass._id,
                    subjects: classSubjects.map(subject => ({ id: subject._id, name: subject.name })),
                });
                totalStudents += classStudents.length;
            });
            if (!classSheets.length) throw new Error('No classes with assigned subjects and students were found');
            const current = exams.find(exam => exam._id === selExam);
            const metadata = XLSX.utils.json_to_sheet([{
                formatVersion: 2,
                examId: selExam,
                examName: current?.name || '',
                maxMarks,
                classSheets: JSON.stringify(classSheets),
            }]);
            XLSX.utils.book_append_sheet(workbook, metadata, '_meta');
            const safeExamName = (current?.name || 'exam').replace(/[/\\?%*:|"<>]/g, '-');
            XLSX.writeFile(workbook, `all-classes-marks_${safeExamName}.xlsx`);
            showToast(`Excel downloaded: ${classSheets.length} class sheets, ${totalStudents} students`);
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Could not download school Excel', false);
        } finally { setSchoolExcelBusy(false); }
    };

    /* Validate and save a completed all-classes workbook directly to the system. */
    const handleImportSchoolExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        const reader = new FileReader();
        reader.onload = async ev => {
            setSchoolExcelBusy(true);
            try {
                const workbook = XLSX.read(new Uint8Array(ev.target?.result as ArrayBuffer), { type: 'array' });
                const metadataSheet = workbook.Sheets['_meta'];
                if (!metadataSheet) throw new Error('This is not an All Classes marks template');
                const [metadata] = XLSX.utils.sheet_to_json<any>(metadataSheet);
                if (!metadata || metadata.examId !== selExam) throw new Error('This Excel belongs to a different exam');
                const templateMaxMarks = Number(metadata.maxMarks);
                if (!Number.isFinite(templateMaxMarks) || templateMaxMarks <= 0) throw new Error('Invalid maximum marks in template');
                const classSheets: { sheetName: string; classId: string; subjects: { id: string; name: string }[] }[] = JSON.parse(metadata.classSheets || '[]');
                if (!classSheets.length) throw new Error('Class sheet information is missing from the template');
                const validClasses = new Set(classes.map(c => c._id));
                const batches = new Map<string, { classId: string; subjectId: string; marks: { studentId: string; score: number }[] }>();
                const warnings: string[] = [];

                classSheets.forEach(classSheet => {
                    const sheet = workbook.Sheets[classSheet.sheetName];
                    if (!sheet) { warnings.push(`Sheet "${classSheet.sheetName}" is missing`); return; }
                    if (!validClasses.has(classSheet.classId)) { warnings.push(`Sheet "${classSheet.sheetName}" has an invalid Class ID`); return; }
                    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
                    rows.forEach((row, index) => {
                        const studentId = String(row['Student ID'] || '').trim();
                        if (!studentId) { warnings.push(`${classSheet.sheetName} row ${index + 2}: missing Student ID`); return; }
                        classSheet.subjects.forEach(subject => {
                            const raw = row[subject.name];
                            if (raw === '' || raw === null || raw === undefined || String(raw).trim().toUpperCase() === 'M') return;
                            const score = Number(raw);
                            if (!Number.isFinite(score) || score < 0 || score > templateMaxMarks) {
                                warnings.push(`${classSheet.sheetName} row ${index + 2}: ${subject.name} score "${raw}" must be 0–${templateMaxMarks} or M`);
                                return;
                            }
                            const key = `${classSheet.classId}:${subject.id}`;
                            if (!batches.has(key)) batches.set(key, { classId: classSheet.classId, subjectId: subject.id, marks: [] });
                            batches.get(key)!.marks.push({ studentId, score });
                        });
                    });
                });
                if (!batches.size) throw new Error('No valid marks were found in the Excel file');

                let saved = 0;
                for (const batch of batches.values()) {
                    await api.post('/exams/marks/bulk', {
                        examId: selExam,
                        classId: batch.classId,
                        subjectId: batch.subjectId,
                        maxMarks: templateMaxMarks,
                        marks: batch.marks,
                    });
                    saved += batch.marks.length;
                }
                setImportErrors(warnings);
                setMaxMarks(templateMaxMarks);
                showToast(`Saved ${saved} marks from Excel${warnings.length ? ` (${warnings.length} warnings)` : ''}`);
                if (selClass && selSubject) {
                    const result = await api.get('/exams/marks', { params: { examId: selExam, classId: selClass, subjectId: selSubject } });
                    const refreshed: any[] = result.data.data || [];
                    setMarks(previous => {
                        const next = { ...previous };
                        refreshed.forEach(mark => {
                            const sid = mark.student?._id || mark.student?.id || mark.studentId;
                            if (next[sid]) next[sid] = { ...next[sid], score: String(mark.marksObtained), grade: mark.grade, gpa: mark.gpa, gradeRemarks: mark.gradeRemarks, isDirty: false };
                        });
                        return next;
                    });
                }
            } catch (err: any) {
                showToast(err.response?.data?.message || err.message || 'Could not import school Excel', false);
            } finally { setSchoolExcelBusy(false); }
        };
        reader.readAsArrayBuffer(file);
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.ok ? 'bg-emerald-600' : 'bg-red-500'}`}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Exam Marks Entry and Results</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Enter student marks — grades are calculated automatically.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Hidden file input for Excel import */}
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleImportExcel}
                    />
                    <input
                        ref={schoolImportInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleImportSchoolExcel}
                    />
                    {canEdit && selExam && (
                        <>
                            <button
                                onClick={handleDownloadSchoolTemplate}
                                disabled={schoolExcelBusy}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium hover:bg-indigo-100 transition disabled:opacity-50"
                                title="Download every class and student in one Excel file"
                            >
                                {schoolExcelBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} All Classes Excel
                            </button>
                            <button
                                onClick={() => schoolImportInputRef.current?.click()}
                                disabled={schoolExcelBusy}
                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                                title="Upload and save a completed All Classes Excel file"
                            >
                                {schoolExcelBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload All Classes
                            </button>
                        </>
                    )}
                    {canEdit && selExam && selClass && selSubject && students.length > 0 && (
                        <>
                            <button
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:border-slate-400 transition"
                                title="Download Excel template with student list"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Template
                            </button>
                            <button
                                onClick={() => importInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition"
                                title="Import marks from Excel file"
                            >
                                <Upload className="w-4 h-4" /> Import Excel
                            </button>
                        </>
                    )}
                    {selExam && selClass && (
                        <button onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:border-slate-400 transition">
                            <Download className="w-4 h-4" /> Export
                        </button>
                    )}
                    {isAdmin && selExam && (
                        <button onClick={handleToggleApproval} disabled={approving}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${isLocked ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'}`}>
                            {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? <><Unlock className="w-4 h-4" /> Unlock</> : <><Lock className="w-4 h-4" /> Approve</>}
                        </button>
                    )}
                    {canEdit && selExam && selClass && selSubject && (
                        <>
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                            </button>
                            {isAdmin && (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Finalize & Publish
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Locked Banner */}
            {isLocked && (
                <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-amber-700 dark:text-amber-400 text-sm font-medium">
                    <Lock className="w-4 h-4 shrink-0" />
                    Results are approved and locked. {isAdmin ? 'Click "Unlock" to allow edits.' : 'Contact admin to unlock.'}
                </div>
            )}

            {/* Import Errors */}
            {importErrors.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                            <AlertCircle className="w-4 h-4" />
                            Import Warnings ({importErrors.length})
                        </div>
                        <button
                            onClick={() => setImportErrors([])}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                    <ul className="space-y-1">
                        {importErrors.map((err, i) => (
                            <li key={i} className="text-xs text-amber-700 dark:text-amber-300 font-mono">• {err}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Class</label>
                    <div className="relative">
                        <select value={selClass} onChange={e => setSelClass(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">— Select Class —</option>
                            {classes.map(c => <option key={c._id} value={c._id}>{c.grade || c.name}{c.section ? ` ${c.section}` : ''}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Subject</label>
                    <div className="relative">
                        <select value={selSubject} onChange={e => setSelSubject(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">— Select Subject —</option>
                            {subjectOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Select Exam Type</label>
                    <div className="relative">
                        <select value={selExam} onChange={e => setSelExam(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8">
                            <option value="">— Select Exam —</option>
                            {exams.map(e => <option key={e._id} value={e._id}>{e.name} — {e.term}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Max Marks</label>
                    <input type="number" min={1} value={maxMarks} onChange={e => setMaxMarks(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Search bar */}
                {students.length > 0 && (
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                        <div className="relative flex-1 max-w-xs">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search student name or roll no..."
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                </button>
                            )}
                        </div>
                        {search && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {filteredStudents.length} / {students.length} students
                            </span>
                        )}
                    </div>
                )}
                {loading ? (
                    <div className="flex items-center justify-center py-24 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading students...
                    </div>
                ) : !selExam || !selClass || !selSubject ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-sm gap-2">
                        <AlertCircle className="w-10 h-10 opacity-30" />
                        Select a Class, Subject, and Exam to begin entering marks.
                    </div>
                ) : students.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 text-sm">No students found in this class.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                                    <th className="px-4 py-3 w-24">Student ID</th>
                                    <th className="px-4 py-3">Student Name</th>
                                    <th className="px-4 py-3 w-36">Obtained Marks</th>
                                    <th className="px-4 py-3 w-24">Max Marks</th>
                                    <th className="px-4 py-3 w-28">Percentage (%)</th>
                                    <th className="px-4 py-3 w-20">Grade</th>
                                    <th className="px-4 py-3">Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                                            No students match &ldquo;{search}&rdquo;
                                        </td>
                                    </tr>
                                ) : filteredStudents.map((s, idx) => {
                                    const sid = s._id || s.id || '';
                                    const row = marks[sid] || { studentId: sid, score: '', remarks: '', isDirty: false };
                                    const numScore = row.score !== '' ? Number(row.score) : null;
                                    const pct = numScore !== null ? (numScore / maxMarks) * 100 : null;
                                    const gc = numScore !== null ? calcGrade(numScore, maxMarks, gradeConfigs) : null;
                                    const grade = row.isDirty ? gc?.grade : (row.grade || gc?.grade);
                                    const isFail = grade === 'F';
                                    const rollNo = s.rollNo || s.profile?.rollNo || `S${String(idx + 1).padStart(4, '0')}`;

                                    return (
                                        <tr key={sid} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isFail && numScore !== null ? 'bg-red-50/40 dark:bg-red-900/5' : ''}`}>
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{rollNo}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{s.firstName} {s.lastName}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="number" min={0} max={maxMarks}
                                                        value={row.score}
                                                        onChange={e => handleChange(sid, 'score', e.target.value)}
                                                        disabled={!canEdit}
                                                        className={`w-20 px-2.5 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:border-slate-600 dark:text-white ${isFail && numScore !== null ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'}`}
                                                        placeholder="—"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{maxMarks}</td>
                                            <td className={`px-4 py-3 font-semibold ${isFail && numScore !== null ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {pct !== null ? `${pct.toFixed(0)}%` : '—'}
                                            </td>
                                            <td className={`px-4 py-3 font-bold text-base ${gradeColor(grade)}`}>
                                                {grade || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={row.remarks}
                                                    onChange={e => handleChange(sid, 'remarks', e.target.value)}
                                                    disabled={!canEdit}
                                                    placeholder="e.g. Excellent performance"
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-white placeholder-slate-400"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {students.length > 0 && selExam && selClass && selSubject && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-1 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex flex-wrap gap-4">
                        <span>Total Students: <strong className="text-slate-800 dark:text-white">{students.length}</strong></span>
                        <span>Average: <strong className="text-blue-600 dark:text-blue-400">{stats.avg}%</strong></span>
                        <span>Passed: <strong className="text-emerald-600 dark:text-emerald-400">{stats.passed}</strong></span>
                        <span>Failed: <strong className="text-red-500">{stats.failed}</strong></span>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleSave(false)} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
                            </button>
                            {isAdmin && (
                                <button onClick={() => handleSave(true)} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Finalize & Publish
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
