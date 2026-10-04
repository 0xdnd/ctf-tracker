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
          return 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/40 text-callout-info-fg';
        case 'foothold':
          return 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/40 text-callout-warn-fg';
        case 'root':
        case 'pwned':
          return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-callout-success-fg';
        case 'completed':
          return 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/40 text-callout-tip-fg';
        case 'backlog':
        default:
          return 'bg-zinc-100 dark:bg-zinc-950/80 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-tertiary';
      }
    }
    switch (normalized) {
      case 'recon':
        return 'bg-sky-500/15 border-sky-500/40 text-callout-info-fg';
      case 'foothold':
        return 'bg-amber-500/15 border-amber-500/40 text-callout-warn-fg';
      case 'root':
      case 'pwned':
        return 'bg-emerald-500/15 border-emerald-500/40 text-callout-success-fg';
      case 'completed':
        return 'bg-purple-500/15 border-purple-500/40 text-callout-tip-fg';
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
