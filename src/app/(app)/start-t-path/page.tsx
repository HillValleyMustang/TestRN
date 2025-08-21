"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PlusCircle, Dumbbell, CalendarDays } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import cn and getWorkoutColorClass

type TPath = Tables<'t_paths'>;
type WorkoutSession = Tables<'workout_sessions'>;

interface TPathWithWorkouts extends TPath {
  workouts: (TPath & { last_completed_at: string | null })[];
}

export default function StartTPathPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [activeTPath, setActiveTPath] = useState<TPathWithWorkouts | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveTPath = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }
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
        setActiveTPath(null); // No active T-Path set
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
        // If active_t_path_id is set but the T-Path doesn't exist or isn't a main T-Path for this user
        console.error("Active T-Path not found or invalid:", mainTPathError);
        setActiveTPath(null);
        setLoading(false);
        return;
      }

      // 3. Fetch child workouts for the active main T-Path
      const { data: childWorkouts, error: childWorkoutsError } = await supabase
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id')
        .eq('parent_t_path_id', mainTPath.id)
        .order('template_name', { ascending: true });

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

      setActiveTPath({
        ...mainTPath,
        workouts: workoutsWithLastDate,
      });

    } catch (err: any) {
      toast.error("Failed to load Transformation Paths: " + err.message);
      console.error("Error fetching T-Paths:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router]);

  useEffect(() => {
    fetchActiveTPath();
  }, [fetchActiveTPath]);

  const handleStartWorkout = (workoutId: string) => {
    router.push(`/workout-session/${workoutId}`);
  };

  const formatLastCompleted = (dateString: string | null) => {
    if (!dateString) return 'Never completed';
    const date = new Date(dateString);
    return `${formatDistanceToNowStrict(date, { addSuffix: true })} ago`;
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Your Transformation Paths</h1>
        <p className="text-muted-foreground">
          Start an ad-hoc session or choose one of your personalised Transformation Paths.
        </p>
      </header>
      <div className="space-y-4">
        <Card
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => handleStartWorkout('ad-hoc')}
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
          ) : !activeTPath ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't selected an active Transformation Path yet. Please go to your <a href="/profile" className="text-primary underline">Profile Settings</a> to choose one.
            </p>
          ) : (
            <Card key={activeTPath.id} className="w-full">
              <Accordion type="single" collapsible defaultValue={activeTPath.id} className="w-full">
                <AccordionItem value={activeTPath.id}>
                  <AccordionTrigger className="flex items-center justify-between w-full p-6 text-lg font-semibold hover:no-underline data-[state=open]:border-b">
                    <div className="flex items-center">
                      <Dumbbell className="h-5 w-5 mr-2" />
                      {activeTPath.template_name}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <div className="grid grid-cols-1 gap-3">
                      {activeTPath.workouts.length === 0 ? (
                        <p className="text-muted-foreground text-center py-2">No workouts defined for this path. This may happen if your session length is too short for any workouts.</p>
                      ) : (
                        activeTPath.workouts.map(workout => {
                          const workoutBorderClass = getWorkoutColorClass(workout.template_name, 'border');
                          return (
                            <Card key={workout.id} className={cn("flex items-center justify-between p-4 border-2", workoutBorderClass)}>
                              <div>
                                <CardTitle className="text-base">{workout.template_name}</CardTitle>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <CalendarDays className="h-4 w-4" />
                                  {formatLastCompleted(workout.last_completed_at)}
                                </p>
                              </div>
                              <Button onClick={() => handleStartWorkout(workout.id)}>Start</Button>
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
    </div>
  );
}