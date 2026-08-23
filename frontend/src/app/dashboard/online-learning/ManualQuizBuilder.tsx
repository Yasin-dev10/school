"use client";

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

type Question = { prompt: string; questionType: 'multiple_choice' | 'written'; options: string[]; correctIndex: number; points: number; modelAnswer: string; keywords: string };
const emptyQuestion = (): Question => ({ prompt: '', questionType: 'multiple_choice', options: ['', '', '', ''], correctIndex: 0, points: 1, modelAnswer: '', keywords: '' });

export function ManualQuizBuilder({ classes, subjects, onCreated, initialQuiz, onCancel }: { classes: any[]; subjects: any[]; onCreated: () => Promise<void>; initialQuiz?: any; onCancel?: () => void }) {
  const editing = Boolean(initialQuiz);
  const localDateTime = (value?: string) => value ? new Date(value).toISOString().slice(0, 16) : '';
  const [form, setForm] = useState({ classId: initialQuiz?.course?.class?.id || '', subjectId: initialQuiz?.course?.subject?.id || '', title: initialQuiz?.title || '', description: initialQuiz?.description || '', passPercent: initialQuiz?.passPercent ?? 50, durationMin: initialQuiz?.durationMin ?? 30, availableFrom: localDateTime(initialQuiz?.availableFrom), deadline: localDateTime(initialQuiz?.deadline) });
  const [questions, setQuestions] = useState<Question[]>(initialQuiz?.questions?.length ? initialQuiz.questions.map((question:any) => ({ prompt: question.prompt, questionType: question.questionType, options: Array.isArray(question.options) && question.options.length ? question.options : ['', '', '', ''], correctIndex: question.correctIndex, points: question.points, modelAnswer: question.modelAnswer || '', keywords: Array.isArray(question.keywords) ? question.keywords.join(', ') : '' })) : [emptyQuestion()]);
  const [saving, setSaving] = useState(false);

  const updateQuestion = (index: number, update: Partial<Question>) => setQuestions(current => current.map((question, questionIndex) => questionIndex === index ? { ...question, ...update } : question));
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => setQuestions(current => current.map((question, index) => index === questionIndex ? { ...question, options: question.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex ? value : option) } : question));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalidIndex = questions.findIndex(question => !question.prompt.trim() || question.points <= 0 || (question.questionType === 'multiple_choice' ? question.options.some(option => !option.trim()) : !question.modelAnswer.trim()));
    if (invalidIndex >= 0) return toast.error(`Complete all required fields in question ${invalidIndex + 1}`);
    setSaving(true);
    try {
      const payload = { ...form, availableFrom: form.availableFrom || null, deadline: form.deadline || null, questions };
      if (editing) await api.put(`/online-learning/quizzes/${initialQuiz.id}`, payload);
      else await api.post('/online-learning/quizzes', payload);
      toast.success(editing ? 'Quiz updated' : 'Manual quiz created and assigned to the class');
      setForm({ classId: '', subjectId: '', title: '', description: '', passPercent: 50, durationMin: 30, availableFrom: '', deadline: '' });
      setQuestions([emptyQuestion()]);
      await onCreated();
      onCancel?.();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Could not create quiz'); }
    finally { setSaving(false); }
  };

  return <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-5">
    <div><h2 className="text-lg font-semibold text-white">{editing ? 'Edit Quiz' : 'Create Manual Quiz'}</h2><p className="text-xs text-slate-400">Add questions, answers, marks, time, deadline, and assign directly to a class.</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      {!editing && <select required value={form.classId} onChange={event => setForm({...form, classId:event.target.value})} className="input-field"><option value="">Select class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name} {item.section}</option>)}</select>}
      {!editing && <select value={form.subjectId} onChange={event => setForm({...form, subjectId:event.target.value})} className="input-field"><option value="">Select subject (optional for admin)</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      <input required value={form.title} onChange={event => setForm({...form, title:event.target.value})} placeholder="Quiz title" className="input-field" />
      <input type="number" min="1" max="300" value={form.durationMin} onChange={event => setForm({...form, durationMin:Number(event.target.value)})} placeholder="Duration (minutes)" className="input-field" />
      <label className="text-xs text-slate-400">Opens at<input type="datetime-local" value={form.availableFrom} onChange={event => setForm({...form, availableFrom:event.target.value})} className="input-field mt-1 w-full" /></label>
      <label className="text-xs text-slate-400">Deadline<input required type="datetime-local" value={form.deadline} onChange={event => setForm({...form, deadline:event.target.value})} className="input-field mt-1 w-full" /></label>
      <label className="text-xs text-slate-400">Pass percentage<input type="number" min="0" max="100" value={form.passPercent} onChange={event => setForm({...form, passPercent:Number(event.target.value)})} className="input-field mt-1 w-full" /></label>
      <textarea value={form.description} onChange={event => setForm({...form, description:event.target.value})} placeholder="Instructions (optional)" className="input-field" />
    </div>

    <div className="space-y-4">{questions.map((question, questionIndex) => <fieldset key={questionIndex} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-3">
      <div className="flex items-center justify-between"><legend className="font-semibold text-white">Question {questionIndex + 1}</legend>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, index) => index !== questionIndex))} className="text-rose-400"><Trash2 className="w-4"/></button>}</div>
      <select value={question.questionType} onChange={event => updateQuestion(questionIndex, { questionType:event.target.value as Question['questionType'] })} className="input-field w-full"><option value="multiple_choice">Multiple choice</option><option value="written">Written answer</option></select>
      <input required value={question.prompt} onChange={event => updateQuestion(questionIndex, { prompt:event.target.value })} placeholder="Write the question" className="input-field w-full" />
      {question.questionType === 'multiple_choice' ? <div className="grid gap-2 md:grid-cols-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex items-center gap-2 text-xs text-slate-400"><input type="radio" name={`correct-${questionIndex}`} checked={question.correctIndex === optionIndex} onChange={() => updateQuestion(questionIndex, { correctIndex:optionIndex })} /><input required value={option} onChange={event => updateOption(questionIndex, optionIndex, event.target.value)} placeholder={`Answer ${optionIndex + 1}`} className="input-field flex-1" /></label>)}</div> : <div className="space-y-2"><textarea required value={question.modelAnswer} onChange={event => updateQuestion(questionIndex, { modelAnswer:event.target.value })} placeholder="Teacher model answer" className="input-field w-full"/><input value={question.keywords} onChange={event => updateQuestion(questionIndex, { keywords:event.target.value })} placeholder="Important keywords, separated by commas (optional)" className="input-field w-full"/><p className="text-xs text-slate-400">If keywords are empty, they are generated from the model answer automatically.</p></div>}
      <label className="block text-xs text-slate-400">Marks<input type="number" min="1" max="100" value={question.points} onChange={event => updateQuestion(questionIndex, { points:Number(event.target.value) })} className="input-field mt-1 w-28" /></label>
    </fieldset>)}</div>
    <div className="flex flex-wrap justify-between gap-3"><button type="button" onClick={() => setQuestions(current => [...current, emptyQuestion()])} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-white"><Plus className="w-4"/> Add question</button><div className="flex gap-2">{editing && <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-slate-300">Cancel</button>}<button disabled={saving || (!editing && !classes.length)} className="btn-primary disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Create & assign quiz'}</button></div></div>
  </form>;
}
