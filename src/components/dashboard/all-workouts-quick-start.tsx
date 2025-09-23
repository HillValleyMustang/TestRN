"use client";

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Play } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, Profile, GroupedTPath } from '@/types/supabase'; // Import Profile and GroupedTPath
import { WorkoutPill, WorkoutPillProps } from '@/components/workout-flow/workout-pill';
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useWorkoutPlans } from '@/hooks/data/useWorkoutPlans';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useGym } from '@/components/gym-context-provider'; // Import useGym
import Link from 'next/link'; // Import Link

type TPath = Tables<'t_paths'>;

const mapWorkoutToPillProps = (workout: WorkoutWithLastCompleted, mainTPathName: string): Omit<WorkoutPillProps, 'isSelected' | 'onClick'> => {
  const lowerTitle = workout.template_name.toLowerCase();
  const isUpperLowerSplit = mainTPathName.toLowerCase().includes('upper/lower');
  const workoutType: WorkoutPillProps['workoutType'] = isUpperLowerSplit ? 'upper-lower' : 'push-pull-legs';
  
  let category: WorkoutPillProps['category'];
  let variant: WorkoutPillProps['variant'] = undefined;

  if (isUpperLowerSplit) {
    if (lowerTitle.includes('upper')) category = 'upper';
    else if (lowerTitle.includes('lower')) category = 'lower';
    else category = 'upper'; // Default if neither, though should not happen with current data
    
    if (lowerTitle.includes(' a')) variant = 'a';
    else if (lowerTitle.includes(' b')) variant = 'b';
  } else { // push-pull-legs
    if (lowerTitle.includes('push')) category = 'push';
    else if (lowerTitle.includes('pull')) category = 'pull';
    else if (lowerTitle.includes('legs')) category = 'legs';
    else category = 'push'; // Default if neither, though should not happen with current data
  }

  return {
    id: workout.id,
    title: workout.template_name,
    workoutType,
    category,
    variant,
    completedAt: workout.last_completed_at ? new Date(workout.last_completed_at) : null,
  };
};

interface AllWorkoutsQuickStartProps {
  profile: Profile | null;
  groupedTPaths: GroupedTPath[];
  loadingPlans: boolean;
  activeGym: Tables<'gyms'> | null;
  loadingGyms: boolean;
}

export const AllWorkoutsQuickStart = ({
  profile,
  groupedTPaths,
  loadingPlans,
  activeGym,
  loadingGyms,
}: AllWorkoutsQuickStartProps) => {
  const router = useRouter();
  const { profile: userProfile, isLoading: loadingProfile, error: profileError } = useUserProfile(); // Destructure profileError
  const { groupedTPaths: allGroupedTPaths, isLoading: loadingPlansHook, error: plansError } = useWorkoutPlans(); // Use different names to avoid conflict

  const componentLoading = loadingProfile || loadingPlans || loadingPlansHook || loadingGyms; // Use internal loading states
  const dataError = profileError || plansError;

  const activeTPathGroup = useMemo(() => {
    if (!profile || !profile.active_t_path_id || groupedTPaths.length === 0) {
      return null;
    }
    return groupedTPaths.find(group => group.mainTPath.id === profile.active_t_path_id);
  }, [profile, groupedTPaths]);

  const activeMainTPath = activeTPathGroup?.mainTPath;
  const childWorkouts = activeTPathGroup?.childWorkouts || [];

  // Determine if the active gym is configured
  const isGymConfigured = useMemo(() => {
    if (!activeGym || !groupedTPaths) return false;
    return groupedTPaths.some(group => group.mainTPath.gym_id === activeGym.id);
  }, [activeGym, groupedTPaths]);

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

  if (dataError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            All Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading workouts: {dataError}</p>
        </CardContent>
      </Card>
    );
  }

  // Determine if we are in a "truly empty" state
  const isTrulyEmptyState = !activeMainTPath || childWorkouts.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          {activeMainTPath ? `Workouts in "${activeMainTPath.template_name}"` : "All Workouts"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {componentLoading && isTrulyEmptyState ? (
          // Skeleton for the "no data" state (text-like)
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        ) : !activeGym ? (
          <p className="text-muted-foreground">No active gym selected. Please set one in your profile.</p>
        ) : !isGymConfigured ? (
          <p className="text-muted-foreground">Your active gym "{activeGym.name}" has no workout plan. Go to <Link href="/manage-t-paths" className="text-primary underline">Manage T-Paths</Link> to set one up.</p>
        ) : isTrulyEmptyState ? (
          // Actual "no data" message
          <p className="text-muted-foreground">No workouts found for your active Transformation Path. This might happen if your session length is too short for any workouts.</p>
        ) : (
          // Actual content when workouts are available
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {childWorkouts.map((workout: WorkoutWithLastCompleted) => {
              const pillProps = mapWorkoutToPillProps(workout, activeMainTPath.template_name);
              return (
                <div key={workout.id} className="flex items-center gap-2">
                  <WorkoutPill
                    {...pillProps}
                    isSelected={false}
                    onClick={() => {}}
                    className="flex-1"
                  />
                  <Button 
                    size="icon"
                    onClick={() => handleStartWorkout(workout.id)}
                    className="flex-shrink-0"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};