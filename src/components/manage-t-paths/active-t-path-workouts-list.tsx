"use client";

import React from "react";
import { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, Clock } from "lucide-react";
import { WorkoutBadge } from "@/components/workout-badge";
import { formatTimeAgo } from "@/lib/utils";

type TPath = Tables<'t_paths'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface ActiveTPathWorkoutsListProps {
  activeTPathName: string;
  childWorkouts: WorkoutWithLastCompleted[];
  loading: boolean;
  onEditWorkout: (workoutId: string) => void;
}

export const ActiveTPathWorkoutsList = ({
  activeTPathName,
  childWorkouts,
  loading,
  onEditWorkout,
}: ActiveTPathWorkoutsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workouts in "{activeTPathName}"</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading workouts...</p> : (
          <ScrollArea className="pr-4">
            <ul className="space-y-2">
              {childWorkouts.length === 0 ? (
                <p className="text-muted-foreground">No workouts found for this Transformation Path. This may happen if your session length is too short for any workouts.</p>
              ) : (
                childWorkouts.map(workout => (
                  <li key={workout.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex flex-col">
                      <WorkoutBadge workoutName={workout.template_name}>
                        {workout.template_name}
                      </WorkoutBadge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" /> Last completed: {formatTimeAgo(workout.last_completed_at ? new Date(workout.last_completed_at) : null)}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditWorkout(workout.id)} title="Edit Workout Exercises">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};