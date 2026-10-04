import React from 'react';

export interface CyberBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md';
  mono?: boolean;
  dot?: boolean;
  dotColor?: string;
  icon?: React.ReactNode;
}

export const CyberBadge: React.FC<CyberBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  mono = false,
  dot = false,
  dotColor,
  icon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 rounded-[4px] gap-1',
    sm: 'text-[10px] px-2 py-0.5 rounded-[4px] gap-1',
    md: 'text-[11px] px-2.5 py-0.5 rounded-[6px] gap-1.5',
  }[size];

  const variantClasses = {
    neutral: 'bg-surface-sunken/80 dark:bg-surface-sunken border border-border-subtle text-text-secondary font-medium',
    accent: 'bg-accent/10 border border-accent/30 text-accent font-semibold',
    success: 'bg-emerald-500/10 border border-emerald-500/30 text-callout-success-fg font-semibold',
    warning: 'bg-amber-500/10 border border-amber-500/30 text-callout-warn-fg font-semibold',
    danger: 'bg-rose-500/10 border border-rose-500/30 text-callout-danger-fg font-semibold',
    info: 'bg-sky-500/10 border border-sky-500/30 text-callout-info-fg font-semibold',
  }[variant];

  const defaultDotColor = {
    neutral: 'bg-slate-400 dark:bg-zinc-500',
    accent: 'bg-accent',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  }[variant];

  return (
    <span
      className={`inline-flex items-center border select-none transition-colors ${mono ? 'font-mono tabular-nums' : 'font-sans'} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor || defaultDotColor}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};

export default CyberBadge;
