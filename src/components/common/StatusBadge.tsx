import React from 'react';
import { PipelineStatus } from '../../types';
import { getStatusTone } from '../../utils/categoryUtils';

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

  const getStyle = () => getStatusTone(normalized).badge;

  const getLabel = () => {
    switch (normalized) {
      case 'recon':
        return 'Recon';
      case 'foothold':
        return 'Foothold';
      case 'root':
      case 'pwned':
        return 'Pwned';
      case 'completed':
        return 'Completed';
      case 'backlog':
      default:
        return 'Backlog';
    }
  };

  // Fixed width + height so card layouts never jitter when status changes (h-5 / h-6 / h-7).
  const sizeClasses = {
    xs: 'w-[74px] min-w-[74px] h-5 text-xs',
    sm: 'w-[78px] min-w-[78px] h-6 text-xs',
    md: 'w-[84px] min-w-[84px] h-7 text-sm',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center text-center font-sans font-medium tabular-nums rounded border select-none whitespace-nowrap transition-colors ${sizeClasses} ${getStyle()} ${className}`}
      title={`Target Status: ${getLabel()}`}
    >
      {getLabel()}
    </span>
  );
});
