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
  onEditWorkout: (workoutId: string, workoutName: string) => void; // Updated signature
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
            <ul className="space-y-3"> {/* Increased space-y for bigger badges */}
              {childWorkouts.length === 0 ? (
                <p className="text-muted-foreground">No workouts found for this Transformation Path. This may happen if your session length is too short for any workouts.</p>
              ) : (
                childWorkouts.map(workout => (
                  <li key={workout.id} className="flex items-center justify-between p-3 border rounded-md group hover:bg-accent transition-colors"> {/* Added group and hover:bg-accent */}
                    <div className="flex flex-col">
                      <WorkoutBadge workoutName={workout.template_name} className="text-base px-3 py-1"> {/* Made badge bigger */}
                        {workout.template_name}
                      </WorkoutBadge>
                      {workout.is_bonus && (
                        <WorkoutBadge workoutName="Bonus" className="text-xs px-2 py-0.5 mt-1">
                          Bonus
                        </WorkoutBadge>
                      )}
                      <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1"> {/* Increased text size */}
                        <Clock className="h-4 w-4" /> Last completed: {formatTimeAgo(workout.last_completed_at ? new Date(workout.last_completed_at) : null)}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => onEditWorkout(workout.id, workout.template_name)} title="Edit Workout Exercises"> {/* Passed workout.template_name */}
                        <Edit className="h-5 w-5" /> {/* Made icon bigger */}
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