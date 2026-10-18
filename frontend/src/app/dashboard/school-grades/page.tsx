"use client";
import { useState, useEffect } from 'react';
import { Check, Loader2, Layers, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

/* ─── Data ───────────────────────────────────────────────────────────────── */
interface GradeLevel { id: string; name: string; grades: string[]; emoji: string; color: string }

const GRADE_LEVELS: GradeLevel[] = [
    {
        id: 'elementary',
        name: 'Elementary School',
        grades: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade'],
        emoji: '🧸',
        color: 'from-pink-500/20 to-orange-500/20',
    },
    {
        id: 'middle',
        name: 'Middle School',
        grades: ['6th Grade', '7th Grade', '8th Grade'],
        emoji: '📚',
        color: 'from-cyan-500/20 to-blue-500/20',
    },
    {
        id: 'high',
        name: 'High School',
        grades: ['9th Grade', '10th Grade', '11th Grade', '12th Grade'],
        emoji: '🎓',
        color: 'from-violet-500/20 to-indigo-500/20',
    },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function SchoolGradesPage() {
    const [selected, setSelected] = useState<string[]>([]);
    const [loading, setLoading]   = useState(true);
    const [saving,  setSaving]    = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/tenants/me');
                setSelected(res.data.data?.config?.gradeLevels || ['elementary', 'middle', 'high']);
            } catch {
                setSelected(['elementary', 'middle', 'high']);
                toast.error('Failed to load grade settings');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const toggle = (id: string) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSave = async () => {
        if (!selected.length) { toast.error('Select at least one grade level'); return; }
        setSaving(true);
        try {
            await api.put('/tenants/me', { config: { gradeLevels: selected } });
            toast.success('School grades updated!');
        } catch {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"><Layers className="h-3 w-3" /> Academic setup</span>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Grade levels</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Choose which grade bands your school uses. Your selection shapes the grade options available in class setup.</p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-200"><GraduationCap className="h-5 w-5" /></span>
                    <span><span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Selected levels</span><strong className="block text-xl font-black text-slate-900 dark:text-white">{selected.length} <span className="text-xs font-semibold text-slate-400">of {GRADE_LEVELS.length}</span></strong></span>
                </div>
            </header>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div><h2 className="text-base font-bold text-slate-900 dark:text-white">School curriculum range</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select one or more levels and save your changes.</p></div>
                    <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-flex">{GRADE_LEVELS.reduce((sum, level) => sum + level.grades.length, 0)} grade options</span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {GRADE_LEVELS.map(level => {
                        const isOn = selected.includes(level.id);
                        return (
                            <button
                                key={level.id}
                                type="button"
                                onClick={() => toggle(level.id)}
                                aria-pressed={isOn}
                                className={`relative flex min-h-64 flex-col overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isOn ? 'border-cyan-400 bg-cyan-50/70 shadow-md shadow-cyan-900/5 ring-1 ring-cyan-300/50 dark:border-cyan-500/60 dark:bg-cyan-400/[0.08]' : 'border-slate-200 bg-slate-50/70 hover:border-cyan-200 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-cyan-500/40'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${level.color} text-3xl`}>{level.emoji}</span>
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${isOn ? 'border-cyan-600 bg-cyan-600 text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-slate-950' : 'border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-800'}`}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>
                                </div>
                                <div className="mt-5">
                                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{level.name}</h3>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{level.grades.length} available grades</p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-1.5">
                                    {level.grades.map(g => <span key={g} className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${isOn ? 'border-cyan-200 bg-white text-cyan-900 dark:border-cyan-400/20 dark:bg-slate-900/60 dark:text-cyan-100' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400'}`}>{g}</span>)}
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selected.map(id => GRADE_LEVELS.find(level => level.id === id)?.name).filter(Boolean).join(' · ') || 'No grade levels selected'}</p>
                    <button onClick={handleSave} disabled={saving || selected.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-5 py-3 text-sm font-bold text-white shadow-md shadow-blue-950/10 transition hover:bg-cyan-700 disabled:pointer-events-none disabled:opacity-50">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save grade levels'}
                    </button>
                </div>
            </section>
        </div>
    );
}
