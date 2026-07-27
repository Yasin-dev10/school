import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export function Spinner({ className, label, size = 'md' }: SpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        className,
      )}
    >
      <Loader2
        className={cn('animate-spin text-indigo-500', sizes[size])}
      />
      {label && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" label={label} />
    </div>
  );
}
