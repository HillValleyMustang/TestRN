"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, Profile, GroupedTPath } from '@/types/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass, getExerciseCounts } from '@/lib/utils';
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useWorkoutPlans } from '@/hooks/data/useWorkoutPlans';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

type TPath = Tables<'t_paths'>;

// Define the workout orders
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface NextWorkoutCardProps {
  isLoading: boolean; // New prop
}

export const NextWorkoutCard = ({ isLoading }: NextWorkoutCardProps) => {
  const router = useRouter();
  const { session } = useSession();
  const { profile, isLoading: loadingProfile, error: profileError } = useUserProfile();
  const { groupedTPaths, workoutExercisesCache, isLoading: loadingPlans, error: plansError } = useWorkoutPlans();
  
  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutWithLastCompleted | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('N/A');
  const [lastWorkoutName, setLastWorkoutName] = useState<string | null>(null);

  const dataError = profileError || plansError;

  useEffect(() => {
    const determineNextWorkout = () => {
      if (isLoading || dataError || !session || !profile || !groupedTPaths) return;

      const activeMainTPathId = profile?.active_t_path_id;

      if (!activeMainTPathId) {
        setMainTPath(null);
        setNextWorkout(null);
        setLastWorkoutName(null);
        return;
      }

      const foundGroup = groupedTPaths.find((group: GroupedTPath) => group.mainTPath.id === activeMainTPathId);

      if (!foundGroup || foundGroup.childWorkouts.length === 0) {
        setMainTPath(null);
        setNextWorkout(null);
        setLastWorkoutName(null);
        return;
      }

      setMainTPath(foundGroup.mainTPath);
      const childWorkouts = foundGroup.childWorkouts;
      const workoutOrder = foundGroup.mainTPath.template_name.includes('Upper/Lower') ? ULUL_ORDER : PPL_ORDER;

      let lastCompletedWorkout: WorkoutWithLastCompleted | null = null;
      let mostRecentCompletionDate: Date | null = null;

      childWorkouts.forEach((workout: WorkoutWithLastCompleted) => {
        if (workout.last_completed_at) {
          const completionDate = new Date(workout.last_completed_at);
          if (!mostRecentCompletionDate || completionDate > mostRecentCompletionDate) {
            mostRecentCompletionDate = completionDate;
            lastCompletedWorkout = workout;
          }
        }
      });

      let nextWorkoutToSuggest: WorkoutWithLastCompleted | null = null;

      if (lastCompletedWorkout) {
        const lastWorkoutName = (lastCompletedWorkout as WorkoutWithLastCompleted).template_name;
        setLastWorkoutName(lastWorkoutName);
        const currentIndex = workoutOrder.indexOf(lastWorkoutName);
        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % workoutOrder.length;
          const nextWorkoutName = workoutOrder[nextIndex];
          nextWorkoutToSuggest = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === nextWorkoutName) || null;
        } else {
          nextWorkoutToSuggest = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === workoutOrder[0]) || null;
        }
      } else {
        nextWorkoutToSuggest = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === workoutOrder[0]) || null;
        setLastWorkoutName("No previous workout");
      }
      
      setNextWorkout(nextWorkoutToSuggest);

      // NEW DYNAMIC DURATION LOGIC
      if (nextWorkoutToSuggest) {
        const preferredSessionLength = profile?.preferred_session_length;
        if (preferredSessionLength) {
          const [minTimeStr, maxTimeStr] = preferredSessionLength.split('-');
          const minTime = parseInt(minTimeStr, 10);
          const maxTime = parseInt(maxTimeStr, 10);

          const defaultCounts = getExerciseCounts(preferredSessionLength);
          const defaultMainExerciseCount = defaultCounts.main;

          const exercisesInWorkout = workoutExercisesCache[nextWorkoutToSuggest.id] || [];
          const currentMainExerciseCount = exercisesInWorkout.filter(ex => !ex.is_bonus_exercise).length;

          const countDifference = currentMainExerciseCount - defaultMainExerciseCount;
          const timeAdjustment = countDifference * 5;

          const newMinTime = Math.max(5, minTime + timeAdjustment);
          const newMaxTime = Math.max(10, maxTime + timeAdjustment);

          setEstimatedDuration(`${newMinTime}-${newMaxTime} minutes`);
        } else {
          // Fallback if no preferred length is set
          const exercisesInWorkout = workoutExercisesCache[nextWorkoutToSuggest.id] || [];
          const totalExercises = exercisesInWorkout.length;
          setEstimatedDuration(`~${totalExercises * 5} minutes`);
        }
      } else {
        setEstimatedDuration('N/A');
      }
    };

    determineNextWorkout();
  }, [session, groupedTPaths, isLoading, dataError, profile, workoutExercisesCache]);

  if (isLoading && !nextWorkout) { // Show skeleton only if loading AND no data
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (dataError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading next workout: {dataError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!mainTPath || !nextWorkout) { // If no main T-Path or next workout, show message
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started.</p>
          {!mainTPath && <Button onClick={() => router.push('/profile')} className="mt-4">Adjust Profile Settings</Button>}
        </CardContent>
      </Card>
    );
  }

  const workoutBgClass = getWorkoutColorClass(nextWorkout.template_name, 'bg');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          Your Next Workout
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">{nextWorkout.template_name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated {estimatedDuration}</span>
            </div>
            {lastWorkoutName && (
              <p className="text-xs text-muted-foreground mt-1">
                Last workout: {lastWorkoutName}
              </p>
            )}
          </div>
          <Button 
            onClick={() => router.push(`/workout?workoutId=${nextWorkout.id}`)} 
            className={cn("text-white", workoutBgClass)}
            size="lg"
          >
            Start Workout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};