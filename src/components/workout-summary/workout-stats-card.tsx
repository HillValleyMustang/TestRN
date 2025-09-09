"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Timer, Trophy, Calendar, ListChecks } from "lucide-react";
import { formatTime } from '@/lib/unit-conversions';
import { cn, getWorkoutColorClass } from '@/lib/utils';

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutStatsCardProps {
  workoutSession: WorkoutSession;
  totalVolume: number;
  prsAchieved: number;
  newPrExercises: string[];
  exercisesPerformed: number;
}

export const WorkoutStatsCard = ({ workoutSession, totalVolume, prsAchieved, newPrExercises, exercisesPerformed }: WorkoutStatsCardProps) => {
  const workoutColorClass = getWorkoutColorClass(workoutSession.template_name || 'Ad Hoc Workout', 'text');
  return (
    <Card className="mb-4">
      <CardHeader className="p-4">
        <CardTitle className={cn("text-lg", workoutColorClass)}>{workoutSession.template_name || 'Ad Hoc Workout'}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 p-4 pt-0">
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
          <ListChecks className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="text-base font-semibold">{exercisesPerformed}</p>
          </div>
        </div>
        <div className="col-span-2 flex items-start space-x-2">
          <Trophy className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">PBs Achieved</p>
            <p className="text-base font-semibold">{prsAchieved}</p>
            {newPrExercises.length > 0 && (
              <div className="text-xs text-yellow-500 mt-1">
                New PBs: {newPrExercises.join(', ')}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};