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
  const { Icon, selected, defaultText, borderColor } = getPillStyles(category, variant);

  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-2 h-10 pl-3.5 pr-4 rounded-2xl',
        'font-sans border-none cursor-pointer',
        'transition-all duration-200 ease-out w-fit',
        'workout-pill-accent-border',
        isSelected ? `opacity-100 scale-100 text-white ${selected}` : `opacity-70 scale-98 bg-white ${defaultText}`,
        'hover:scale-102'
      )}
      style={{ '--border-color': isSelected ? 'transparent' : `var(--${borderColor.replace('border-', '')})` } as React.CSSProperties}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
      <div className="flex flex-col gap-0 text-left">
        <span className="text-sm font-semibold leading-tight">{title}</span>
        <span className={cn("text-xs font-medium leading-tight", isSelected ? 'opacity-60' : 'opacity-80')}>
          {formatTimeAgo(completedAt)}
        </span>
      </div>
    </button>
  );
};