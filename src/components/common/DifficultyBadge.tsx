import React from 'react';
import { Difficulty } from '../../types';
import { getDifficultyTone } from '../../utils/categoryUtils';

export interface DifficultyBadgeProps {
  difficulty: Difficulty | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  variant?: 'default' | 'hardware';
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = React.memo(({
  difficulty,
  size = 'xs',
  className = '',
  variant = 'default',
}) => {
  const sizeClasses = {
    xs: 'h-4 text-[11px] px-1 rounded',
    sm: 'h-5 text-xs px-1.5 rounded',
    md: 'h-6 text-xs px-2.5 rounded',
  }[size];

  const hardwareSizeClasses = {
    xs: 'h-4 text-[11px] px-1',
    sm: 'h-5 text-xs px-1.5',
    md: 'h-6 text-xs px-2.5',
  }[size];

  const getHardwareTheme = () => getDifficultyTone(difficulty).badge;

  if (variant === 'hardware') {
    return (
      <span
        className={`inline-flex items-center rounded border font-sans tabular-nums whitespace-nowrap select-none cursor-default font-medium ${getHardwareTheme()} ${hardwareSizeClasses} ${className}`}
        title={`Difficulty: ${difficulty}`}
      >
        {difficulty}
      </span>
    );
  }

  const getTheme = () => getDifficultyTone(difficulty).badge;

  return (
    <span
      className={`inline-flex items-center font-sans tabular-nums font-medium border whitespace-nowrap ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
