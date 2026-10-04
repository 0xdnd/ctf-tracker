import React, { useId } from 'react';
import { X } from 'lucide-react';

export type CyberInputSize = 'xs' | 'sm' | 'md' | 'lg';
export type CyberInputVariant = 'default' | 'elevated' | 'ghost';

export interface CyberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: CyberInputSize;
  variant?: CyberInputVariant;
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  mono?: boolean;
}

export const CyberInput = React.forwardRef<HTMLInputElement, CyberInputProps>(({
  id: explicitId,
  name,
  label,
  error,
  hint,
  size = 'md',
  variant = 'default',
  iconLeft,
  iconRight,
  clearable = false,
  onClear,
  mono = false,
  disabled = false,
  className = '',
  value,
  onChange,
  placeholder,
  ...props
}, ref) => {
  const generatedId = useId();
  const id = explicitId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Concentric Radii & Sizing Matrix:
  // xs: 24px height, 6px radius (rounded-sm)
  // sm: 30px height, 8px radius (rounded-md)
  // md: 36px height, 8px radius (rounded-md)
  // lg: 42px height, 10px radius (rounded-lg)
  const sizeClasses: Record<CyberInputSize, string> = {
    xs: 'h-6 text-[11px] px-2 rounded-sm',
    sm: 'h-7.5 text-xs px-2.5 rounded-md',
    md: 'h-9 text-xs px-3 rounded-md',
    lg: 'h-10 text-sm px-3.5 rounded-lg',
  };

  const iconSizes: Record<CyberInputSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const variantClasses: Record<CyberInputVariant, string> = {
    default:
      'bg-slate-50 dark:bg-surface-sunken ' +
      'border-slate-300 dark:border-border-subtle ' +
      'text-slate-900 dark:text-text-primary ' +
      'placeholder:text-tertiary dark:placeholder:text-text-muted/70',
    elevated:
      'bg-white dark:bg-surface-elevated ' +
      'border-slate-300 dark:border-border-subtle ' +
      'text-slate-900 dark:text-text-primary ' +
      'placeholder:text-tertiary dark:placeholder:text-text-muted/70 ' +
      'shadow-xs',
    ghost:
      'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-surface-sunken ' +
      'text-slate-900 dark:text-text-primary ' +
      'placeholder:text-tertiary dark:placeholder:text-text-muted/70',
  };

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className="w-full space-y-1 text-left">
      {/* Accessible Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-semibold text-slate-700 dark:text-text-secondary select-none"
        >
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-tertiary dark:text-text-muted">
            {iconLeft}
          </div>
        )}

        <input
          ref={ref}
          id={id}
          name={name}
          disabled={disabled}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={`w-full border font-normal transition-all duration-150 ` +
            `focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ` +
            `disabled:opacity-50 disabled:cursor-not-allowed ` +
            `${mono ? 'font-mono tabular-nums' : 'font-sans'} ` +
            `${error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : ''} ` +
            `${iconLeft ? 'pl-8' : ''} ` +
            `${(clearable && hasValue) || iconRight ? 'pr-8' : ''} ` +
            `${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
          {...props}
        />

        {/* Clear Button or Right Icon */}
        {clearable && hasValue && !disabled ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear input"
            className="absolute right-2 p-0.5 text-tertiary hover:text-slate-700 dark:text-text-muted dark:hover:text-text-primary rounded transition-colors active:scale-95 cursor-pointer"
          >
            <X className={iconSizes[size]} />
          </button>
        ) : iconRight ? (
          <div className="absolute right-2.5 flex items-center pointer-events-none text-tertiary dark:text-text-muted">
            {iconRight}
          </div>
        ) : null}
      </div>

      {/* Error or Hint Message */}
      {error ? (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-callout-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11px] text-tertiary dark:text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

CyberInput.displayName = 'CyberInput';

export default CyberInput;
