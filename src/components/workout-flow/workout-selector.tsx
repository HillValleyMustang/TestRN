"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils'; // Import getWorkoutIcon

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
      const fetchedActiveMainTPathId = profileData?.active_t_path_id || null;
      setActiveMainTPathId(fetchedActiveMainTPathId);

      let mainTPathsData: TPath[] | null = [];
      if (fetchedActiveMainTPathId) {
        // 2. Fetch ONLY the active main T-Path for the user
        const { data, error: mainTPathsError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null)
          .eq('id', fetchedActiveMainTPathId) // Filter by active T-Path ID
          .order('created_at', { ascending: true });

        if (mainTPathsError) throw mainTPathsError;
        mainTPathsData = data as TPath[];
      }

      // 3. Fetch all child workouts for the user (these will be filtered by parent_t_path_id later)
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
      if (fetchedActiveMainTPathId) {
        const activePathWorkouts = allChildWorkoutsWithLastDate.filter(cw => cw.parent_t_path_id === fetchedActiveMainTPathId);
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
      <div className="space-y-4">
        {groupedTPaths.length === 0 ? (
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
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {group.childWorkouts.map(workout => {
                    const workoutColorClass = getWorkoutColorClass(workout.template_name, 'text');
                    const workoutBgClass = getWorkoutColorClass(workout.template_name, 'bg');
                    const workoutBorderClass = getWorkoutColorClass(workout.template_name, 'border');
                    const Icon = getWorkoutIcon(workout.template_name);
                    const isNextRecommended = workout.id === nextRecommendedWorkoutId;
                    const isSelected = selectedWorkoutId === workout.id;

                    return (
                      <Button
                        key={workout.id}
                        variant="outline"
                        className={cn(
                          "h-auto p-4 flex flex-col items-start justify-between text-left transition-colors relative",
                          "border-2",
                          workoutBorderClass,
                          workoutBgClass,
                          isSelected && "ring-2 ring-primary",
                          isNextRecommended && "ring-2 ring-green-500",
                          "hover:brightness-90 dark:hover:brightness-110"
                        )}
                        onClick={() => onWorkoutSelect(workout.id)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {Icon && <Icon className={cn("h-5 w-5", workoutColorClass)} />}
                          <span className={cn("font-semibold text-base", workoutColorClass)}>{workout.template_name}</span>
                        </div>
                        <p className={cn("text-xs", workoutColorClass)}> {/* Apply workoutColorClass here */}
                          {formatLastCompleted(workout.last_completed_at)}
                        </p>
                        {isNextRecommended && (
                          <span className="absolute top-2 right-2 text-xs font-medium text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900 px-2 py-0.5 rounded-full">Next</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ad-hoc workout card moved here */}
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
    </div>
  );
};