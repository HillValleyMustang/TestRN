"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass, getMaxMinutes } from '@/lib/utils';

type TPath = Tables<'t_paths'>;
type Profile = Tables<'profiles'>;

export const NextWorkoutCard = () => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [mainTPath, setMainTPath] = useState<TPath | null>(null);
  const [nextWorkout, setNextWorkout] = useState<TPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('N/A');

  useEffect(() => {
    const fetchNextWorkout = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        // 1. Fetch user profile to get active_t_path_id AND preferred_session_length
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('active_t_path_id, preferred_session_length')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const activeMainTPathId = profileData?.active_t_path_id;
        const preferredSessionLength = profileData?.preferred_session_length;

        if (preferredSessionLength) {
          const maxMinutes = getMaxMinutes(preferredSessionLength);
          setEstimatedDuration(`${preferredSessionLength} minutes`);
        } else {
          setEstimatedDuration('N/A');
        }

        if (!activeMainTPathId) {
          setMainTPath(null);
          setNextWorkout(null);
          setLoading(false);
          return;
        }

        // 2. Fetch the active main T-Path details
        const { data: mainTPathData, error: mainTPathError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('id', activeMainTPathId)
          .eq('user_id', session.user.id)
          .is('parent_t_path_id', null)
          .single();

        if (mainTPathError || !mainTPathData) {
          console.error("Active main T-Path not found or invalid:", mainTPathError);
          setMainTPath(null);
          setNextWorkout(null);
          setLoading(false);
          return;
        }
        setMainTPath(mainTPathData);

        // 3. Fetch child workouts for this main T-Path
        const { data: childWorkoutsData, error: childWorkoutsError } = await supabase
          .from('t_paths')
          .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
          .eq('parent_t_path_id', mainTPathData.id)
          .eq('is_bonus', true)
          .order('template_name', { ascending: true });

        if (childWorkoutsError) {
          throw childWorkoutsError;
        }

        // 4. Determine the "next" workout (e.g., the least recently completed)
        if (childWorkoutsData && childWorkoutsData.length > 0) {
          const workoutsWithLastDate = await Promise.all((childWorkoutsData as TPath[] || []).map(async (workout) => {
            const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
            
            if (lastSessionError) {
              console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
            }
            
            return {
              ...workout,
              last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
            };
          }));

          const sortedByLastCompleted = [...workoutsWithLastDate].sort((a, b) => {
            const dateA = a.last_completed_at ? new Date(a.last_completed_at).getTime() : 0;
            const dateB = b.last_completed_at ? new Date(b.last_completed_at).getTime() : 0;
            return dateA - dateB; // Ascending order, so least recent is first
          });
          setNextWorkout(sortedByLastCompleted[0]);
        } else {
          setNextWorkout(null);
        }

      } catch (err: any) {
        toast.error("Failed to load your next workout: " + err.message);
        console.error("Error fetching next workout:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNextWorkout();
  }, [session, supabase]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!mainTPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No active Transformation Path found. Complete onboarding or set one in your profile to get started.</p>
        </CardContent>
      </Card>
    );
  }

  if (!nextWorkout) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
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
        <CardTitle className="flex items-center gap-2">
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
          </div>
          <Button onClick={() => router.push(`/workout?workoutId=${nextWorkout.id}`)} variant="brand" size="lg">
            Start Workout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};