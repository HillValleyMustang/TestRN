"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell, CalendarDays } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass } from '@/lib/utils';

type TPath = Tables<'t_paths'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

interface WorkoutSelectorProps {
  onWorkoutSelect: (workoutId: string | null) => void;
  selectedWorkoutId: string | null;
}

export const WorkoutSelector = ({ onWorkoutSelect, selectedWorkoutId }: WorkoutSelectorProps) => {
  const { session, supabase } = useSession();
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextRecommendedWorkoutId, setNextRecommendedWorkoutId] = useState<string | null>(null);
  const [activeMainTPathId, setActiveMainTPathId] = useState<string | null>(null);

  const fetchWorkoutsAndProfile = useCallback(async () => {
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
      setActiveMainTPathId(profileData?.active_t_path_id || null);

      // 2. Fetch all main T-Paths for the user
      const { data: mainTPathsData, error: mainTPathsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null)
        .order('created_at', { ascending: true });

      if (mainTPathsError) throw mainTPathsError;

      // 3. Fetch all child workouts for the user
      const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('user_id', session.user.id)
        .eq('is_bonus', true)
        .order('template_name', { ascending: true });

      if (childWorkoutsError) throw childWorkoutsError;

      const workoutsWithLastDatePromises = (childWorkoutsData as TPath[] || []).map(async (workout) => {
        const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        
        if (lastSessionError) {
          console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
        }
        
        return {
          ...workout,
          last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
        };
      });

      const allChildWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

      // Group child workouts under their respective main T-Paths
      const newGroupedTPaths: GroupedTPath[] = (mainTPathsData as TPath[] || []).map(mainTPath => ({
        mainTPath,
        childWorkouts: allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === mainTPath.id),
      }));

      setGroupedTPaths(newGroupedTPaths);

      // Determine next recommended workout (least recently completed within the active main T-Path)
      if (activeMainTPathId) {
        const activePathWorkouts = allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === activeMainTPathId);
        if (activePathWorkouts.length > 0) {
          const sortedByLastCompleted = [...activePathWorkouts].sort((a, b) => {
            const dateA = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0;
            const dateB = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0;
            return dateA - dateB; // Ascending order, so least recent is first
          });
          setNextRecommendedWorkoutId(sortedByLastCompleted[0].id);
        } else {
          setNextRecommendedWorkoutId(null);
        }
      } else {
        setNextRecommendedWorkoutId(null);
      }

    } catch (err: any) {
      toast.error("Failed to load Transformation Paths: " + err.message);
      console.error("Error fetching T-Paths:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    fetchWorkoutsAndProfile();
  }, [fetchWorkoutsAndProfile]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `Last: ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
  };

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "cursor-pointer hover:bg-accent transition-colors",
          selectedWorkoutId === 'ad-hoc' && "border-primary ring-2 ring-primary"
        )}
        onClick={() => onWorkoutSelect('ad-hoc')}
      >
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlusCircle className="h-5 w-5 mr-2" />
            Start Ad-Hoc Workout
          </CardTitle>
          <CardDescription>
            Start a workout without a T-Path. Add exercises as you go.
          </CardDescription>
        </CardHeader>
      </Card>

      <h3 className="text-xl font-semibold">Your Transformation Paths</h3>

      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : groupedTPaths.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            You haven't created any Transformation Paths yet. Go to <a href="/manage-t-paths" className="text-primary underline">Manage T-Paths</a> to create one.
          </p>
        ) : (
          groupedTPaths.map(group => (
            <div key={group.mainTPath.id} className="space-y-3">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-muted-foreground" />
                {group.mainTPath.template_name}
                {group.mainTPath.id === activeMainTPathId && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
                )}
              </h4>
              {group.childWorkouts.length === 0 ? (
                <p className="text-muted-foreground text-sm ml-7">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7">
                  {group.childWorkouts.map(workout => {
                    const workoutBorderClass = getWorkoutColorClass(workout.template_name, 'border');
                    const isNextRecommended = workout.id === nextRecommendedWorkoutId;
                    const isSelected = selectedWorkoutId === workout.id;

                    return (
                      <Card 
                        key={workout.id} 
                        className={cn(
                          "flex flex-col justify-between p-4 border-2 cursor-pointer hover:bg-accent transition-colors",
                          workoutBorderClass,
                          isSelected && "border-primary ring-2 ring-primary",
                          isNextRecommended && "border-green-500 ring-2 ring-green-500"
                        )}
                        onClick={() => onWorkoutSelect(workout.id)}
                      >
                        <CardTitle className="text-base mb-2">{workout.template_name}</CardTitle>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            {formatLastCompleted(workout.last_completed_at)}
                          </p>
                          <Button onClick={() => onWorkoutSelect(workout.id)} variant="secondary" size="sm">
                            {isNextRecommended ? "Start Next" : "Start"}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};