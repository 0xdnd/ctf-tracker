import React from 'react';
import { Difficulty } from '../../types';

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

  const getHardwareTheme = () => {
    switch (difficulty) {
      case 'Very Easy':
        return 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-950/30 border-cyan-500/30 dark:border-cyan-500/40';
      case 'Easy':
        return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 dark:border-emerald-500/40';
      case 'Medium':
        return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/30 border-amber-500/30 dark:border-amber-500/40';
      case 'Hard':
        return 'text-rose-700 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/30 dark:border-rose-500/40';
      case 'Insane':
        return 'text-purple-700 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-950/30 border-purple-500/30 dark:border-purple-500/40';
      default:
        return 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-950/80 border-zinc-300 dark:border-zinc-800';
    }
  };

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

  const getTheme = () => {
    switch (difficulty) {
      case 'Very Easy':
        return 'text-cyan-800 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Easy':
        return 'text-emerald-800 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Medium':
        return 'text-amber-800 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Hard':
        return 'text-rose-800 dark:text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'Insane':
        return 'text-purple-800 dark:text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-slate-700 dark:text-zinc-400 bg-surface-sunken border-border-subtle';
    }
  };

  return (
    <span
      className={`inline-flex items-center font-mono tabular-nums font-bold uppercase tracking-wider border whitespace-nowrap ${getTheme()} ${sizeClasses} ${className}`}
      title={`Difficulty: ${difficulty}`}
    >
      {difficulty}
    </span>
  );
});
