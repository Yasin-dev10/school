"use client";

import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, CheckCircle2, CirclePlay, FileUp, Lock, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { ManualQuizBuilder } from './ManualQuizBuilder';

type Lesson = { id: string; title: string; description?: string; videoUrl: string; durationMin?: number; progress: { completed: boolean }[] };
type Quiz = { id: string; title: string; passPercent: number; _count: { questions: number }; attempts: { percentage: number; passed: boolean; completedAt?: string }[] };
type Course = { id: string; title: string; description?: string; published: boolean; progressPercent: number; class: { name: string; section: string }; subject?: { name: string }; lessons: Lesson[]; quizzes: Quiz[] };

export default function OnlineLearningPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [user, setUser] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [pdfQuiz, setPdfQuiz] = useState<{ classId: string; subjectId: string; title: string; questionCount: number; file: File | null }>({ classId: '', subjectId: '', title: '', questionCount: 5, file: null });
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [resultAttempt, setResultAttempt] = useState<any>(null);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const canManage = ['teacher', 'school-admin', 'super-admin'].includes(user.role);

  const load = async () => {
    try {
      const response = await api.get('/online-learning/courses');
      setCourses(response.data.data || []);
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not load courses'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const current = JSON.parse(localStorage.getItem('user') || '{}'); setUser(current); load();
    if (['teacher', 'school-admin', 'super-admin'].includes(current.role)) {
      Promise.allSettled([api.get('/classes'), api.get('/subjects')]).then(([classResult, subjectResult]) => {
        if (classResult.status === 'fulfilled') setClasses(classResult.value.data.data || []);
        else toast.error(classResult.reason?.response?.data?.message || 'Could not load classes');
        if (subjectResult.status === 'fulfilled') setSubjects(subjectResult.value.data.data || []);
        else toast.error(subjectResult.reason?.response?.data?.message || 'Could not load subjects');
      });
    }
  }, []);

  const createQuizFromPdf = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pdfQuiz.file) return toast.error('Select a PDF first');
    const formData = new FormData();
    formData.append('pdf', pdfQuiz.file);
    formData.append('classId', pdfQuiz.classId);
    formData.append('subjectId', pdfQuiz.subjectId);
    formData.append('title', pdfQuiz.title);
    formData.append('questionCount', String(pdfQuiz.questionCount));
    setBusy('pdf-quiz');
    try {
      await api.post('/online-learning/quizzes/from-pdf', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPdfQuiz({ classId: '', subjectId: '', title: '', questionCount: 5, file: null });
      toast.success('PDF quiz created');
      await load();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not create quiz from PDF'); }
    finally { setBusy(''); }
  };

  const openQuiz = async (id: string) => {
    try {
      const response = await api.get(`/online-learning/quizzes/${id}`);
      setActiveQuiz(response.data.data); setAnswers([]);
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not open quiz'); }
  };
  const openQuizResults = async (id: string) => {
    setBusy(`results-${id}`);
    try { const response = await api.get(`/online-learning/quizzes/${id}/results`); setResultAttempt(null); setQuizResults(response.data.data); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not load quiz results'); }
    finally { setBusy(''); }
  };
  const editQuiz = async (id: string) => {
    setBusy(`edit-${id}`);
    try { const response = await api.get(`/online-learning/quizzes/${id}/results`); setEditingQuiz(response.data.data); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not load quiz'); }
    finally { setBusy(''); }
  };
  const deleteQuiz = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" and all of its results? This cannot be undone.`)) return;
    setBusy(`delete-${id}`);
    try { await api.delete(`/online-learning/quizzes/${id}`); toast.success('Quiz deleted'); await load(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not delete quiz'); }
    finally { setBusy(''); }
  };
  const submitQuiz = async () => {
    if (answers.length !== activeQuiz.questions.length || answers.some(answer => answer === undefined || String(answer).trim() === '')) return toast.error('Answer every question first');
    setBusy('submit');
    try { const response = await api.post(`/online-learning/quizzes/${activeQuiz.id}/submit`, { answers }); setActiveQuiz(null); if (document.fullscreenElement) await document.exitFullscreen(); toast.success(`Automatically graded: ${response.data.data.percentage}%`); await load(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not submit quiz'); }
    finally { setBusy(''); }
  };
  const completeLesson = async (lessonId: string) => {
    try { await api.put(`/online-learning/lessons/${lessonId}/progress`, { completed: true }); toast.success('Lesson completed'); await load(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Could not update lesson'); }
  };

  useEffect(() => {
    if (!activeQuiz) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const keepQuizOpen = () => { window.history.pushState({ quizLocked: true }, '', window.location.href); toast.error('Submit or exit the quiz before leaving'); };
    const blockNavigationKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === 'F5' || (event.ctrlKey && ['l', 'r', 't', 'n', 'w'].includes(key)) || (event.altKey && ['arrowleft', 'arrowright'].includes(key))) {
        event.preventDefault();
        toast.error('Navigation is locked while the quiz is open');
      }
    };
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();
    window.history.pushState({ quizLocked: true }, '', window.location.href);
    window.addEventListener('beforeunload', warnBeforeLeaving);
    window.addEventListener('popstate', keepQuizOpen);
    window.addEventListener('keydown', blockNavigationKeys, true);
    window.addEventListener('contextmenu', blockContextMenu);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
      window.removeEventListener('popstate', keepQuizOpen);
      window.removeEventListener('keydown', blockNavigationKeys, true);
      window.removeEventListener('contextmenu', blockContextMenu);
    };
  }, [activeQuiz]);

  const exitQuiz = async () => {
    if (!window.confirm('Exit this quiz? Your answers will be lost.')) return;
    setActiveQuiz(null); setAnswers([]);
    if (document.fullscreenElement) await document.exitFullscreen();
    await load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading online learning…</div>;

  return <div className="space-y-6 p-4 md:p-8">
    <div className={`${user.role === 'student' ? 'rounded-3xl bg-[#405bb2] p-6 text-white shadow-lg shadow-indigo-900/10 sm:p-8' : ''}`}><h1 className={`text-2xl font-bold ${user.role === 'student' ? 'text-white' : 'text-white'}`}>{user.role === 'student' ? 'Online Learning' : 'Class Quizzes'}</h1><p className={user.role === 'student' ? 'text-indigo-100' : 'text-slate-400'}>{user.role === 'student' ? 'Recorded lessons, quizzes and your learning progress.' : 'Choose a class, upload a PDF, and automatically create a graded quiz.'}</p></div>

    {canManage && <div className="max-w-2xl">
      <form onSubmit={createQuizFromPdf} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-white flex gap-2"><FileUp className="w-5"/> Create quiz from PDF</h2>
        <select required value={pdfQuiz.classId} onChange={event => setPdfQuiz({...pdfQuiz, classId: event.target.value})} className="input-field w-full"><option value="">Select class</option>{classes.map(academicClass => <option key={academicClass.id} value={academicClass.id}>{academicClass.name} {academicClass.section}</option>)}</select>
        <select value={pdfQuiz.subjectId} onChange={event => setPdfQuiz({...pdfQuiz, subjectId: event.target.value})} className="input-field w-full"><option value="">Select subject (optional for admin)</option>{subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <input required placeholder="Quiz title" value={pdfQuiz.title} onChange={event => setPdfQuiz({...pdfQuiz, title: event.target.value})} className="input-field w-full" />
        <input required type="file" accept="application/pdf,.pdf" onChange={event => setPdfQuiz({...pdfQuiz, file: event.target.files?.[0] || null})} className="input-field w-full" />
        <label className="block text-xs text-slate-400">Number of questions<input type="number" min="3" max="20" value={pdfQuiz.questionCount} onChange={event => setPdfQuiz({...pdfQuiz, questionCount: Number(event.target.value)})} className="input-field mt-1 w-full" /></label>
        <p className="text-xs text-slate-400">Supports Arabic, English, Somali, and math equations. The PDF is processed locally and deleted after the quiz is created.</p>
        <button disabled={busy === 'pdf-quiz' || !classes.length} className="btn-primary w-full disabled:opacity-50">{busy === 'pdf-quiz' ? 'Reading PDF…' : 'Upload PDF & create quiz'}</button>
      </form>
      <ManualQuizBuilder classes={classes} subjects={subjects} onCreated={load} />
    </div>}

    {!courses.length ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900">No online lessons or quizzes available yet.</div> : <div className="grid gap-5 lg:grid-cols-2">{courses.map(course => <section key={course.id} className="rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-700"><div className="flex justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">{course.title}</h2><p className="text-sm text-slate-400">{course.class.name} {course.class.section} {course.subject ? `• ${course.subject.name}` : ''}</p></div><BookOpen className="text-indigo-400"/></div><p className="mt-2 text-sm text-slate-300">{course.description}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{width:`${course.progressPercent}%`}}/></div><p className="mt-1 text-xs text-slate-400">Course progress: {course.progressPercent}%</p></div>
      <div className="p-5 space-y-3"><h3 className="text-sm font-semibold text-slate-300">Recorded lessons</h3>{course.lessons.map(lesson => <div key={lesson.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 p-3"><a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0"><CirclePlay className="text-indigo-400 shrink-0"/><span className="truncate text-white">{lesson.title}</span></a>{user.role==='student' && <button onClick={() => completeLesson(lesson.id)} className="text-xs text-emerald-400">{lesson.progress[0]?.completed ? 'Completed ✓' : 'Mark complete'}</button>}</div>)}
      <h3 className="pt-2 text-sm font-semibold text-slate-300">Quizzes</h3>{course.quizzes.map(quiz => <div key={quiz.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-800 p-3"><div><p className="text-white">{quiz.title}</p><p className="text-xs text-slate-400">{quiz._count.questions} questions {quiz.attempts[0] ? (quiz.attempts[0].completedAt ? `• Score ${quiz.attempts[0].percentage}%` : '• Attempt already started') : ''}</p></div>{user.role==='student' && <button disabled={Boolean(quiz.attempts[0])} onClick={() => openQuiz(quiz.id)} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-600">{quiz.attempts[0] ? 'Already attempted' : 'Take quiz'}</button>}{canManage && <div className="flex flex-wrap justify-end gap-2"><button disabled={busy === `results-${quiz.id}`} onClick={() => openQuizResults(quiz.id)} className="flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs text-white disabled:opacity-50"><BarChart3 className="w-4"/>Results</button><button disabled={busy === `edit-${quiz.id}`} onClick={() => editQuiz(quiz.id)} className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-2 text-xs text-white disabled:opacity-50"><Pencil className="w-4"/>Edit</button><button disabled={busy === `delete-${quiz.id}`} onClick={() => deleteQuiz(quiz.id, quiz.title)} className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 text-xs text-white disabled:opacity-50"><Trash2 className="w-4"/>Delete</button></div>}</div>)}</div>
    </section>)}</div>}

    {editingQuiz && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"><div className="mx-auto max-w-3xl"><ManualQuizBuilder classes={classes} subjects={subjects} initialQuiz={editingQuiz} onCancel={() => setEditingQuiz(null)} onCreated={load}/></div></div>}

    {quizResults && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-white">{quizResults.title}</h2><p className="text-sm text-slate-400">{quizResults.course.class.name} {quizResults.course.class.section}{quizResults.course.subject ? ` • ${quizResults.course.subject.name}` : ''}</p></div><button onClick={() => { setQuizResults(null); setResultAttempt(null); }} className="text-slate-400 hover:text-white" aria-label="Close results"><X/></button></div><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">{[['Entered',quizResults.summary.entered],['Submitted',quizResults.summary.submitted],['In progress',quizResults.summary.inProgress],['Passed',quizResults.summary.passed],['Average',`${quizResults.summary.averagePercentage}%`]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-slate-800 p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-white">{value}</p></div>)}</div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-3">Student</th><th className="p-3">Student ID</th><th className="p-3">Score</th><th className="p-3">Percentage</th><th className="p-3">Status</th><th className="p-3">Time</th><th className="p-3">Answers</th></tr></thead><tbody>{quizResults.attempts.map((attempt:any) => <tr key={attempt.id} className="border-b border-slate-800 text-slate-200"><td className="p-3">{attempt.student.firstName} {attempt.student.lastName}</td><td className="p-3">{attempt.student.studentId || attempt.student.admissionNo || '—'}</td><td className="p-3">{attempt.completedAt ? `${attempt.score}/${attempt.totalPoints}` : '—'}</td><td className="p-3">{attempt.completedAt ? `${attempt.percentage}%` : '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${!attempt.completedAt ? 'bg-amber-500/15 text-amber-300' : attempt.passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{!attempt.completedAt ? 'In progress' : attempt.passed ? 'Passed' : 'Failed'}</span></td><td className="p-3 text-slate-400">{new Date(attempt.submittedAt).toLocaleString()}</td><td className="p-3"><button disabled={!attempt.completedAt} onClick={() => setResultAttempt(attempt)} className="text-sky-400 disabled:text-slate-600">View answers</button></td></tr>)}</tbody></table>{!quizResults.attempts.length && <p className="py-10 text-center text-slate-400">No students have entered this quiz yet.</p>}</div>{resultAttempt && <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950 p-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold text-white">{resultAttempt.student.firstName} {resultAttempt.student.lastName} — Answers</h3><p className="text-xs text-slate-400">Score: {resultAttempt.score}/{resultAttempt.totalPoints} ({resultAttempt.percentage}%)</p></div><button onClick={() => setResultAttempt(null)} className="text-slate-400"><X className="w-4"/></button></div><div className="mt-4 space-y-4">{quizResults.questions.map((question:any, index:number) => { const studentAnswer=resultAttempt.answers?.[index]; const displayedAnswer=question.questionType === 'written' ? String(studentAnswer || 'No answer') : String(question.options?.[Number(studentAnswer)] ?? 'No answer'); const expectedAnswer=question.questionType === 'written' ? question.modelAnswer : String(question.options?.[question.correctIndex] ?? ''); return <div key={question.id} className="rounded-lg bg-slate-900 p-3 text-sm"><p className="font-medium text-white">{index+1}. {question.prompt} <span className="text-slate-400">({question.points} marks)</span></p><p className="mt-2 text-slate-300"><span className="text-slate-500">Student answer:</span> {displayedAnswer}</p><p className="mt-1 text-emerald-300"><span className="text-slate-500">Expected answer:</span> {expectedAnswer}</p>{question.questionType === 'written' && question.keywords?.length > 0 && <p className="mt-1 text-xs text-slate-400">Keywords: {question.keywords.join(', ')}</p>}</div>; })}</div></div>}</div></div>}

    {activeQuiz && <div className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center"><div className="w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 p-6"><p className="mb-2 flex items-center gap-2 text-xs text-amber-300"><Lock className="w-4"/> Focus mode: submit or explicitly exit before leaving</p><h2 className="text-xl font-bold text-white">{activeQuiz.title}</h2><div className="mt-5 space-y-6">{activeQuiz.questions.map((q:any, qi:number) => <fieldset key={q.id}><legend className="mb-2 text-white">{qi+1}. {q.prompt}</legend>{q.questionType === 'written' ? <textarea value={typeof answers[qi] === 'string' ? answers[qi] : ''} onChange={event => { const next=[...answers]; next[qi]=event.target.value; setAnswers(next); }} placeholder="Write your answer here…" rows={5} className="input-field w-full"/> : q.options.map((option:string, oi:number) => <label key={oi} className="flex gap-2 py-1 text-slate-300"><input type="radio" name={q.id} checked={answers[qi]===oi} onChange={() => { const next=[...answers]; next[qi]=oi; setAnswers(next); }}/>{option}</label>)}</fieldset>)}</div><div className="mt-6 flex justify-end gap-3"><button onClick={exitQuiz} className="px-4 py-2 text-slate-300">Exit quiz</button><button disabled={busy === 'submit'} onClick={submitQuiz} className="btn-primary flex gap-2 disabled:opacity-50"><CheckCircle2 className="w-4"/> {busy === 'submit' ? 'Submitting…' : 'Submit & grade'}</button></div></div></div>}
  </div>;
}
