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
    accentStripBgClass, // New class for the accent strip
  } = getPillStyles(workoutType, category, variant);

  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'relative flex items-center gap-2 h-14 pl-4 pr-5 rounded-2xl border-2 min-w-[12rem]', // Reverted to rounded-2xl, adjusted gap
        'font-sans cursor-pointer',
        'transition-all duration-200 ease-out',
        isSelected
          ? cn(selectedBgClass, selectedBorderClass, selectedShadowClass)
          : cn(unselectedBgClass, unselectedBorderClass, unselectedShadowClass),
        'hover:scale-[1.01] active:scale-[0.99]',
        'flex-1' // Add flex-1 to make it fill the grid column
      )}
    >
      {isSelected && (
        <div className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full",
          accentStripBgClass // Use the new accent strip class
        )} />
      )}
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