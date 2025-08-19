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

type TPath = Tables<'t_paths'>;
type WorkoutSession = Tables<'workout_sessions'>;

interface TPathWithWorkouts extends TPath {
  workouts: (TPath & { last_completed_at: string | null })[];
}

export default function StartTPathPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [tPaths, setTPaths] = useState<TPathWithWorkouts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTPaths = useCallback(async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      // Fetch main T-Paths (where user_id is the actual user's ID and parent_t_path_id is NULL)
      const { data: mainTPaths, error: mainTPathsError } = await supabase
        .from('t_paths')
        .select('*')
        .eq('user_id', session.user.id)
        .is('parent_t_path_id', null) // Main T-Paths have no parent
        .order('template_name', { ascending: true });

      if (mainTPathsError) throw mainTPathsError;

      const tPathsWithWorkouts: TPathWithWorkouts[] = [];

      for (const mainTPath of mainTPaths || []) {
        // Fetch child workouts for each main T-Path (where parent_t_path_id is the main T-Path's ID)
        const { data: childWorkouts, error: childWorkoutsError } = await supabase
          .from('t_paths')
          .select('*')
          .eq('parent_t_path_id', mainTPath.id) // Link to parent T-Path
          .order('template_name', { ascending: true });

        if (childWorkoutsError) throw childWorkoutsError;

        const workoutsWithLastDate = await Promise.all((childWorkouts || []).map(async (workout) => {
          const { data: lastSessionDate, error: lastSessionError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
          
          if (lastSessionError) {
            console.error(`Error fetching last session date for workout ${workout.template_name}:`, lastSessionError);
          }
          
          return {
            ...workout,
            last_completed_at: lastSessionDate && lastSessionDate.length > 0 ? lastSessionDate[0].session_date : null,
          };
        }));

        tPathsWithWorkouts.push({
          ...mainTPath,
          workouts: workoutsWithLastDate,
        });
      }
      setTPaths(tPathsWithWorkouts);
    } catch (err: any) {
      toast.error("Failed to load Transformation Paths: " + err.message);
      console.error("Error fetching T-Paths:", err);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, router]);

  useEffect(() => {
    fetchTPaths();
  }, [fetchTPaths]);

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
          Start an ad-hoc session or choose one of your personalized Transformation Paths.
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

        <h3 className="text-xl font-semibold pt-4">Your Personalized Paths</h3>

        <div className="space-y-2">
          {loading ? (
            <>
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </>
          ) : tPaths.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              You haven't created any Transformation Paths yet. Go to 'Manage T-Paths' to create one.
            </p>
          ) : (
            tPaths.map(tPath => {
              const isExpandable = tPath.template_name === '4-Day Upper/Lower';
              
              if (isExpandable) {
                return (
                  <Card key={tPath.id} className="w-full"> {/* Wrap the entire accordion item in a Card */}
                    <Accordion type="single" collapsible className="w-full"> {/* Removed value prop */}
                      <AccordionItem value={tPath.id}> {/* Removed border-b-0 */}
                        <AccordionTrigger className="flex items-center justify-between w-full p-6 text-lg font-semibold hover:no-underline data-[state=open]:border-b">
                          <div className="flex items-center">
                            <Dumbbell className="h-5 w-5 mr-2" />
                            {tPath.template_name}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                          <div className="grid grid-cols-1 gap-3">
                            {tPath.workouts.length === 0 ? (
                              <p className="text-muted-foreground text-center py-2">No workouts defined for this path.</p>
                            ) : (
                              tPath.workouts.map(workout => (
                                <Card key={workout.id} className="flex items-center justify-between p-4">
                                  <div>
                                    <CardTitle className="text-base">{workout.template_name}</CardTitle>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                      <CalendarDays className="h-4 w-4" />
                                      {formatLastCompleted(workout.last_completed_at)}
                                    </p>
                                  </div>
                                  <Button onClick={() => handleStartWorkout(workout.id)}>Start</Button>
                                </Card>
                              ))
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </Card>
                );
              } else {
                // Render as a non-expandable card for other T-Paths
                return (
                  <Card key={tPath.id} className="flex items-center justify-between p-4">
                    <div>
                      <CardTitle className="text-base flex items-center">
                        <Dumbbell className="h-5 w-5 mr-2" />
                        {tPath.template_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tPath.workouts.length} workouts
                      </p>
                    </div>
                    {/* Optionally add a button to view details or manage this T-Path */}
                    <Button variant="outline" onClick={() => router.push(`/manage-t-paths?edit=${tPath.id}`)}>
                      View Workouts
                    </Button>
                  </Card>
                );
              }
            })
          )}
        </div>
      </div>
    </div>
  );
}