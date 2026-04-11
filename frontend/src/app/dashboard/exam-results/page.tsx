"use client";
import { useState, useEffect } from 'react';
import api from '@/app/utils/api';
import { toast } from 'react-hot-toast';
import { Search, FileDown, Trophy, Ban, Users, TrendingUp, Grid, List } from 'lucide-react';

interface StudentResult {
    id: string;
    firstName: string;
    lastName: string;
    rollNo: string;
    admissionNo: string;
    totalObtained: number;
    totalMax: number;
    percentage: number;
    subjectCount: number;
    rank?: number;
    subjectMarks?: Record<string, { obtained: number; max: number }>;
}

export default function ExamResultsPage() {
    const [exams, setExams] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedExam, setSelectedExam] = useState('');
    const [selectedClass, setSelectedClass] = useState('');

    const [results, setResults] = useState<StudentResult[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [examsRes, classesRes] = await Promise.all([
                    api.get('/exams'),
                    api.get('/classes')
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

    useEffect(() => {
        if (selectedExam && selectedClass) {
            fetchResults();
        } else {
            setResults([]);
            setSubjects([]);
        }
    }, [selectedExam, selectedClass]);

    const fetchResults = async () => {
        setLoading(true);
        try {
            // Fetch all marks for this class/exam
            const res = await api.get('/exams/marks', {
                params: {
                    examId: selectedExam,
                    classId: selectedClass
                }
            });

            const marks = res.data.data; // Array of Mark objects populated with student

            // Group by Student
            const studentMap: Record<string, StudentResult> = {};
            const subjectMap: Record<string, any> = {};

            marks.forEach((mark: any) => {
                if (!mark.student) return; // Skip if student deleted
                const sId = mark.student._id;

                if (!subjectMap[mark.subject._id]) {
                    subjectMap[mark.subject._id] = mark.subject;
                }

                if (!studentMap[sId]) {
                    studentMap[sId] = {
                        id: sId,
                        firstName: mark.student.firstName,
                        lastName: mark.student.lastName,
                        rollNo: mark.student.profile?.rollNo || '-',
                        admissionNo: mark.student.profile?.admissionNo || '-',
                        totalObtained: 0,
                        totalMax: 0,
                        percentage: 0,
                        subjectCount: 0,
                        subjectMarks: {}
                    };
                }

                studentMap[sId].totalObtained += mark.marksObtained;
                studentMap[sId].totalMax += mark.maxMarks;
                studentMap[sId].subjectCount++;
                if (studentMap[sId].subjectMarks) {
                    studentMap[sId].subjectMarks![mark.subject._id] = {
                        obtained: mark.marksObtained,
                        max: mark.maxMarks
                    };
                }
            });

            setSubjects(Object.values(subjectMap).sort((a: any, b: any) => a.name.localeCompare(b.name)));

            // Calculate Percentage & Convert to Array
            const resultArray = Object.values(studentMap).map(s => ({
                ...s,
                percentage: s.totalMax > 0 ? (s.totalObtained / s.totalMax) * 100 : 0
            }));

            // Sort by Percentage (Desc) for Rank
            resultArray.sort((a, b) => b.percentage - a.percentage);

            // Assign Rank
            resultArray.forEach((s, index) => {
                s.rank = index + 1;
            });

            setResults(resultArray);

        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch results');
        } finally {
            setLoading(false);
        }
    };

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
        } catch (error) {
            toast.error('Failed to download report card');
        }
    };

    const getGrade = (percentage: number) => {
        if (percentage >= 90) return { label: 'A+', color: 'text-green-600 bg-green-50' };
        if (percentage >= 80) return { label: 'A', color: 'text-green-500 bg-green-50' };
        if (percentage >= 70) return { label: 'B', color: 'text-blue-600 bg-blue-50' };
        if (percentage >= 60) return { label: 'C', color: 'text-yellow-600 bg-yellow-50' };
        if (percentage >= 50) return { label: 'D', color: 'text-orange-600 bg-orange-50' };
        return { label: 'F', color: 'text-red-600 bg-red-50' };
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
                                <option key={e._id} value={e._id} className="bg-slate-900">{e.name} ({e.term})</option>
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
                                <option key={c._id} value={c._id} className="bg-slate-900">{c.name} {c.section && `(${c.section})`}</option>
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
                ) : results.length === 0 ? (
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
                                        <th className="px-8 py-5 text-center">Grade</th>
                                        <th className="px-8 py-5 text-right">Report</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.map((student) => {
                                        const grade = getGrade(student.percentage);
                                        return (
                                            <tr key={student.id} className="hover:bg-white/5 transition-colors group">
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
                                                    <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest ${grade.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-')}`}>
                                                        {grade.label}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <button
                                                        onClick={() => downloadReportCard(student.id, student.firstName)}
                                                        className="p-2.5 text-slate-500 hover:text-white hover:bg-indigo-600 rounded-xl transition-all border border-white/5 hover:border-indigo-500 group-hover:shadow-lg shadow-indigo-500/20"
                                                    >
                                                        <FileDown className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left min-w-max border-collapse">
                                <thead className="text-[10px] uppercase bg-slate-950/50 text-slate-500 font-black tracking-widest border-b border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4 sticky left-0 z-20 bg-slate-950/90 backdrop-blur border-r border-white/5">Student Information</th>
                                        {subjects.map(subject => (
                                            <th key={subject._id} className="px-4 py-4 text-center min-w-[100px]">
                                                {subject.name}
                                            </th>
                                        ))}
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Total</th>
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Avg %</th>
                                        <th className="px-4 py-4 text-center bg-indigo-500/10 text-indigo-400">Rank</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {results.map((student) => (
                                        <tr key={student.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 sticky left-0 bg-slate-900/90 backdrop-blur border-r border-white/5 z-10">
                                                <div className="font-bold text-white mb-0.5">{student.firstName} {student.lastName}</div>
                                                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Adm: {student.admissionNo}</div>
                                            </td>
                                            {subjects.map(subject => {
                                                const mark = student.subjectMarks?.[subject._id];
                                                return (
                                                    <td key={subject._id} className="px-4 py-4 text-center border-l border-white/5 first:border-l-0">
                                                        {mark ? (
                                                            <div>
                                                                <div className="font-bold text-white">{mark.obtained}</div>
                                                                <div className="text-[9px] text-slate-600">/ {mark.max}</div>
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
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
