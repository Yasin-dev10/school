import React from 'react';
import { usePermission, ACTIONS } from '../hooks/usePermission';

interface ReadOnlyFieldProps {
    resource: string;
    action?: string; // Action required to EDIT (default UPDATE)
    children: React.ReactNode; // The editable field (e.g. Input)
    value: React.ReactNode; // The read-only display value
    label?: string;
    className?: string;
}

export const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
    resource,
    action = ACTIONS.UPDATE,
    children,
    value,
    label,
    className = ""
}) => {
    const { hasPermission } = usePermission();

    // Check if user has permission to UPDATE (or specified action)
    const canEdit = hasPermission(resource, action);

    if (canEdit) {
        return <>{children}</>;
    }

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && <label className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</label>}
            <div className="flex items-center px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300">
                {value || <span className="text-slate-400 italic">Not set</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    Read-only
                </span>
            </div>
        </div>
    );
};
