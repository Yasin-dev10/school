import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Something went wrong', description, onRetry }: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-sm">{description}</p>}
      {onRetry && <Button className="mt-5" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
