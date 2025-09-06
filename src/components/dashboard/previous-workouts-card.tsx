"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight, Eye, Dumbbell, Timer } from 'lucide-react'; // Added Eye, Dumbbell, Timer
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils'; // Added cn

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;

interface WorkoutSessionWithDetails extends WorkoutSession {
  exercise_count: number;
}

export const PreviousWorkoutsCard = () => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWorkouts = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id, template_name, session_date, duration_string, completed_at, created_at, rating, t_path_id, user_id')
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null) // Only show completed workouts
          .order('session_date', { ascending: false })
          .limit(3);

        if (sessionsError) throw sessionsError;

        const sessionsWithDetails: WorkoutSessionWithDetails[] = await Promise.all(
          (sessionsData || []).map(async (sessionItem) => {
            // Fetch exercise_ids from set_logs for this session
            const { data: setLogsData, error: setLogsError } = await supabase
              .from('set_logs')
              .select('exercise_id')
              .eq('session_id', sessionItem.id);

            if (setLogsError) {
              console.error(`Error fetching set logs for session ${sessionItem.id}:`, setLogsError);
            }
            // Count unique exercise_ids
            const uniqueExerciseCount = new Set((setLogsData || []).map((log: { exercise_id: string | null }) => log.exercise_id)).size;

            return {
              ...sessionItem,
              exercise_count: uniqueExerciseCount,
            };
          })
        );
        setRecentSessions(sessionsWithDetails);
      } catch (err: any) {
        toast.error("Failed to load previous workouts: " + err.message);
        console.error("Error fetching previous workouts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWorkouts();
  }, [session, supabase]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Previous Workouts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : recentSessions.length === 0 ? (
          <p className="text-muted-foreground">No previous workouts found. Complete a workout to see it here!</p>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');
              const workoutTextClass = getWorkoutColorClass(workoutName, 'text');

              return (
                <Card key={sessionItem.id} className={cn("border-2", workoutBorderClass)}>
                  <CardHeader>
                    <CardTitle className={cn("text-base", workoutTextClass)}>{workoutName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {sessionItem.completed_at ? formatTimeAgo(new Date(sessionItem.completed_at)) : 'N/A'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4" /> {sessionItem.exercise_count} Exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-4 w-4" /> {sessionItem.duration_string || 'N/A'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/workout-summary/${sessionItem.id}`)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" /> View Summary
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
            <Button
              variant="ghost"
              className="w-full justify-center text-primary hover:text-primary/90"
              onClick={() => router.push('/workout-history')}
            >
              View All History <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};