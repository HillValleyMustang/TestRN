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
    selectedTimeTextClass,
    selectedBorderClass,
    selectedShadowClass,
    unselectedBgClass,
    unselectedTextClass,
    unselectedTimeTextClass,
    unselectedBorderClass,
    unselectedShadowClass,
  } = getPillStyles(workoutType, category, variant);

  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'flex items-center gap-3 h-14 pl-4 pr-5 rounded-2xl border-2 min-w-[12rem]', // Adjusted height to h-14, added min-w
        'font-sans cursor-pointer',
        'transition-all duration-200 ease-out w-fit',
        isSelected
          ? cn(selectedBgClass, selectedBorderClass, selectedShadowClass, 'opacity-100 scale-100')
          : cn(unselectedBgClass, unselectedBorderClass, unselectedShadowClass, 'opacity-100 scale-100'), // Removed opacity and scale for unselected
        'hover:scale-[1.01] active:scale-[0.99]' // Slightly toned down hover/active
      )}
    >
      <Icon className={cn("w-6 h-6 flex-shrink-0", isSelected ? selectedTextClass : unselectedTextClass)} strokeWidth={2.5} />
      <div className="flex flex-col gap-0 text-left">
        <span className={cn("text-base font-bold leading-tight", isSelected ? selectedTextClass : unselectedTextClass)}>{title}</span>
        <span className={cn(
          "text-xs font-medium leading-tight",
          isSelected ? selectedTimeTextClass : unselectedTimeTextClass
        )}>
          {formatTimeAgo(completedAt)}
        </span>
      </div>
    </button>
  );
};