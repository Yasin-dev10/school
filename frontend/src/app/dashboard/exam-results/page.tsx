"use client";
import { useState, useEffect, useCallback } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { FileDown, Trophy, TrendingUp, Grid, List, Edit2, Trash2, X, Sparkles, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ExamOption {
    id?: string;
    _id?: string;
    name: string;
    term?: string;
    startDate?: string;
    isApproved?: boolean;
}

interface ClassOption {
    id?: string;
    _id?: string;
    name: string;
    section?: string | null;
}

interface SubjectOption {
    id: string;
    name: string;
    code?: string | null;
}

interface MarkStudent {
    id: string;
    firstName: string;
    lastName: string;
    rollNo?: string | null;
    admissionNo?: string | null;
}

interface ApiMark {
    id: string;
    marksObtained: number;
    maxMarks: number;
    remarks?: string | null;
    grade?: string | null;
    gpa?: number | null;
    gradeRemarks?: string | null;
    student?: MarkStudent | null;
    subject: SubjectOption;
    exam?: ExamOption;
}

interface PredictedResult {
    student: MarkStudent;
    predictedPercentage: number;
    previousAverage: number;
    trend: number;
    examCount: number;
    grade: string;
    confidence: 'High' | 'Medium' | 'Low';
}

interface SubjectMark {
    markId: string;
    subjectId: string;
    subjectName: string;
    obtained: number;
    max: number;
    remarks: string;
    grade?: string | null;
    gpa?: number | null;
    gradeRemarks?: string | null;
}

interface StudentResult {
    id: string;
    firstName: string;
    lastName: string;
    rollNo: string;
    admissionNo: string;
    totalObtained: number;
    totalMax: number;
    percentage: number;
    averageGpa: number;
    subjectCount: number;
    rank?: number;
    subjectMarks?: Record<string, SubjectMark>;
}

type SelectedMark = SubjectMark & {
    studentId: string;
    studentName: string;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        return response?.data?.message || fallback;
    }
    return fallback;
};

const getPredictedGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
};

