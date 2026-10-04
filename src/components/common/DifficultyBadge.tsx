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
    xs: 'text-[9px] px-1.5 py-0.5 rounded-[4px]',
    sm: 'text-[10px] px-2 py-0.5 rounded-[4px]',
    md: 'text-xs px-2.5 py-0.5 rounded-[4px]',
  }[size];

  const hardwareSizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
  }[size];

  const getHardwareTheme = () => getDifficultyTone(difficulty).badge;

  if (variant === 'hardware') {
    return (
      <span
        className={`inline-flex items-center rounded-[4px] border font-mono tabular-nums text-[10px] tracking-wider uppercase whitespace-nowrap select-none cursor-default font-semibold ${getHardwareTheme()} ${hardwareSizeClasses} ${className}`}
        title={`Difficulty: ${difficulty}`}
      >
        {difficulty}
      </span>
    );
  }

  const getTheme = () => getDifficultyTone(difficulty).badge;

  return (
    <span
      className={`inline-flex items-center font-mono tabular-nums font-bold uppercase tracking-wider border whitespace-nowrap ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
