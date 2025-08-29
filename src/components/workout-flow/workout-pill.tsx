"use client";

import React from 'react';
import { cn, formatTimeAgo, getPillStyles } from '@/lib/utils';

export interface WorkoutPillProps {
  id: string;
  title: string;
  workoutType: 'upper-lower' | 'push-pull-legs';
  category: 'upper' | 'lower' | 'push' | 'pull' | 'legs';
  variant?: 'a' | 'b';
  completedAt: Date | null;
  isSelected: boolean;
  onClick: (id: string) => void;
}

export const WorkoutPill = ({
  id,
  title,
  category,
  variant,
  completedAt,
  isSelected,
  onClick,
}: WorkoutPillProps) => {
  const { Icon, selectedClass, defaultTextClass, borderColorVar } = getPillStyles(category, variant);

  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-3 h-14 pl-4 pr-5 rounded-2xl',
        'font-sans border-none cursor-pointer',
        'transition-all duration-200 ease-out w-fit',
        'workout-pill-accent-border',
        isSelected 
          ? `opacity-100 scale-100 text-white ${selectedClass}` 
          : `opacity-70 scale-98 bg-white ${defaultTextClass}`,
        'hover:scale-102 active:scale-98'
      )}
      style={{ '--border-color': isSelected ? 'transparent' : `hsl(var(--${borderColorVar}))` } as React.CSSProperties}
    >
      <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={2.5} />
      <div className="flex flex-col gap-0 text-left">
        <span className="text-base font-bold leading-tight">{title}</span>
        <span className={cn(
          "text-xs font-medium leading-tight",
          isSelected ? 'opacity-70' : 'opacity-80'
        )}>
          {formatTimeAgo(completedAt)}
        </span>
      </div>
    </button>
  );
};