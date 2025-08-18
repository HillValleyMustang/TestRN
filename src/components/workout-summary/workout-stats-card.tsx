"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Timer, Trophy, Calendar } from "lucide-react";
import { formatTime } from '@/lib/unit-conversions';

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
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="text-lg font-semibold">{new Date(workoutSession.session_date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-lg font-semibold">{workoutSession.duration_string || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-lg font-semibold">{totalVolume.toLocaleString()} kg</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">PRs Achieved</p>
            <p className="text-lg font-semibold">{prsAchieved}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};