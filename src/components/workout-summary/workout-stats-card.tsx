"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Timer, Trophy } from "lucide-react";

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutStatsCardProps {
  workoutSession: WorkoutSession;
  totalVolume: number;
  prsAchieved: number;
}

export const WorkoutStatsCard = ({ workoutSession, totalVolume, prsAchieved }: WorkoutStatsCardProps) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{workoutSession.template_name || 'Ad Hoc Workout'}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Date: {new Date(workoutSession.session_date).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-primary" />
          <p className="text-lg font-semibold">Duration: {workoutSession.duration_string || 'N/A'}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <p className="text-lg font-semibold">Total Volume: {totalVolume.toLocaleString()} kg</p>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="text-lg font-semibold">PRs Achieved: {prsAchieved}</p>
        </div>
      </CardContent>
    </Card>
  );
};