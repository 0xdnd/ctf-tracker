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
        return 'text-purple-900 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/50';
      case 'Easy':
        return 'text-emerald-900 dark:text-cyber-emerald bg-emerald-100 dark:bg-cyber-emerald/10 border-emerald-300 dark:border-cyber-emerald/30';
      case 'Medium':
        return 'text-amber-900 dark:text-cyber-amber bg-amber-100 dark:bg-cyber-amber/10 border-amber-300 dark:border-cyber-amber/30';
      case 'Hard':
        return 'text-rose-900 dark:text-cyber-crimson bg-rose-100 dark:bg-cyber-crimson/10 border-rose-300 dark:border-cyber-crimson/30';
      case 'Insane':
        return 'text-purple-950 dark:text-purple-300 bg-purple-200 dark:bg-purple-950/60 border-purple-400 dark:border-purple-700';
      default:
        return 'text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider border ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
