"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // Keep web-specific utils;
import { ACHIEVEMENT_DISPLAY_INFO } from '@/lib/achievements';

interface AchievementGridProps {
  achievements: { id: string; name: string; icon: string }[];
  unlockedAchievements: Set<string>;
  onAchievementClick: (achievement: { id: string; name: string; icon: string }) => void;
}

export const AchievementGrid = ({ achievements, unlockedAchievements, onAchievementClick }: AchievementGridProps) => {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {achievements.map((a) => {
        const isAchUnlocked = unlockedAchievements.has(a.id);
        const displayInfo = ACHIEVEMENT_DISPLAY_INFO[a.id]; // Get full display info
        return (
          <Button
            key={a.id}
            variant="ghost"
            className={cn(
              "flex flex-col items-center justify-center min-h-[7rem] w-full p-3 rounded-xl border-2 transition-all duration-200 ease-in-out group",
              isAchUnlocked
                ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 hover:scale-105'
                : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:scale-105'
            )}
            onClick={() => onAchievementClick(a)}
          >
            <div className="text-2xl mb-1 transition-transform duration-200 ease-in-out group-hover:scale-110">{displayInfo?.icon || a.icon}</div>
            <div className={cn(
              "text-xs font-medium text-center leading-tight whitespace-normal",
              isAchUnlocked ? "text-yellow-800 dark:text-yellow-300" : "text-gray-500 dark:text-gray-400"
            )}>
              {displayInfo?.name || a.name}
            </div>
          </Button>
        );
      })}
    </div>
  );
};