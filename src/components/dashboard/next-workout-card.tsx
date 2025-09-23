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
  const { workoutExercisesCache, error: plansError } = useWorkoutPlans(); // Removed loadingPlans from here as it's a prop
  
  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutWithLastCompleted | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<string | null>(null); // Initialized to null
  const [lastWorkoutName, setLastWorkoutName] = useState<string | null>(null);

  const componentLoading = loadingPlans || loadingGyms; // Use internal loading states
  const dataError = plansError; // profileError is handled by parent

  // Determine if the active gym is configured
  const isGymConfigured = useMemo(() => {
    if (!activeGym || !groupedTPaths) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  useEffect(() => {
    const determineNextWorkout = () => {
      if (dataError || !session || !profile || !groupedTPaths || !activeGym) {
        // If any critical data is missing, reset or keep null
        setMainTPath(null);
        setNextWorkout(null);
        setLastWorkoutName(null);
        setEstimatedDuration(null); // Ensure it's null if data is not ready
        return;
      }

      const activeMainTPathId = profile?.active_t_path_id;

      if (!activeMainTPathId) {
        setMainTPath(null);
        setNextWorkout(null);
        setLastWorkoutName(null);
        setEstimatedDuration(null); // Ensure it's null if data is not ready
        return;
      }

      const foundGroup = groupedTPaths.find((group: GroupedTPath) => group.mainTPath.id === activeMainTPathId);

      if (!foundGroup || foundGroup.childWorkouts.length === 0) {
        setMainTPath(null);
        setNextWorkout(null);
        setLastWorkoutName(null);
        setEstimatedDuration(null); // Ensure it's null if data is not ready
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

      // Only calculate estimatedDuration if profile.preferred_session_length is available AND component is not loading
      if (nextWorkoutToSuggest && profile?.preferred_session_length && !componentLoading) {
        const preferredSessionLength = profile.preferred_session_length;
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
        setEstimatedDuration(null); // Keep null if preferred_session_length is not ready or component is loading
      }
    };

    determineNextWorkout();
  }, [session, groupedTPaths, dataError, profile, workoutExercisesCache, activeGym, componentLoading]); // Added componentLoading to dependencies

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

  // Determine if we are in a "truly empty" state (no main T-Path or no next workout)
  const isTrulyEmptyState = !mainTPath || !nextWorkout;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          Your Next Workout
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[120px] flex flex-col justify-center"> {/* Added min-h and flex styles */}
        {componentLoading ? (
          // Skeleton for the "no data" state
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-6 w-48 mb-2" /> {/* Placeholder for workout name */}
              <Skeleton className="h-4 w-32" /> {/* Placeholder for estimated duration */}
              <Skeleton className="h-3 w-24 mt-1" /> {/* Placeholder for last workout */}
            </div>
            <Skeleton className="h-10 w-32" /> {/* Placeholder for the button */}
          </div>
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
          // Actual "no data" message
          <p className="text-muted-foreground text-center py-4">No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started.</p>
        ) : (
          // Actual content when a next workout is available
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">{nextWorkout?.template_name}</h3>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {estimatedDuration ? (
                  <span>Estimated {estimatedDuration}</span>
                ) : (
                  <Skeleton className="h-4 w-24" /> // Skeleton for duration
                )}
              </div>
              {lastWorkoutName && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last workout: {lastWorkoutName}
                </p>
              )}
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