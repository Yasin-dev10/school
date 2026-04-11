"use client";
import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

interface GradeLevel {
    id: string;
    name: string;
    grades: string[];
}

const GRADE_LEVELS: GradeLevel[] = [
    {
        id: 'elementary',
        name: 'Elementary School',
        grades: ['Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade']
    },
    {
        id: 'middle',
        name: 'Middle School',
        grades: ['6th Grade', '7th Grade', '8th Grade']
    },
    {
        id: 'high',
        name: 'High School',
        grades: ['9th Grade', '10th Grade', '11th Grade', '12th Grade']
    }
];

export default function SchoolGradesPage() {
    const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/tenants/me');
                if (res.data.data?.config?.gradeLevels) {
                    setSelectedLevels(res.data.data.config.gradeLevels);
                } else {
                    setSelectedLevels(['elementary', 'middle', 'high']);
                }
            } catch (error) {
                console.error('Failed to fetch settings:', error);
                toast.error('Failed to load grade settings');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const toggleGradeLevel = (levelId: string) => {
        setSelectedLevels(prev => {
            if (prev.includes(levelId)) {
                return prev.filter(id => id !== levelId);
            } else {
                return [...prev, levelId];
            }
        });
    };

    const handleSave = async () => {
        if (selectedLevels.length === 0) {
            toast.error('Please select at least one grade level');
            return;
        }

        setSaving(true);
        try {
            await api.put('/tenants/me', {
                config: {
                    gradeLevels: selectedLevels
                }
            });
            toast.success('School grades updated successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Choose the School Grades you'll be managing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-medium">
                        Select the grade levels that apply to your institution. This will customize the options available in classes and subjects.
                    </p>
                </div>

                {/* Grade Level Cards */}
                <div className="space-y-4">
                    {GRADE_LEVELS.map((level) => {
                        const isSelected = selectedLevels.includes(level.id);

                        return (
                            <div
                                key={level.id}
                                onClick={() => toggleGradeLevel(level.id)}
                                className={`
                                    relative p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.01]
                                    ${isSelected
                                        ? 'bg-teal-500/10 border-teal-500 shadow-xl shadow-teal-500/10'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-6">
                                    {/* Checkbox */}
                                    <div className={`
                                        flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300
                                        ${isSelected
                                            ? 'bg-teal-600 shadow-lg shadow-teal-500/30'
                                            : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700'
                                        }
                                    `}>
                                        {isSelected && <Check className="w-6 h-6 text-white" strokeWidth={3} />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                            {level.name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-500 font-bold uppercase tracking-wider">Included Grades:</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {level.grades.map((grade, idx) => (
                                                    <span key={idx} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-semibold border border-slate-200 dark:border-slate-700">
                                                        {grade}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save Button */}
                <div className="flex flex-col items-center gap-6 pt-8">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="
                            px-16 py-4 bg-teal-600 hover:bg-teal-700 
                            text-white font-black text-lg rounded-2xl 
                            shadow-2xl shadow-teal-600/30 hover:shadow-teal-600/50
                            transition-all duration-300 transform hover:scale-105 active:scale-95
                            disabled:opacity-50 disabled:pointer-events-none
                            flex items-center gap-3
                        "
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Saving Changes...</span>
                            </>
                        ) : (
                            <span>Save & Continue</span>
                        )}
                    </button>

                    {/* Selected Summary */}
                    {selectedLevels.length > 0 && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <p className="text-sm text-slate-500 font-medium">
                                Selected: <span className="text-teal-600 dark:text-teal-400 font-bold">
                                    {selectedLevels.map(id =>
                                        GRADE_LEVELS.find(l => l.id === id)?.name
                                    ).join(', ')}
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
