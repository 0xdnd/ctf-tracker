import React from 'react';

const TONE = {
  muted: 'text-muted hover:bg-surface-hover hover:text-primary',
  /** Inherits the surrounding text color and turns red on hover (remove / delete). */
  danger: 'hover:text-callout-danger-fg',
} as const;

interface CompactIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: keyof typeof TONE;
}

/**
 * 24px icon button for dense rows (flag reveal and copy, tag remove, tab close). Keeps a visible focus ring and
 * the press scale, and `tap-target-sm` grows the hit area to 44px under a coarse pointer without changing the look.
 * Always give it an `aria-label`.
 */
export const CompactIconButton = React.forwardRef<HTMLButtonElement, CompactIconButtonProps>(function CompactIconButton(
  { tone = 'muted', type = 'button', className = '', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`tap-target-sm inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${TONE[tone]} ${className}`}
      {...rest}
    />
  );
});
