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
