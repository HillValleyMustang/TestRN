"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Play } from 'lucide-react';
import { Tables, WorkoutWithLastCompleted, GroupedTPath } from '@/types/supabase'; // Import centralized types
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { WorkoutPill, WorkoutPillProps } from '@/components/workout-flow/workout-pill';
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher';
import { cn } from '@/lib/utils';

type TPath = Tables<'t_paths'>;

// Removed local WorkoutWithLastCompleted definition, now using centralized type

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

export const AllWorkoutsQuickStart = () => {
  const router = useRouter();
  const { session, supabase } = useSession(); // Destructure supabase here
  const { groupedTPaths, loadingData, dataError, refreshAllData } = useWorkoutDataFetcher();
  const [activeMainTPath, setActiveMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<WorkoutWithLastCompleted[]>([]);

  useEffect(() => {
    const processWorkouts = async () => {
      if (!session?.user.id || loadingData || dataError) return;

      const userProfile = (await supabase.from('profiles').select('active_t_path_id').eq('id', session.user.id).single()).data;
      const activeTPathId = userProfile?.active_t_path_id;

      if (!activeTPathId) {
        setActiveMainTPath(null);
        setChildWorkouts([]);
        return;
      }

      const foundGroup = groupedTPaths.find(group => group.mainTPath.id === activeTPathId);
      if (foundGroup) {
        setActiveMainTPath(foundGroup.mainTPath);
        setChildWorkouts(foundGroup.childWorkouts);
      } else {
        setActiveMainTPath(null);
        setChildWorkouts([]);
      }
    };

    processWorkouts();
  }, [session, supabase, groupedTPaths, loadingData, dataError]);

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout?workoutId=${workoutId}`);
  };

  if (loadingData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            All Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading workouts...</p>
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
            All Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading workouts: {dataError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!activeMainTPath || childWorkouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center text-xl">
            <Dumbbell className="h-5 w-5" />
            All Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No workouts found for your active Transformation Path. This might happen if your session length is too short for any workouts.</p>
          <Button onClick={() => router.push('/profile')} className="mt-4">Adjust Session Length</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
          <Dumbbell className="h-5 w-5" />
          Workouts in "{activeMainTPath.template_name}"
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {childWorkouts.map((workout: WorkoutWithLastCompleted) => { // Explicitly type workout
            const pillProps = mapWorkoutToPillProps(workout, activeMainTPath.template_name);
            const isPPLAndLegs = pillProps.workoutType === 'push-pull-legs' && pillProps.category === 'legs';
            // Removed isSelectedPill as it's not relevant in this component
            return (
              <div key={workout.id} className="flex items-center gap-2">
                <WorkoutPill
                  {...pillProps}
                  isSelected={false} // Always unselected in this view
                  onClick={() => {}} // No direct click on pill, only button
                  className="flex-1"
                />
                <Button 
                  size="icon" // Changed to icon size
                  onClick={() => handleStartWorkout(workout.id)}
                  className="flex-shrink-0"
                >
                  <Play className="h-4 w-4" /> {/* Added Play icon */}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};