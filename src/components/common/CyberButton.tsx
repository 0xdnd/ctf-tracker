import React from 'react';
import { Loader2 } from 'lucide-react';
import { playCyberSound } from '../../utils/helpers';
import { useCtfStore } from '../../store/useCtfStore';

export type CyberButtonVariant =
  | 'default'     // Calm tactical slate/zinc surface
  | 'primary'     // Theme-locked accent CTA (Sky in Obsidian/Monolith, Neon Lime in HTB)
  | 'secondary'   // Muted surface-card button with subtle border
  | 'danger'      // Crimson/rose destructive action
  | 'ghost'       // Borderless transparent button
  | 'outline'     // Clean 1px border with transparent body
  | 'hardware';   // Specular etched cyber chip button

export type CyberButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: CyberButtonVariant;
  size?: CyberButtonSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
  soundType?: 'click' | 'toggle' | 'root' | 'flag' | 'copy';
  soundEnabled?: boolean;
}

export const CyberButton = React.forwardRef<HTMLButtonElement, CyberButtonProps>(({
  children,
  variant = 'default',
  size = 'md',
  iconLeft,
  iconRight,
  isLoading = false,
  disabled = false,
  soundType = 'click',
  soundEnabled: explicitSound,
  className = '',
  onClick,
  type = 'button',
  ...props
}, ref) => {
  const storeSoundEnabled = useCtfStore((s) => s.soundEnabled);
  const soundEnabled = explicitSound ?? storeSoundEnabled;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    if (soundEnabled && soundType) {
      playCyberSound(soundType);
    }
    onClick?.(e);
  };

  // Concentric Radii & Sizing Matrix:
  // xs: 24px height, 6px radius (rounded-sm)
  // sm: 28px height, 8px radius (rounded-md)
  // md: 34px height, 8px radius (rounded-md)
  // lg: 40px height, 10px radius (rounded-lg)
  const sizeClasses: Record<CyberButtonSize, string> = {
    xs: 'h-6 px-2 text-[10px] gap-1 rounded-sm',
    sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
    md: 'h-8.5 px-3 py-1.5 text-xs gap-2 rounded-md',
    lg: 'h-10 px-4 py-2 text-sm gap-2.5 rounded-lg',
  };

  const iconSizes: Record<CyberButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  // Semantic Token Variant Matrix (WCAG AAA in both Dark and Light modes):
  const variantClasses: Record<CyberButtonVariant, string> = {
    default:
      'bg-slate-100 hover:bg-slate-200/90 dark:bg-surface-elevated dark:hover:bg-surface-hover ' +
      'border border-slate-300/80 dark:border-border-subtle ' +
      'text-slate-800 dark:text-text-primary hover:text-slate-950 dark:hover:text-white ' +
      'shadow-xs dark:shadow-none machined-edge',
    
    primary:
      'bg-accent hover:brightness-105 active:brightness-95 ' +
      'text-slate-950 font-bold ' +
      'border border-accent shadow-xs',

    secondary:
      'bg-surface-card hover:bg-surface-hover ' +
      'border border-border-subtle hover:border-border-strong ' +
      'text-text-primary dark:text-text-primary ' +
      'shadow-xs',

    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/25 ' +
      'border border-rose-500/40 hover:border-rose-500/60 ' +
      'text-rose-700 dark:text-rose-400 font-semibold',

    ghost:
      'bg-transparent hover:bg-surface-hover ' +
      'border border-transparent ' +
      'text-text-secondary hover:text-text-primary',

    outline:
      'bg-transparent hover:bg-surface-card ' +
      'border border-border-subtle hover:border-border-strong ' +
      'text-text-primary',

    hardware:
      'bg-zinc-100 dark:bg-zinc-950/80 hover:bg-zinc-200 dark:hover:bg-zinc-900 ' +
      'border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 ' +
      'text-zinc-800 dark:text-zinc-200 font-mono text-[10px] tracking-wider uppercase ' +
      'machined-edge',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      onClick={handleClick}
      className={`inline-flex items-center justify-center font-medium select-none cursor-pointer transition-all duration-150 ` +
        `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface-base ` +
        `active:scale-[0.97] ` +
        `disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed ` +
        `${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin flex-shrink-0`} />
      ) : iconLeft ? (
        <span className="flex-shrink-0 flex items-center">{iconLeft}</span>
      ) : null}

      <span className="truncate">{children}</span>

      {!isLoading && iconRight && (
        <span className="flex-shrink-0 flex items-center">{iconRight}</span>
      )}
    </button>
  );
});

CyberButton.displayName = 'CyberButton';

export default CyberButton;
