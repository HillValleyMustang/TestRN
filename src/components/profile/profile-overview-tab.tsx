"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Flame, Dumbbell, BarChart2, ListChecks, Star } from 'lucide-react';
import { Profile as ProfileType } from '@/types/supabase';
import { AchievementGrid } from './achievement-grid';
import { ACHIEVEMENT_IDS, achievementsList } from '@/lib/achievements'; // Import achievementsList

interface ProfileOverviewTabProps {
  profile: ProfileType | null;
  bmi: string | null;
  dailyCalories: string | null;
  achievements: { id: string; name: string; icon: string }[]; // Added achievements prop
  unlockedAchievements: Set<string>;
  onAchievementClick: (achievement: { id: string; name: string; icon: string }) => void;
  onOpenPointsExplanation: () => void;
  totalWorkoutsCount: number;
  totalExercisesCount: number;
}

export const ProfileOverviewTab = ({
  profile,
  bmi,
  dailyCalories,
  achievements, // Destructure achievements prop
  unlockedAchievements,
  onAchievementClick,
  onOpenPointsExplanation,
  totalWorkoutsCount,
  totalExercisesCount,
}: ProfileOverviewTabProps) => {
  if (!profile) return null;

  return (
    <div className="mt-6 space-y-6 border-none p-0">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-400 to-orange-500 text-primary-foreground shadow-lg flex flex-col justify-between p-4">
          <CardHeader className="flex-row items-center justify-between pb-2 p-0">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{profile.current_streak || 0} Days</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-400 to-blue-500 text-primary-foreground shadow-lg flex flex-col justify-between p-4">
          <CardHeader className="flex-row items-center justify-between pb-2 p-0">
            <CardTitle className="text-sm font-medium">Total Workouts</CardTitle>
            <Dumbbell className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{totalWorkoutsCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-400 to-purple-500 text-primary-foreground shadow-lg flex flex-col justify-between p-4">
          <CardHeader className="flex-row items-center justify-between pb-2 p-0">
            <CardTitle className="text-sm font-medium">Total Exercises</CardTitle>
            <ListChecks className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{totalExercisesCount}</div>
          </CardContent>
        </Card>
        <Card 
          className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-primary-foreground shadow-lg flex flex-col justify-between p-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200 ease-in-out"
          onClick={onOpenPointsExplanation}
        >
          <CardHeader className="flex-row items-center justify-between pb-2 p-0">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Star className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <div className="text-2xl font-bold">{profile.total_points || 0}</div>
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
            achievements={achievements} // Use the achievements prop
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