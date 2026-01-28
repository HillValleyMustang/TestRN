"use client";

import React, { useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, Profile, GroupedTPath } from '@/types/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass, getExerciseCounts } from '@/lib/utils'; // Keep web-specific utils;
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useWorkoutPlans } from '@/hooks/data/useWorkoutPlans';
import { Skeleton } from '@/components/ui/skeleton';
import { useGym } from '@/components/gym-context-provider'; // Import useGym
import Link from 'next/link'; // Import Link
import { WeeklyWorkoutAnalyzer, type CompletedWorkout } from '@data/ai/weekly-workout-analyzer';

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
  completedWorkoutsThisWeek?: CompletedWorkout[];
}

const NextWorkoutCardComponent = ({
  profile,
  groupedTPaths,
  loadingPlans,
  activeGym,
  loadingGyms,
  completedWorkoutsThisWeek = [],
}: NextWorkoutCardProps) => {
  const router = useRouter();
  const { session } = useSession();
  const { workoutExercisesCache, error: plansError } = useWorkoutPlans();
  
  const isLoading = loadingPlans || loadingGyms;
  const dataError = plansError;
  
  // Only show loading if we don't have data yet - if we have cached data, show it even during revalidation
  // However, if we're processing but have no groupedTPaths yet, show skeleton to prevent layout shift
  const hasData = !!groupedTPaths && groupedTPaths.length > 0 && !!profile && !!activeGym;
  const isProcessing = isLoading && !hasData; // Processing but no data yet
  const shouldShowLoading = isProcessing;

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
    const programmeType = foundGroup.mainTPath.template_name.includes('Upper/Lower') ? 'ulul' : 'ppl';

    // Use WeeklyWorkoutAnalyzer for intelligent workout recommendations
    const weeklyAnalysis = WeeklyWorkoutAnalyzer.analyzeWeeklyCompletion(
      programmeType,
      completedWorkoutsThisWeek
    );

    // Determine next workout using weekly-aware logic
    let nextWorkoutRecommendation = null;
    if (weeklyAnalysis.nextRecommendedWorkout) {
      // Prioritize missing workout from weekly target
      nextWorkoutRecommendation = WeeklyWorkoutAnalyzer.findWorkoutByType(
        childWorkouts,
        weeklyAnalysis.nextRecommendedWorkout
      );
      console.log(`[NextWorkoutCard] Weekly completion recommendation: ${nextWorkoutRecommendation?.template_name}`);
    }

    if (!nextWorkoutRecommendation) {
      // Fall back to normal cycling logic
      const recentWorkouts = childWorkouts.map(workout => ({
        session: {
          template_name: workout.template_name,
          completed_at: workout.last_completed_at,
          session_date: workout.last_completed_at
        }
      }));

      nextWorkoutRecommendation = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        programmeType,
        recentWorkouts,
        childWorkouts,
        completedWorkoutsThisWeek
      );
    }

    currentNextWorkout = nextWorkoutRecommendation;

    // Add recommendation reason for UI display
    if (currentNextWorkout && weeklyAnalysis.recommendationReason) {
      (currentNextWorkout as any).recommendationReason = weeklyAnalysis.recommendationReason;
    }

    // Find last completed workout for display
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

    currentLastWorkoutName = lastCompletedWorkout?.template_name || "No previous workout";

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
  }, [session, groupedTPaths, dataError, profile, workoutExercisesCache, activeGym, completedWorkoutsThisWeek]);

  const isGymConfigured = useMemo(() => {
    if (!activeGym || !groupedTPaths) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  const isTrulyEmptyState = !derivedMainTPath || !nextWorkout;

  return (
    <Card className="will-change-contents" style={{ contentVisibility: 'auto' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          Your Next Workout
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-[120px] flex flex-col justify-center" style={{ containLayout: true }}>
        {shouldShowLoading ? (
          // Render skeleton that matches the actual content layout to prevent layout shift
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-pulse">
            <div className="flex flex-col space-y-2 flex-1">
              <Skeleton className="h-7 w-48" /> {/* Workout name */}
              <Skeleton className="h-4 w-32" /> {/* Duration */}
              <Skeleton className="h-3 w-40" /> {/* Last workout */}
            </div>
            <Skeleton className="h-10 w-32" /> {/* Button */}
          </div>
        ) : dataError ? (
          <p className="text-destructive">Error loading next workout: {dataError}</p>
        ) : !activeGym ? (
          <div className="text-muted-foreground text-center py-4 animate-fade-in-fast">
            <p className="mb-4">No active gym selected. Please set one in your profile.</p>
            <Button onClick={() => router.push('/profile')} size="sm">Go to Profile Settings</Button>
          </div>
        ) : !isGymConfigured ? (
          <div className="text-muted-foreground text-center py-4 animate-fade-in-fast">
            <p className="mb-4">Your active gym "{activeGym.name}" has no workout plan. Go to <Link href="/manage-t-paths" className="text-primary underline">Manage T-Paths</Link> to set one up.</p>
          </div>
        ) : isTrulyEmptyState ? (
          <div className="text-muted-foreground text-center py-4 animate-fade-in-fast">
            <p>No active Transformation Path found or no workouts defined for your current session length. Complete onboarding or set one in your profile to get started.</p>
          </div>
        ) : (
          <div className="animate-fade-in-fast" style={{ minHeight: '120px' }}> {/* Apply fast fade-in here, maintain min-height to prevent layout shift */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2 min-h-[1.75rem]">
                  <h3 className="text-lg font-semibold">{nextWorkout?.template_name}</h3>
                  {(nextWorkout as any)?.recommendationReason === 'weekly_completion' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Complete week
                    </span>
                  )}
                </div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Memoize to prevent unnecessary re-renders when props haven't changed
export const NextWorkoutCard = React.memo(NextWorkoutCardComponent, (prevProps, nextProps) => {
  // Only re-render if critical props actually changed
  return (
    prevProps.loadingPlans === nextProps.loadingPlans &&
    prevProps.loadingGyms === nextProps.loadingGyms &&
    prevProps.profile?.id === nextProps.profile?.id &&
    prevProps.activeGym?.id === nextProps.activeGym?.id &&
    prevProps.groupedTPaths?.length === nextProps.groupedTPaths?.length &&
    JSON.stringify(prevProps.groupedTPaths) === JSON.stringify(nextProps.groupedTPaths) &&
    prevProps.completedWorkoutsThisWeek?.length === nextProps.completedWorkoutsThisWeek?.length
  );
});