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
      <CardHeader className="p-4">
        <CardTitle className={cn("text-lg", workoutColorClass)}>{workoutSession.template_name || 'Ad Hoc Workout'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Date: {new Date(workoutSession.session_date).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 pt-0">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-base font-semibold">{new Date(workoutSession.session_date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="text-base font-semibold">{workoutSession.duration_string || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-base font-semibold">{totalVolume.toLocaleString()} kg</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">PRs Achieved</p>
            <p className="text-base font-semibold">{prsAchieved}</p>
            {newPrExercises.length > 0 && (
              <div className="text-xs text-yellow-500 mt-1">
                New PRs: {newPrExercises.join(', ')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};