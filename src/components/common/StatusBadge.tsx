import React from 'react';
import { PipelineStatus } from '../../types';

export interface StatusBadgeProps {
  status: PipelineStatus | 'pwned' | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  variant?: 'default' | 'hardware';
}

/**
 * StatusBadge - Exact dimension, zero-layout-shift status pill
 * Guarantees fixed width & height so card layouts never jitter when status updates
 */
export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({
  status,
  size = 'xs',
  className = '',
  variant = 'default',
}) => {
  const normalized = (status || 'backlog').toLowerCase();

  const getStyle = () => {
    if (variant === 'hardware') {
      switch (normalized) {
        case 'recon':
          return 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-400';
        case 'foothold':
          return 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400';
        case 'root':
        case 'pwned':
          return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400';
        case 'completed':
          return 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-400';
        case 'backlog':
        default:
          return 'bg-zinc-100 dark:bg-zinc-950/80 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400';
      }
    }
    switch (normalized) {
      case 'recon':
        return 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-400';
      case 'foothold':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400';
      case 'root':
      case 'pwned':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400';
      case 'completed':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-400';
      case 'backlog':
      default:
        return 'bg-surface-sunken border-border-subtle text-text-muted';
    }
  };

  const getLabel = () => {
    switch (normalized) {
      case 'recon':
        return 'RECON';
      case 'foothold':
        return 'FOOTHOLD';
      case 'root':
      case 'pwned':
        return 'PWNED';
      case 'completed':
        return 'COMPLETED';
      case 'backlog':
      default:
        return 'BACKLOG';
    }
  };

  const sizeClasses = {
    xs: 'w-[74px] min-w-[74px] h-[20px] text-[9px]',
    sm: 'w-[78px] min-w-[78px] h-[22px] text-[10px]',
    md: 'w-[84px] min-w-[84px] h-[24px] text-xs',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center text-center font-mono font-bold tracking-wider uppercase tabular-nums rounded-[4px] border select-none transition-colors ${sizeClasses} ${getStyle()} ${className}`}
      title={`Target Status: ${getLabel()}`}
    >
      {getLabel()}
    </span>
  );
});
