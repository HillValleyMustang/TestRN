"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Timer, Trophy, Calendar } from "lucide-react";
import { formatTime } from '@/lib/unit-conversions';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import cn and getWorkoutColorClass

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutStatsCardProps {
  workoutSession: WorkoutSession;
  totalVolume: number;
  prsAchieved: number;
  newPrExercises: string[]; // New prop for PR highlights
}

export const WorkoutStatsCard = ({ workoutSession, totalVolume, prsAchieved, newPrExercises }: WorkoutStatsCardProps) => {
  const workoutColorClass = getWorkoutColorClass(workoutSession.template_name || 'Ad Hoc Workout', 'text');
  return (
    <Card className="mb-4">
      <CardHeader className="p-3">
        <CardTitle className={cn("text-base", workoutColorClass)}>{workoutSession.template_name || 'Ad Hoc Workout'}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 pt-0">
        <div className="flex items-center space-x-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-semibold">{new Date(workoutSession.session_date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <Timer className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-sm font-semibold">{workoutSession.duration_string || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <Dumbbell className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-sm font-semibold">{totalVolume.toLocaleString()} kg</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <Trophy className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">PRs</p>
            <p className="text-sm font-semibold">{prsAchieved}</p>
            {newPrExercises.length > 0 && (
              <div className="text-xs text-yellow-500 mt-1 truncate" title={newPrExercises.join(', ')}>
                {newPrExercises.join(', ')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};