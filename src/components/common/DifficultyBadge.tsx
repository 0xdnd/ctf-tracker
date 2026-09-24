import React from 'react';
import { Difficulty } from '../../types';

export interface DifficultyBadgeProps {
  difficulty: Difficulty | string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = React.memo(({
  difficulty,
  size = 'xs',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 rounded',
    sm: 'text-[10px] px-2 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-md',
  }[size];

  const getTheme = () => {
    switch (difficulty) {
      case 'Very Easy':
        return 'text-cyan-800 dark:text-diff-very-easy bg-diff-very-easy/15 dark:bg-diff-very-easy/10 border-diff-very-easy/40 dark:border-diff-very-easy/60';
      case 'Easy':
        return 'text-emerald-800 dark:text-diff-easy bg-diff-easy/15 dark:bg-diff-easy/10 border-diff-easy/40 dark:border-diff-easy/60';
      case 'Medium':
        return 'text-amber-800 dark:text-diff-medium bg-diff-medium/15 dark:bg-diff-medium/10 border-diff-medium/40 dark:border-diff-medium/60';
      case 'Hard':
        return 'text-rose-800 dark:text-diff-hard bg-diff-hard/15 dark:bg-diff-hard/10 border-diff-hard/40 dark:border-diff-hard/60';
      case 'Insane':
        return 'text-purple-800 dark:text-diff-insane bg-diff-insane/15 dark:bg-diff-insane/10 border-diff-insane/40 dark:border-diff-insane/60';
      default:
        return 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider border whitespace-nowrap shadow-sm ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
