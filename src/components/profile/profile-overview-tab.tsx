"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Flame, Dumbbell, BarChart2 } from 'lucide-react';
import { Profile as ProfileType } from '@/types/supabase';
import { AchievementGrid } from './achievement-grid';
import { ACHIEVEMENT_IDS } from '@/lib/achievements';

interface ProfileOverviewTabProps {
  profile: ProfileType | null;
  bmi: string | null;
  dailyCalories: string | null;
  achievements: { id: string; name: string; icon: string }[];
  unlockedAchievements: Set<string>;
  onAchievementClick: (achievement: { id: string; name: string; icon: string }) => void;
}

export const ProfileOverviewTab = ({
  profile,
  bmi,
  dailyCalories,
  achievements,
  unlockedAchievements,
  onAchievementClick,
}: ProfileOverviewTabProps) => {
  if (!profile) return null;

  return (
    <div className="mt-6 space-y-6 border-none p-0">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-orange-400 to-orange-500 text-primary-foreground shadow-lg">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.current_streak || 0} Days</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-primary-foreground shadow-lg">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(profile.total_points || 0) / 10}</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" /> Body Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div><p className="text-2xl font-bold">{bmi || 'N/A'}</p><p className="text-xs text-muted-foreground">BMI</p></div>
          <div><p className="text-2xl font-bold">{profile.height_cm || 'N/A'}<span className="text-base">cm</span></p><p className="text-xs text-muted-foreground">Height</p></div>
          <div><p className="text-2xl font-bold">{profile.weight_kg || 'N/A'}<span className="text-base">kg</span></p><p className="text-xs text-muted-foreground">Weight</p></div>
          <div><p className="text-2xl font-bold">{dailyCalories || 'N/A'}</p><p className="text-xs text-muted-foreground">Daily Cal (Est.)</p></div>
          <div><p className="text-2xl font-bold">{profile.body_fat_pct || 'N/A'}%</p><p className="text-xs text-muted-foreground">Body Fat</p></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
        <CardContent>
          <AchievementGrid
            achievements={achievements}
            unlockedAchievements={unlockedAchievements}
            onAchievementClick={onAchievementClick}
          />
          <p className="text-center text-muted-foreground text-sm mt-4">
            Tap to see requirements
          </p>
        </CardContent>
      </Card>
    </div>
  );
};