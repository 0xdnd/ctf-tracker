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
    xs: 'h-6 text-xs px-2 rounded-sm',
    sm: 'h-7 text-xs px-2.5 rounded-md',
    md: 'h-8 text-[13px] px-3 rounded-md',
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
      'bg-surface-sunken border-subtle hover:border-strong text-primary ' +
      'placeholder:text-tertiary',
    elevated:
      'bg-surface-elevated border-subtle hover:border-strong text-primary ' +
      'placeholder:text-tertiary',
    ghost:
      'bg-transparent border-transparent hover:bg-surface-hover text-primary ' +
      'placeholder:text-tertiary',
  };

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  return (
    <div className="w-full space-y-1 text-left">
      {/* Accessible Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-secondary select-none"
        >
          {label}
        </label>
      )}

      {/* Input Container */}
      <div className="relative flex items-center w-full">
        {iconLeft && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-tertiary">
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
          className={`w-full border font-normal transition-[border-color,box-shadow,background-color] duration-150 ` +
            `focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent ` +
            `disabled:opacity-50 disabled:cursor-not-allowed ` +
            `${mono ? 'font-mono tabular-nums' : 'font-sans'} ` +
            `${error ? 'border-callout-danger-border focus:border-callout-danger-fg focus:ring-callout-danger-fg/30' : ''} ` +
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
            className="absolute right-2 p-0.5 text-tertiary hover:text-primary rounded transition-colors active:scale-95 cursor-pointer"
          >
            <X className={iconSizes[size]} />
          </button>
        ) : iconRight ? (
          <div className="absolute right-2.5 flex items-center pointer-events-none text-tertiary">
            {iconRight}
          </div>
        ) : null}
      </div>

      {/* Error or Hint Message */}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-callout-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

CyberInput.displayName = 'CyberInput';

export default CyberInput;
