"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import cn and getWorkoutColorClass

type TPath = Tables<'t_paths'>;
type WorkoutSession = Tables<'workout_sessions'>;

export const NextWorkoutCard = () => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [tPath, setTPath] = useState<TPath | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTPath = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        // Get the user's T-Path
        const { data, error } = await supabase
          .from('t_paths')
          .select('id, template_name, created_at, is_bonus, user_id, version, settings, progression_settings, parent_t_path_id') // Specify all columns required by TPath
          .eq('user_id', session.user.id)
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setTPath(data[0] as TPath); // Explicitly cast
        }
      } catch (err: any) {
        toast.error("Failed to load T-Path: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTPath();
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

  if (!tPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Your Next Workout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No T-Path found. Complete onboarding to get started.</p>
        </CardContent>
      </Card>
    );
  }

  const workoutColorClass = getWorkoutColorClass(tPath.template_name, 'text');

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
            <h3 className={cn("text-lg font-semibold", workoutColorClass)}>{tPath.template_name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Estimated 45-60 min</span>
            </div>
          </div>
          <Button onClick={() => router.push(`/workout-session/${tPath.id}`)}>
            Start Workout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};