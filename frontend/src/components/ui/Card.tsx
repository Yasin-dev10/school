import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export function Card({
  children,
  className,
  padding = 'md',
  elevated = true,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl',
        elevated && 'shadow-[var(--shadow-card)]',
        paddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  icon,
  className,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