export default function ExamResultsPage() {
    const [exams, setExams] = useState<ExamOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');

    const [results, setResults] = useState<StudentResult[]>([]);
    const [predictions, setPredictions] = useState<PredictedResult[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'matrix' | 'estimate'>('list');
    const [editingStudent, setEditingStudent] = useState<StudentResult | null>(null);
    const [editingMark, setEditingMark] = useState<SelectedMark | null>(null);
    const [editFormData, setEditFormData] = useState({ marksObtained: '', maxMarks: '', remarks: '' });
    const [deleteTarget, setDeleteTarget] = useState<SelectedMark | null>(null);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [examsRes, classesRes] = await Promise.all([
                    api.get<{ data: ExamOption[] }>('/exams'),
                    api.get<{ data: ClassOption[] }>('/classes')
                ]);
                setExams(examsRes.data.data);
                setClasses(classesRes.data.data);
            } catch (error) {
                console.error(error);
                toast.error('Failed to load filters');
            }
        };
        fetchFilters();
    }, []);

    const fetchResults = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all marks for this class/exam
            const [res, historyRes] = await Promise.all([
                api.get<{ data: ApiMark[] }>('/exams/marks', {
                    params: { examId: selectedExam, classId: selectedClass }
                }),
                api.get<{ data: ApiMark[] }>('/exams/marks', {
                    params: { classId: selectedClass }
                })
            ]);

            const marks = res.data.data; // Array of Mark objects populated with student

            // Group by Student
            const studentMap: Record<string, StudentResult> = {};
            const subjectMap: Record<string, SubjectOption> = {};

            marks.forEach((mark) => {
                if (!mark.student) return; // Skip if student deleted
                const sId = mark.student.id;

                if (!subjectMap[mark.subject.id]) {
                    subjectMap[mark.subject.id] = mark.subject;
                }

                if (!studentMap[sId]) {
                    studentMap[sId] = {
                        id: sId,
                        firstName: mark.student.firstName,
                        lastName: mark.student.lastName,
                        rollNo: mark.student.rollNo || '-',
                        admissionNo: mark.student.admissionNo || '-',
                        totalObtained: 0,
                        totalMax: 0,
                        percentage: 0,
                        averageGpa: 0,
                        subjectCount: 0,
                        subjectMarks: {}
                    };
                }

                studentMap[sId].totalObtained += mark.marksObtained;
                studentMap[sId].totalMax += mark.maxMarks;
                studentMap[sId].averageGpa += Number(mark.gpa || 0);
                studentMap[sId].subjectCount++;
                if (studentMap[sId].subjectMarks) {
                    studentMap[sId].subjectMarks![mark.subject.id] = {
                        markId: mark.id,
                        subjectId: mark.subject.id,
                        subjectName: mark.subject.name,
                        obtained: mark.marksObtained,
                        max: mark.maxMarks,
                        remarks: mark.remarks || '',
                        grade: mark.grade || null,
                        gpa: mark.gpa ?? null,
                        gradeRemarks: mark.gradeRemarks || null
                    };
                }
            });

            setSubjects(Object.values(subjectMap).sort((a, b) => a.name.localeCompare(b.name)));

            // Calculate Percentage & Convert to Array
            const resultArray = Object.values(studentMap).map(s => ({
                ...s,
                percentage: s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0,
                averageGpa: s.subjectCount > 0 ? s.averageGpa / s.subjectCount : 0
            }));

            // Sort by Percentage (Desc) for Rank
            resultArray.sort((a, b) => b.percentage - a.percentage);

            // Assign Rank
            resultArray.forEach((s, index) => {
                s.rank = index + 1;
            });

            setResults(resultArray);

            // Estimate the next result from exams that happened before the selected
            // exam. Approval is not required; any exam with recorded marks can be used.
            const targetExam = exams.find(e => (e.id || e._id) === selectedExam);
            const targetDate = targetExam?.startDate ? new Date(targetExam.startDate).getTime() : Number.POSITIVE_INFINITY;
            const historyByStudent: Record<string, { student: MarkStudent; exams: Record<string, { date: number; obtained: number; max: number }> }> = {};

            historyRes.data.data.forEach(mark => {
                if (!mark.student || !mark.exam || (mark.exam.id || mark.exam._id) === selectedExam) return;
                const examDate = mark.exam.startDate ? new Date(mark.exam.startDate).getTime() : 0;
                if (examDate >= targetDate) return;
                const studentHistory = historyByStudent[mark.student.id] ||= { student: mark.student, exams: {} };
                const examId = mark.exam.id || mark.exam._id || mark.exam.name;
                const examSummary = studentHistory.exams[examId] ||= { date: examDate, obtained: 0, max: 0 };
                examSummary.obtained += Number(mark.marksObtained) || 0;
                examSummary.max += Number(mark.maxMarks) || 0;
            });

            const estimated = Object.values(historyByStudent).map(({ student, exams: studentExams }) => {
                const scores = Object.values(studentExams)
                    .filter(exam => exam.max > 0)
                    .sort((a, b) => a.date - b.date)
                    .map(exam => (exam.obtained / exam.max) * 100);
                const weightedTotal = scores.reduce((sum, score, index) => sum + score * (index + 1), 0);
                const weight = scores.reduce((sum, _score, index) => sum + index + 1, 0);
                const previousAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                const trend = scores.length > 1 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;
                // Keep the projection conservative by applying only 25% of the latest trend.
                const predictedPercentage = Math.min(100, Math.max(0, weightedTotal / weight + trend * 0.25));
                return {
                    student,
                    predictedPercentage,
                    previousAverage,
                    trend,
                    examCount: scores.length,
                    grade: getPredictedGrade(predictedPercentage),
                    confidence: scores.length >= 3 ? 'High' as const : scores.length === 2 ? 'Medium' as const : 'Low' as const
                };
            }).sort((a, b) => b.predictedPercentage - a.predictedPercentage);
            setPredictions(estimated);

        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch results');
        } finally {
            setLoading(false);
        }
    }, [selectedExam, selectedClass, exams]);

    useEffect(() => {
        if (selectedExam && selectedClass) {
            fetchResults();
        } else {
            setResults([]);
            setSubjects([]);
            setPredictions([]);
        }
    }, [selectedExam, selectedClass, fetchResults]);

    const downloadReportCard = async (studentId: string, studentName: string) => {
        try {
            const res = await api.get(`/exams/report/${selectedExam}/${studentId}?format=pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${studentName}_${selectedExam}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error('Failed to download report card');
        }
    };

    const getSelectedMark = (student: StudentResult, mark: SubjectMark): SelectedMark => ({
        ...mark,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`.trim()
    });

    const openEditModal = (markData: SelectedMark) => {
        setEditingMark(markData);
        setEditFormData({
            marksObtained: String(markData.obtained ?? ''),
            maxMarks: String(markData.max || ''),
            remarks: markData.remarks || ''
        });
    };

    const selectStudentForEdit = (student: StudentResult) => {
        setEditingStudent(student);
    };

    const saveEditedMark = async () => {
        if (!editingMark || !selectedExam || !selectedClass) return;

        // Validate required fields
        if (!editingMark.studentId) {
            toast.error('Student ID is missing');
            return;
        }
        if (!editingMark.subjectId) {
            toast.error('Subject ID is missing');
            return;
        }

        // Validate input
        const marksObtained = Number(editFormData.marksObtained);
        const maxMarks = Number(editFormData.maxMarks);
        
        if (isNaN(marksObtained) || marksObtained < 0) {
            toast.error('Marks obtained must be a valid number');
            return;
        }
        if (isNaN(maxMarks) || maxMarks <= 0) {
            toast.error('Max marks must be a valid positive number');
            return;
        }
        if (marksObtained > maxMarks) {
            toast.error('Marks obtained cannot be greater than max marks');
            return;
        }

        setUpdating(true);
        try {
            const marks = [{
                studentId: editingMark.studentId,
                score: marksObtained,
                maxMarks,
                remarks: editFormData.remarks
            }];

            const payload = {
                examId: selectedExam,
                subjectId: editingMark.subjectId,
                classId: selectedClass,
                marks,
                maxMarks
            };

            await api.post('/exams/marks/bulk', payload);

            toast.success('Mark updated successfully');
            setEditingMark(null);
            setEditingStudent(null);
            await fetchResults();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to update mark'));
        } finally {
            setUpdating(false);
        }
    };

    const deleteMark = async () => {
        if (!deleteTarget) return;

        setDeleting(true);
        try {
            await api.delete(`/exams/marks/${deleteTarget.markId}`);
            toast.success('Mark deleted successfully');
            setDeleteTarget(null);
            setEditingStudent(null);
            await fetchResults();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to delete mark'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6 sm:space-y-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/20">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Academic Results</h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Review institutional performance and student achievements.</p>
                    </div>
                </div>
                <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <List className="w-4 h-4" />
                        List View
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'matrix'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Grid className="w-4 h-4" />
                        Matrix View
                    </button>
                    <button
                        onClick={() => setViewMode('estimate')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'estimate'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Auto Estimate
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 sm:p-6 bg-slate-900/40 rounded-[2rem] border border-white/5 shadow-xl grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Academic Session</label>
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                        <select
                            value={selectedExam}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">Choose Exam...</option>
                            {exams.map(e => (
                                <option key={e._id || e.id || e.name} value={e._id || e.id || ''} className="bg-slate-900">{e.name} ({e.term})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Class</label>
                    <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-transparent text-white text-xs font-black outline-none px-4 py-2.5 cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">Choose Class...</option>
                            {classes.map(c => (
                                <option key={c._id || c.id || c.name} value={c._id || c.id || ''} className="bg-slate-900">{c.name} {c.section && `(${c.section})`}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="glass-dark rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                        <p className="text-slate-500 font-bold italic">Synthesizing performance data...</p>
                    </div>
                ) : !selectedExam || !selectedClass ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                        <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-2xl opacity-50">🔍</div>
                        <p className="text-center font-bold">Select an Exam and Class to view the performance ledger.</p>
                    </div>
                ) : viewMode !== 'estimate' && results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                        <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-2xl">🚫</div>
                        <p className="text-center font-bold">No academic records found for this specific query.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        {viewMode === 'list' ? (
                            <table className="w-full text-left min-w-[900px]">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="px-8 py-5 w-24">Rank</th>
                                        <th className="px-8 py-5">Student Athlete</th>
                                        <th className="px-8 py-5 text-center">Modules</th>
                                        <th className="px-8 py-5 text-right">Raw Score</th>
                                        <th className="px-8 py-5 text-center">Index %</th>
                                        <th className="px-8 py-5 text-center">Avg GPA</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.map((student, index) => (
                                            <tr key={`${student.id}-${index}`} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-8 py-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${student.rank === 1 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                                        student.rank === 2 ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' :
                                                            student.rank === 3 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' :
                                                                'bg-white/5 text-slate-500 border border-white/5'
                                                        }`}>
                                                        {student.rank && student.rank <= 3 ? <Trophy className="w-4 h-4" /> : student.rank}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="font-bold text-white mb-0.5">{student.firstName} {student.lastName}</div>
                                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Adm: {student.admissionNo}</div>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className="text-white font-bold">{student.subjectCount}</span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="text-white font-black">{student.totalObtained}</span>
                                                    <span className="text-slate-500 text-[10px] ml-1">/ {student.totalMax}</span>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <div className="text-indigo-400 font-black text-lg">{student.percentage.toFixed(1)}%</div>
                                                </td>
                                                <td className="px-8 py-4 text-center">
                                                    <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400">
                                                        {student.averageGpa.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => downloadReportCard(student.id, student.firstName)}
                                                            className="p-2.5 text-slate-500 hover:text-white hover:bg-indigo-600 rounded-xl transition-all border border-white/5 hover:border-indigo-500 group-hover:shadow-lg shadow-indigo-500/20"
                                                            title="Download Report"
                                                        >
                                                            <FileDown className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => selectStudentForEdit(student)}
                                                            className="p-2.5 text-slate-500 hover:text-white hover:bg-blue-600 rounded-xl transition-all border border-white/5 hover:border-blue-500 group-hover:shadow-lg shadow-blue-500/20"
                                                            title="Edit Marks"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : viewMode === 'matrix' ? (
                            <table className="w-full text-left min-w-max border-collapse">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 sticky left-0 z-20 bg-slate-950/90 backdrop-blur border-r border-white/5">Student Information</th>
                                        {subjects.map(subject => (
                                            <th key={subject.id} className="px-4 py-4 text-center min-w-[100px]">
                                                {subject.name}
                                            </th>
                                        ))}
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Total</th>
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Avg %</th>
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Avg GPA</th>
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Rank</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.map((student, index) => (
                                        <tr key={`${student.id}-${index}`} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 sticky left-0 bg-slate-900/90 backdrop-blur border-r border-white/5 z-10">
                                                <div className="font-bold text-white mb-0.5">{student.firstName} {student.lastName}</div>
                                                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Adm: {student.admissionNo}</div>
                                            </td>
                                            {subjects.map(subject => {
                                                const mark = student.subjectMarks?.[subject.id];
                                                return (
                                                    <td key={subject.id} className="px-4 py-4 text-center border-l border-white/5 first:border-l-0">
                                                        {mark ? (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div>
                                                                    <div className="font-bold text-white">{mark.obtained}</div>
                                                                    <div className="text-[9px] text-slate-600">/ {mark.max}</div>
                                                                    <div className="mt-1 text-[10px] font-black text-indigo-400">{mark.grade || 'N/A'}</div>
                                                                </div>
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <button
                                                                        onClick={() => openEditModal(getSelectedMark(student, mark))}
                                                                        className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                                                                        title={`Edit ${subject.name} mark`}
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteTarget(getSelectedMark(student, mark))}
                                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                                                        title={`Delete ${subject.name} mark`}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-700 text-xs">-</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-4 text-center bg-indigo-500/5 font-bold text-indigo-300">
                                                {student.totalObtained}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-indigo-500/5 font-bold text-indigo-300">
                                                {student.percentage.toFixed(1)}%
                                            </td>
                                            <td className="px-4 py-4 text-center bg-indigo-500/5 font-bold text-indigo-300">
                                                {student.averageGpa.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-indigo-500/5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs mx-auto ${student.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                                                    student.rank === 2 ? 'bg-slate-500/20 text-slate-400' :
                                                        student.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                                                            'bg-white/5 text-slate-500'
                                                    }`}>
                                                    {student.rank}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : predictions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                                <Sparkles className="w-12 h-12 text-violet-400 mb-5" />
                                <p className="font-bold text-center">No previous exam marks are available for this estimate.</p>
                                <p className="text-xs text-slate-600 mt-2 text-center">Enter marks for at least one earlier exam in this class, then the estimate will fill automatically.</p>
                            </div>
                        ) : (
                            <div>
                                <div className="px-7 py-5 border-b border-white/5 bg-violet-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div>
                                        <h2 className="text-white font-black flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" /> Estimated Exam Result</h2>
                                        <p className="text-xs text-slate-500 mt-1">Automatically calculated from previous exams with recorded marks. This is a forecast, not an official mark.</p>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-widest font-black text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1.5">Auto-filled</span>
                                </div>
                                <table className="w-full text-left min-w-[820px]">
                                    <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5">
                                        <tr>
                                            <th className="px-7 py-4">Rank</th>
                                            <th className="px-7 py-4">Student</th>
                                            <th className="px-7 py-4 text-center">Previous Exams</th>
                                            <th className="px-7 py-4 text-center">Previous Avg</th>
                                            <th className="px-7 py-4 text-center">Trend</th>
                                            <th className="px-7 py-4 text-center">Estimated Result</th>
                                            <th className="px-7 py-4 text-center">Grade</th>
                                            <th className="px-7 py-4 text-center">Confidence</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {predictions.map((prediction, index) => (
                                            <tr key={prediction.student.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-7 py-4 text-slate-500 font-black">#{index + 1}</td>
                                                <td className="px-7 py-4">
                                                    <div className="font-bold text-white">{prediction.student.firstName} {prediction.student.lastName}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">Adm: {prediction.student.admissionNo || '-'}</div>
                                                </td>
                                                <td className="px-7 py-4 text-center text-white font-bold">{prediction.examCount}</td>
                                                <td className="px-7 py-4 text-center text-slate-300 font-bold">{prediction.previousAverage.toFixed(1)}%</td>
                                                <td className="px-7 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 font-black ${prediction.trend > 0.5 ? 'text-emerald-400' : prediction.trend < -0.5 ? 'text-red-400' : 'text-slate-500'}`}>
                                                        {prediction.trend > 0.5 ? <ArrowUp className="w-3.5 h-3.5" /> : prediction.trend < -0.5 ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                                        {Math.abs(prediction.trend).toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="px-7 py-4 text-center"><span className="text-xl font-black text-violet-300">{prediction.predictedPercentage.toFixed(1)}%</span></td>
                                                <td className="px-7 py-4 text-center"><span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 font-black">{prediction.grade}</span></td>
                                                <td className="px-7 py-4 text-center">
                                                    <span className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full ${prediction.confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400' : prediction.confidence === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'}`}>{prediction.confidence}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Subject Selection Modal */}
            {editingStudent && !editingMark && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Manage Subject Marks</h3>
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-slate-400 mb-4">
                                <strong>{editingStudent.firstName} {editingStudent.lastName}</strong>
                                {editingStudent.admissionNo && ` (Adm: ${editingStudent.admissionNo})`}
                            </p>
                            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                                {Object.entries(editingStudent.subjectMarks || {}).map(([subId, mark]) => {
                                    const subject = subjects.find(s => s.id === subId);
                                    return (
                                        <div
                                            key={subId}
                                            className="w-full p-4 text-left bg-slate-800/50 border border-white/10 rounded-lg"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-bold text-white text-base">{subject?.name || mark.subjectName}</div>
                                                    <div className="text-sm text-slate-400 mt-2 font-black">
                                                        Score: <span className="text-indigo-400 text-lg">{mark.obtained}/{mark.max}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right space-y-1">
                                                    <div className="text-2xl font-black text-indigo-400">{((mark.obtained/mark.max)*100).toFixed(1)}%</div>
                                                    <div className="text-sm font-bold text-slate-300">{mark.grade || 'N/A'}</div>
                                                    {mark.gpa && <div className="text-xs text-slate-400">GPA: {mark.gpa.toFixed(2)}</div>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button
                                                    onClick={() => openEditModal(getSelectedMark(editingStudent, mark))}
                                                    className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 rounded-lg transition-all text-xs font-black uppercase tracking-widest"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(getSelectedMark(editingStudent, mark))}
                                                    className="flex-1 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/20 rounded-lg transition-all text-xs font-black uppercase tracking-widest"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex">
                            <button
                                onClick={() => setEditingStudent(null)}
                                className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all font-semibold"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Mark Modal */}
            {editingMark && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Edit Mark</h3>
                            <button
                                onClick={() => {
                                    setEditingMark(null);
                                    setEditingStudent(null);
                                }}
                                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={editingMark.subjectName || ''}
                                    disabled
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-slate-400 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Marks Obtained</label>
                                    <input
                                        type="number"
                                        value={editFormData.marksObtained}
                                        onChange={(e) => setEditFormData({ ...editFormData, marksObtained: e.target.value })}
                                        max={editingMark.max}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Max Marks</label>
                                    <input
                                        type="number"
                                        value={editFormData.maxMarks}
                                        onChange={(e) => setEditFormData({ ...editFormData, maxMarks: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                                <textarea
                                    value={editFormData.remarks}
                                    onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingMark(null)}
                                className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEditedMark}
                                disabled={updating}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-all font-semibold"
                            >
                                {updating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Delete Mark</h3>
                                <p className="text-sm text-slate-400">
                                    {deleteTarget.subjectName} for {deleteTarget.studentName}
                                </p>
                                <p className="text-sm text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 text-slate-400 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteMark}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-all font-semibold"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
