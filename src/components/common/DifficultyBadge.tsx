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
    xs: 'text-[9px] px-1.5 py-0.5 rounded-md',
    sm: 'text-[10px] px-2 py-0.5 rounded-md',
    md: 'text-xs px-2.5 py-0.5 rounded-md',
  }[size];

  const getTheme = () => {
    switch (difficulty) {
      case 'Very Easy':
        return 'text-cyan-800 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-800/50';
      case 'Easy':
        return 'text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50';
      case 'Medium':
        return 'text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/50';
      case 'Hard':
        return 'text-rose-800 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/50';
      case 'Insane':
        return 'text-purple-800 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800/50';
      default:
        return 'text-slate-700 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 border-slate-300 dark:border-[#27272a]';
    }
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider border whitespace-nowrap ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
