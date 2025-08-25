"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Button } from '@/components/ui/button';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { Dumbbell, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TPath = Tables<'t_paths'>;

interface WorkoutSelectorProps {
  onWorkoutSelect: (workoutId: string, workoutName: string, isAdHoc: boolean) => void;
  selectedWorkoutId: string | null;
}

interface WorkoutDisplayData extends TPath {
  last_completed_at: string | null;
}

export const WorkoutSelector = ({ onWorkoutSelect, selectedWorkoutId }: WorkoutSelectorProps) => {
  const { session, supabase } = useSession();
  const [activeTPath, setActiveTPath] = useState<TPath | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextWorkoutId, setNextWorkoutId] = useState<string | null>(null);

  const fetchWorkouts = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // 1. Fetch user profile to get active_t_path_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      const activeTPathId = profileData?.active_t_path_id;

      if (!activeTPathId) {
        setActiveTPath(null);
        setWorkouts([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the specific active main T-Path
      const { data: mainTPath, error: mainTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('id', activeTPathId)
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null)
        .single();

      if (mainTPathError || !mainTPath) {
        console.error("Active main T-Path not found or invalid:", mainTPathError);
        setActiveTPath(null);
        setWorkouts([]);
        setLoading(false);
        return;
      }
      setActiveTPath(mainTPath);

      // 3. Fetch child workouts for the active main T-Path
      const { data: childWorkouts, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('parent_t_path_id', mainTPath.id)
        .order('template_name', { ascending: true }); // Order for consistent "next" selection

      if (childWorkoutsError) throw childWorkoutsError;

      const workoutsWithLastDate = await Promise.all((childWorkouts as TPath[] || []).map(async (workout) => {
        const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        
        if (lastSessionError) {
          console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
        }
        
        return {
          ...workout,
          last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
        };
      }));

      setWorkouts(workoutsWithLastDate);

      // Determine the next workout
      let nextWorkoutCandidate: WorkoutDisplayData | null = null;
      let oldestCompletionDate: Date | null = null;

      workoutsWithLastDate.forEach(workout => {
        if (workout.last_completed_at) {
          const completionDate = new Date(workout.last_completed_at);
          if (!oldestCompletionDate || completionDate < oldestCompletionDate) {
            oldestCompletionDate = completionDate;
            nextWorkoutCandidate = workout;
          }
        } else if (!nextWorkoutCandidate) {
          // If a workout has never been completed, it's a strong candidate for "next"
          nextWorkoutCandidate = workout;
        }
      });

      if (nextWorkoutCandidate) {
        const confirmedNextWorkout = nextWorkoutCandidate; // Introduce a local constant
        setNextWorkoutId(confirmedNextWorkout.id);
      } else if (workoutsWithLastDate.length > 0) {
        // If all have been completed, just pick the first one as a fallback
        setNextWorkoutId(workoutsWithLastDate[0].id);
      } else {
        setNextWorkoutId(null);
      }

    } catch (err: any) {
      toast.error("Failed to load workouts: " + err.message);
      console.error("Error fetching workouts:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `${formatDistanceToNowStrict(date, { addSuffix: true })} ago`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!activeTPath || workouts.length === 0) {
    return (
      <div className="mb-6 p-4 border rounded-lg bg-card text-center text-muted-foreground">
        <p className="mb-2">No workouts found for your active Transformation Path.</p>
        <p>This might happen if your session length is too short for any workouts, or if you haven't set an active T-Path in your <a href="/profile" className="text-primary underline">Profile Settings</a>.</p>
        <Button onClick={() => onWorkoutSelect('ad-hoc', 'Ad Hoc Workout', true)} className="mt-4">
          <PlusCircle className="h-4 w-4 mr-2" /> Start Ad-Hoc Workout
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {workouts.map((workout) => {
        const Icon = getWorkoutIcon(workout.template_name);
        const workoutColorClass = getWorkoutColorClass(workout.template_name, 'text');
        const workoutBgClass = getWorkoutColorClass(workout.template_name, 'bg');
        const isNextWorkout = workout.id === nextWorkoutId;

        return (
          <Button
            key={workout.id}
            variant="outline"
            onClick={() => onWorkoutSelect(workout.id, workout.template_name, false)}
            className={cn(
              "h-auto p-3 flex flex-col items-center justify-center text-center whitespace-normal gap-1",
              "font-semibold text-sm leading-tight border-2",
              workout.id === selectedWorkoutId ? "ring-2 ring-primary border-primary" : "border-transparent",
              isNextWorkout ? "border-yellow-500 ring-1 ring-yellow-500" : "", // Highlight next workout
              workoutBgClass,
              workoutColorClass
            )}
          >
            <div className="flex items-center gap-1">
              {Icon && <Icon className="h-5 w-5" />}
              <span>{workout.template_name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatLastCompleted(workout.last_completed_at)}
            </span>
            {isNextWorkout && (
              <span className="absolute top-1 right-1 text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900 px-1 rounded-full">
                NEXT
              </span>
            )}
          </Button>
        );
      })}
      <Button
        variant="outline"
        onClick={() => onWorkoutSelect('ad-hoc', 'Ad Hoc Workout', true)}
        className={cn(
          "h-auto p-3 flex flex-col items-center justify-center text-center whitespace-normal gap-1",
          "font-semibold text-sm leading-tight border-2",
          selectedWorkoutId === 'ad-hoc' ? "ring-2 ring-primary border-primary" : "border-transparent",
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        )}
      >
        <PlusCircle className="h-5 w-5" />
        <span>Ad Hoc Workout</span>
        <span className="text-xs text-muted-foreground">No template</span>
      </Button>
    </div>
  );
};