"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Dumbbell, Trophy, Star, Footprints, Bot, Crown, Sunrise, CalendarCheck, Weight, LayoutTemplate, Text } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Profile as ProfileType, Tables, UserAchievement } from '@/types/supabase';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { ACHIEVEMENT_DISPLAY_INFO, ACHIEVEMENT_IDS } from '@data/constants/achievements'; // Import from new utility file
import { useSession } from '@/components/session-context-provider'; // Import useSession

interface AchievementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementId: string | null;
  isUnlocked: boolean;
  profile: ProfileType | null;
  session: Session | null; // Keep session prop for now, but use memoizedSessionUserId internally
  supabase: SupabaseClient;
  achievementInfo: { id: string; name: string; icon: string } | null;
}

export const AchievementDetailDialog = ({
  open,
  onOpenChange,
  achievementId,
  isUnlocked,
  profile,
  session, // Keep session prop for now
  supabase,
  achievementInfo,
}: AchievementDetailDialogProps) => {
  const { memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId

  if (!achievementId || !achievementInfo) return null;

  const fullAchievementInfo = ACHIEVEMENT_DISPLAY_INFO[achievementId];
  if (!fullAchievementInfo) return null;

  const { name, icon, description } = fullAchievementInfo;

  // Determine current progress for dynamic achievements
  let progressText: string | null = null;
  let progressValue: number = 0;
  let progressMax: number = 1; // Default to 1 for achievements that are just true/false

  if (profile) {
    switch (achievementId) {
      case ACHIEVEMENT_IDS.FIRST_WORKOUT:
        progressValue = (profile.total_points || 0) >= 10 ? 1 : 0;
        progressMax = 1;
        progressText = `Workouts completed: ${(profile.total_points || 0) / 10} / 1`;
        break;
      case ACHIEVEMENT_IDS.TEN_DAY_STREAK:
        progressValue = profile.current_streak || 0;
        progressMax = 10;
        progressText = `Current streak: ${profile.current_streak || 0} / 10 days`;
        break;
      case ACHIEVEMENT_IDS.THIRTY_DAY_STREAK:
        progressValue = profile.current_streak || 0;
        progressMax = 30;
        progressText = `Current streak: ${profile.current_streak || 0} / 30 days`;
        break;
      case ACHIEVEMENT_IDS.TWENTY_FIVE_WORKOUTS:
        progressValue = (profile.total_points || 0) / 10;
        progressMax = 25;
        progressText = `Workouts completed: ${(profile.total_points || 0) / 10} / 25`;
        break;
      case ACHIEVEMENT_IDS.FIFTY_WORKOUTS:
        progressValue = (profile.total_points || 0) / 10;
        progressMax = 50;
        progressText = `Workouts completed: ${(profile.total_points || 0) / 10} / 50`;
        break;
      case ACHIEVEMENT_IDS.CENTURY_CLUB:
        progressValue = profile.total_points || 0;
        progressMax = 1000;
        progressText = `Total points: ${profile.total_points || 0} / 1000`;
        break;
      // For achievements like PERFECT_WEEK, BEAST_MODE, WEEKEND_WARRIOR, EARLY_BIRD, VOLUME_MASTER, AI_APPRENTICE
      // dynamic progress is more complex and might require additional RPCs or client-side aggregation.
      // For now, we'll show a generic message if not unlocked.
      default:
        if (!isUnlocked) {
          progressText = "Keep training to unlock this achievement!";
        } else {
          progressText = "Achievement unlocked!";
        }
        progressValue = isUnlocked ? 1 : 0;
        progressMax = 1;
        break;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center pt-6">
          <div className="text-5xl mb-4">{icon}</div>
          <DialogTitle className={cn("text-2xl font-bold", isUnlocked ? "text-yellow-600" : "text-muted-foreground")}>
            {name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {progressText && (
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground mb-2">Your Progress:</p>
              <p className="text-lg font-semibold">{progressText}</p>
              {progressMax > 1 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                  <div 
                    className={cn("h-2.5 rounded-full", isUnlocked ? "bg-yellow-500" : "bg-blue-500")} 
                    style={{ width: `${(progressValue / progressMax) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          {!isUnlocked && (
            <p className="text-center text-sm text-muted-foreground">
              This achievement is not yet unlocked. Keep working towards your goals!
            </p>
          )}
          {isUnlocked && (
            <p className="text-center text-sm text-green-600 font-semibold">
              Congratulations! You've earned this achievement.
            </p>
          )}
        </div>
        <div className="flex justify-center pb-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};