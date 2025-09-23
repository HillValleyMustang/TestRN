"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useGym } from '@/components/gym-context-provider'; // Import useGym
import Link from 'next/link'; // Import Link

type TPath = Tables<'t_paths'>;
type Gym = Tables<'gyms'>; // Import Gym type

// Define the workout orders
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface NextWorkoutCardProps {
  profile: Profile | null;
  groupedTPaths: GroupedTPath[];
  loadingPlans: boolean;
  activeGym: Gym | null;
  loadingGyms: boolean;
}

export const NextWorkoutCard = ({
  profile,
  groupedTPaths,
  loadingPlans,
  activeGym,
  loadingGyms,
}: NextWorkoutCardProps) => {
  const router = useRouter();
  const { session } = useSession();
  const { workoutExercisesCache, error: plansError } = useWorkoutPlans();
  
  const isLoading = loadingPlans || loadingGyms;
  const dataError = plansError;

  // Derive nextWorkout, estimatedDuration, lastWorkoutName, and mainTPath using useMemo
  const { nextWorkout, derivedEstimatedDuration, derivedLastWorkoutName, derivedMainTPath } = useMemo(() => {
    let currentNextWorkout: WorkoutWithLastCompleted | null = null;
    let currentEstimatedDuration: string | null = null;
    let currentLastWorkoutName: string | null = null;
    let currentMainTPath: TPath | null = null; // Now deriving mainTPath here

    if (dataError || !session || !profile || !groupedTPaths || !activeGym) {
      // If any critical data is missing or loading, return nulls
      return { nextWorkout: null, derivedEstimatedDuration: null, derivedLastWorkoutName: null, derivedMainTPath: null };
    }

    const activeMainTPathId = profile?.active_t_path_id;
    if (!activeMainTPathId) {
      return { nextWorkout: null, derivedEstimatedDuration: null, derivedLastWorkoutName: null, derivedMainTPath: null };
    }

    const foundGroup = groupedTPaths.find((group: GroupedTPath) => group.mainTPath.id === activeMainTPathId);
    if (!foundGroup || foundGroup.childWorkouts.length === 0) {
      return { nextWorkout: null, derivedEstimatedDuration: null, derivedLastWorkoutName: null, derivedMainTPath: null };
    }

    currentMainTPath = foundGroup.mainTPath; // Set mainTPath here

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

    if (lastCompletedWorkout) {
      currentLastWorkoutName = (lastCompletedWorkout as WorkoutWithLastCompleted).template_name;
      const currentIndex = workoutOrder.indexOf(currentLastWorkoutName);
      if (currentIndex !== -1) {
        const nextIndex = (currentIndex + 1) % workoutOrder.length;
        const nextWorkoutName = workoutOrder[nextIndex];
        currentNextWorkout = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === nextWorkoutName) || null;
      } else {
        currentNextWorkout = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === workoutOrder[0]) || null;
      }
    } else {
      currentNextWorkout = childWorkouts.find((w: WorkoutWithLastCompleted) => w.template_name === workoutOrder[0]) || null;
      currentLastWorkoutName = "No previous workout";
    }

    // Calculate estimatedDuration only if currentNextWorkout and profile.preferred_session_length are available
    // AND the specific workout's exercises are available in the cache
    if (currentNextWorkout && profile?.preferred_session_length) {
      const exercisesInWorkout = workoutExercisesCache[currentNextWorkout.id];
      
      // CRITICAL: Check if exercisesInWorkout is actually populated and not empty
      if (exercisesInWorkout && exercisesInWorkout.length > 0) {
        const preferredSessionLength = profile.preferred_session_length;
        const [minTimeStr, maxTimeStr] = preferredSessionLength.split('-');
        const minTime = parseInt(minTimeStr, 10);
        const maxTime = parseInt(maxTimeStr, 10);

        const defaultCounts = getExerciseCounts(preferredSessionLength);
        const defaultMainExerciseCount = defaultCounts.main;

        const currentMainExerciseCount = exercisesInWorkout.filter(ex => !ex.is_bonus_exercise).length;

        const countDifference = currentMainExerciseCount - defaultMainExerciseCount;
        const timeAdjustment = countDifference * 5;

        const newMinTime = Math.max(5, minTime + timeAdjustment);
        const newMaxTime = Math.max(10, maxTime + timeAdjustment);

        currentEstimatedDuration = `${newMinTime}-${newMaxTime} minutes`;
      }
    }

    return { nextWorkout: currentNextWorkout, derivedEstimatedDuration: currentEstimatedDuration, derivedLastWorkoutName: currentLastWorkoutName, derivedMainTPath: currentMainTPath };
  }, [session, groupedTPaths, dataError, profile, workoutExercisesCache, activeGym]);

  const isGymConfigured = useMemo(() => {
    if (!activeGym || !groupedTPaths) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  const isTrulyEmptyState = !derivedMainTPath || !nextWorkout;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          Your Next Workout
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[120px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col space-y-2 w-full">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-12 w-full sm:w-36" />
          </div>
        ) : dataError ? (
          <p className="text-destructive">Error loading next workout: {dataError}</p>
        ) : !activeGym ? (
          <div className="text-muted-foreground text-center py-4">
            <p className="mb-4">No active gym selected. Please set one in your profile.</p>
            <Button onClick={() => router.push('/profile')} size="sm">Go to Profile Settings</Button>
          </div>
        ) : !isGymConfigured ? (
          <div className="text-muted-foreground text-center py-4">
            <p className="mb-4">Your active gym "{activeGym.name}" has no workout plan. Go to <Link href="/manage-t-paths" className="text-primary underline">Manage T-Paths</Link> to set one up.</p>
          </div>
        ) : isTrulyEmptyState ? (
          <p className="text-muted-foreground text-center py-4">No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started.</p>
        ) : (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col space-y-1">
              <h3 className="text-lg font-semibold min-h-[1.75rem]">{nextWorkout?.template_name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground min-h-[1.25rem]">
                {derivedEstimatedDuration && <Clock className="h-4 w-4" />}
                {derivedEstimatedDuration && <span>Estimated {derivedEstimatedDuration}</span>}
              </div>
              <p className="text-xs text-muted-foreground min-h-[1rem]">
                {derivedLastWorkoutName && `Last workout: ${derivedLastWorkoutName}`}
              </p>
            </div>
            <Button 
              onClick={() => router.push(`/workout?workoutId=${nextWorkout?.id}`)} 
              className={cn("text-white", getWorkoutColorClass(nextWorkout?.template_name || '', 'bg'))}
              size="lg"
            >
              Start Workout
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};