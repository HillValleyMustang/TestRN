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
  workoutType, // Pass workoutType to getPillStyles
  category,
  variant,
  completedAt,
  isSelected,
  onClick,
}: WorkoutPillProps) => {
  const {
    Icon,
    selectedBgClass,
    selectedTextClass,
    selectedBorderClass,
    selectedShadowClass,
    unselectedBgClass,
    unselectedTextClass,
    unselectedBorderClass,
    unselectedShadowClass,
  } = getPillStyles(workoutType, category, variant);

  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-3 h-14 pl-4 pr-5 rounded-2xl border-2', // Added border-2 here
        'font-sans cursor-pointer',
        'transition-all duration-200 ease-out w-fit',
        isSelected
          ? cn(selectedBgClass, selectedTextClass, selectedBorderClass, selectedShadowClass, 'opacity-100 scale-100')
          : cn(unselectedBgClass, unselectedTextClass, unselectedBorderClass, unselectedShadowClass, 'opacity-70 scale-98'),
        'hover:scale-102 active:scale-98'
      )}
    >
      <Icon className={cn("w-6 h-6 flex-shrink-0", isSelected ? 'text-white' : unselectedTextClass)} strokeWidth={2.5} />
      <div className="flex flex-col gap-0 text-left">
        <span className={cn("text-sm font-semibold leading-tight", isSelected ? 'text-white' : unselectedTextClass)}>{title}</span>
        <span className={cn(
          "text-xs font-medium leading-tight",
          isSelected ? 'text-white opacity-70' : cn(unselectedTextClass, 'opacity-80')
        )}>
          {formatTimeAgo(completedAt)}
        </span>
      </div>
    </button>
  );
};