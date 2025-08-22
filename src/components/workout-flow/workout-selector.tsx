"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Dumbbell, CalendarDays } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass, getMaxMinutes } from '@/lib/utils';

type TPath = Tables<'t_paths'>;
type Profile = Tables<'profiles'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface WorkoutSelectorProps {
  onWorkoutSelect: (workoutId: string | null) => void;
  selectedWorkoutId: string | null;
}

export const WorkoutSelector = ({ onWorkoutSelect, selectedWorkoutId }: WorkoutSelectorProps) => {
  const { session, supabase } = useSession();
  const [activeMainTPath, setActiveMainTPath] = useState<TPath | null>(null);
  const [childWorkouts, setChildWorkouts] = useState<WorkoutWithLastCompleted[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextRecommendedWorkoutId, setNextRecommendedWorkoutId] = useState<string | null>(null);

  const fetchActiveTPathAndWorkouts = useCallback(async () => {
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
        setActiveMainTPath(null);
        setChildWorkouts([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the specific active main T-Path
      const { data: mainTPath, error: mainTPathError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('id', activeTPathId)
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null) // Ensure it's a main T-Path
        .single();

      if (mainTPathError || !mainTPath) {
        console.error("Active T-Path not found or invalid:", mainTPathError);
        setActiveMainTPath(null);
        setChildWorkouts([]);
        setLoading(false);
        return;
      }
      setActiveMainTPath(mainTPath);

      // 3. Fetch child workouts for the active main T-Path
      const { data: workouts, error: workoutsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('parent_t_path_id', mainTPath.id)
        .order('template_name', { ascending: true });

      if (workoutsError) throw workoutsError;

      const workoutsWithLastDate = await Promise.all((workouts as TPath[] || []).map(async (workout) => {
        const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        
        if (lastSessionError) {
          console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
        }
        
        return {
          ...workout,
          last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
        };
      }));

      setChildWorkouts(workoutsWithLastDate);

      // Determine next recommended workout (e.g., least recently completed)
      if (workoutsWithLastDate.length > 0) {
        const sortedByLastCompleted = [...workoutsWithLastDate].sort((a, b) => {
          const dateA = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0;
          const dateB = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0;
          return dateA - dateB; // Ascending order, so least recent is first
        });
        setNextRecommendedWorkoutId(sortedByLastCompleted[0].id);
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
    fetchActiveTPathAndWorkouts();
  }, [fetchActiveTPathAndWorkouts]);

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `${formatDistanceToNowStrict(date, { addSuffix: true })} ago`;
  };

  return (
    <div className="space-y-4">
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

      <h3 className="text-xl font-semibold pt-4">Your Active Path</h3>

      <div className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : !activeMainTPath ? (
          <p className="text-muted-foreground text-center py-4">
            You haven't selected an active Transformation Path yet. Please go to your <a href="/profile" className="text-primary underline">Profile Settings</a> to choose one.
          </p>
        ) : (
          <Card key={activeMainTPath.id} className="w-full">
            <Accordion type="single" collapsible defaultValue={activeMainTPath.id} className="w-full">
              <AccordionItem value={activeMainTPath.id}>
                <AccordionTrigger className="flex items-center justify-between w-full p-6 text-lg font-semibold hover:no-underline data-[state=open]:border-b">
                  <div className="flex items-center">
                    <Dumbbell className="h-5 w-5 mr-2" />
                    {activeMainTPath.template_name}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                  <div className="grid grid-cols-1 gap-3">
                    {childWorkouts.length === 0 ? (
                      <p className="text-muted-foreground text-center py-2">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
                    ) : (
                      childWorkouts.map(workout => {
                        const workoutBorderClass = getWorkoutColorClass(workout.template_name, 'border');
                        const isNextRecommended = workout.id === nextRecommendedWorkoutId;
                        return (
                          <Card 
                            key={workout.id} 
                            className={cn(
                              "flex items-center justify-between p-4 border-2 cursor-pointer hover:bg-accent transition-colors",
                              workoutBorderClass,
                              selectedWorkoutId === workout.id && "border-primary ring-2 ring-primary",
                              isNextRecommended && "border-green-500 ring-2 ring-green-500" // Highlight next recommended
                            )}
                            onClick={() => onWorkoutSelect(workout.id)}
                          >
                            <div>
                              <CardTitle className="text-base">{workout.template_name}</CardTitle>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <CalendarDays className="h-4 w-4" />
                                {formatLastCompleted(workout.last_completed_at)}
                              </p>
                            </div>
                            <Button onClick={() => onWorkoutSelect(workout.id)} variant="secondary">
                              {isNextRecommended ? "Start Next" : "Start"}
                            </Button>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        )}
      </div>
    </div>
  );
};