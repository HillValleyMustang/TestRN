"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass, getMaxMinutes } from '@/lib/utils'; // Import getMaxMinutes

type TPath = Tables<'t_paths'>;
type Profile = Tables<'profiles'>; // Import Profile type

export const NextWorkoutCard = () => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [mainTPath, setMainTPath] = useState<TPath | null>(null); // Stores the user's active main T-Path
  const [nextWorkout, setNextWorkout] = useState<TPath | null>(null); // Stores the specific child workout to display
  const [loading, setLoading] = useState(true);
  const [estimatedDuration, setEstimatedDuration] = useState<string>('N/A'); // New state for estimated duration

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

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
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
          .is('parent_t_path_id', null) // Correctly identify a main T-Path
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
          .eq('is_bonus', true) // These are the actual individual workouts
          .order('template_name', { ascending: true }); // Order for consistent "next" selection

        if (childWorkoutsError) {
          throw childWorkoutsError;
        }

        // 4. Determine the "next" workout (e.g., the first one in the list)
        if (childWorkoutsData && childWorkoutsData.length > 0) {
          setNextWorkout(childWorkoutsData[0]); // Set the first child workout as the next one
        } else {
          setNextWorkout(null); // No child workouts found for this main T-Path
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

  // Removed workoutBorderClass as it's no longer needed for the border
  return (
    <Card> {/* Removed cn("border-2", workoutBorderClass) */}
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
          <Button onClick={() => router.push(`/workout-session/${nextWorkout.id}`)} variant="brand" size="lg">
            Start Workout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};