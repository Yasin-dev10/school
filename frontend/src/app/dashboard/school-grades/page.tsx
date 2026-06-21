"use client";
import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
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

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

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

    const progressPct = (CURRENT_STEP / TOTAL_STEPS) * 100;

    return (
        <div className="relative min-h-[80vh] flex flex-col items-center py-8 px-4 overflow-hidden">
            {/* Background glow blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-2xl space-y-8">
                {/* Step indicator */}
                <div className="space-y-2">
                    <p className="text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
                        Setup Stage: {CURRENT_STEP} of {TOTAL_STEPS} — Select Grades
                    </p>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center space-y-3">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                        Choose the School Grades<br className="hidden sm:block" /> you'll be managing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
                        Select the grade levels that apply to your institution. This will customize the options available in classes and subjects.
                    </p>
                </div>

                {/* Cards */}
                <div className="space-y-4">
                    {GRADE_LEVELS.map(level => {
                        const isOn = selected.includes(level.id);
                        return (
                            <button
                                key={level.id}
                                type="button"
                                onClick={() => toggle(level.id)}
                                className={`
                                    w-full text-left relative flex items-center gap-5 px-6 py-5 rounded-2xl border-2
                                    transition-all duration-200 cursor-pointer overflow-hidden
                                    ${isOn
                                        ? 'border-cyan-400 dark:border-cyan-500 bg-white/5 dark:bg-white/5 shadow-lg shadow-cyan-500/10'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                                    }
                                `}
                            >
                                {/* Gradient glow when selected */}
                                {isOn && (
                                    <div className={`absolute inset-0 bg-gradient-to-r ${level.color} opacity-40 pointer-events-none`} />
                                )}

                                {/* Teal circle checkbox */}
                                <div className={`
                                    relative z-10 shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                    ${isOn
                                        ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/40'
                                        : 'bg-transparent border-slate-300 dark:border-slate-600'
                                    }
                                `}>
                                    {isOn && <Check className="w-5 h-5 text-white" strokeWidth={3} />}
                                </div>

                                {/* Text */}
                                <div className="relative z-10 flex-1 min-w-0">
                                    <h3 className={`text-lg font-black mb-1.5 ${isOn ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                        {level.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            Included Grades:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {level.grades.map(g => (
                                                <span key={g} className={`
                                                    text-xs px-2.5 py-0.5 rounded-md font-semibold border transition-colors
                                                    ${isOn
                                                        ? 'bg-white/10 border-white/20 text-white/80'
                                                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                                                    }
                                                `}>
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Emoji icon */}
                                <div className="relative z-10 shrink-0 text-5xl leading-none select-none hidden sm:block">
                                    {level.emoji}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Save */}
                <div className="flex flex-col items-center gap-4 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving || selected.length === 0}
                        className="px-14 py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-white font-black text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2.5"
                    >
                        {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save & Continue'}
                    </button>

                    {selected.length > 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Selected:{' '}
                            <span className="text-cyan-500 font-bold">
                                {selected.map(id => GRADE_LEVELS.find(l => l.id === id)?.name).filter(Boolean).join(', ')}
                            </span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
