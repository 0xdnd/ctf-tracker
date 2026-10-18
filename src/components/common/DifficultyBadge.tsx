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
        return 'text-diff-very-easy bg-diff-very-easy/15 border-diff-very-easy/40 cyan';
      case 'Easy':
        return 'text-diff-easy bg-diff-easy/15 border-diff-easy/40 emerald';
      case 'Medium':
        return 'text-diff-medium bg-diff-medium/15 border-diff-medium/40 amber';
      case 'Hard':
        return 'text-diff-hard bg-diff-hard/15 border-diff-hard/40 rose';
      case 'Insane':
        return 'text-diff-insane bg-diff-insane/15 border-diff-insane/40 purple';
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
