import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CyberButton } from './CyberButton';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
  className?: string;
}

/** Calm, centered placeholder for lists and panels with nothing to show yet. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className = '',
}) => {
  const ActionIcon = action?.icon;
  return (
    <div
      className={`flex flex-col items-center justify-center text-center font-sans ${
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12'
      } ${className}`}
    >
      {Icon && (
        <div
          className={`flex items-center justify-center rounded-xl border border-subtle bg-surface-sunken text-muted ${
            compact ? 'h-9 w-9' : 'h-12 w-12'
          }`}
        >
          <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
        </div>
      )}
      <h3 className={`font-semibold text-primary ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      {description && <p className="max-w-sm text-sm text-secondary">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <CyberButton
              variant="primary"
              size={compact ? 'sm' : 'md'}
              iconLeft={ActionIcon ? <ActionIcon className="h-4 w-4" aria-hidden="true" /> : undefined}
              onClick={action.onClick}
            >
              {action.label}
            </CyberButton>
          )}
          {secondaryAction && (
            <CyberButton variant="ghost" size={compact ? 'sm' : 'md'} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </CyberButton>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
