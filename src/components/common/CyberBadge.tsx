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
  // Compact, consistent heights: xs 16px, sm (default) 20px, md 24px. Sentence case, no glow.
  const sizeClasses = {
    xs: 'h-4 text-[11px] leading-none px-1 rounded gap-1',
    sm: 'h-5 text-xs leading-none px-1.5 rounded gap-1',
    md: 'h-6 text-xs leading-none px-2 rounded gap-1.5',
  }[size];

  const variantClasses = {
    neutral: 'bg-surface-sunken border-subtle text-secondary font-medium',
    accent: 'bg-accent-muted border-accent/30 text-accent font-medium',
    success: 'bg-callout-success-bg border-callout-success-border text-callout-success-fg font-medium',
    warning: 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg font-medium',
    danger: 'bg-callout-danger-bg border-callout-danger-border text-callout-danger-fg font-medium',
    info: 'bg-callout-info-bg border-callout-info-border text-callout-info-fg font-medium',
  }[variant];

  const defaultDotColor = {
    neutral: 'bg-current opacity-60',
    accent: 'bg-accent',
    success: 'bg-callout-success-fg',
    warning: 'bg-callout-warn-fg',
    danger: 'bg-callout-danger-fg',
    info: 'bg-callout-info-fg',
  }[variant];

  return (
    <span
      className={`inline-flex items-center border select-none whitespace-nowrap transition-colors ${mono ? 'font-mono tabular-nums' : 'font-sans'} ${sizeClasses} ${variantClasses} ${className}`}
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
