"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, ArrowRight, Eye, Dumbbell, Timer } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils';
import { db } from '@/lib/db';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutSessionWithDetails extends WorkoutSession {
  exercise_count: number;
}

interface PreviousWorkoutsCardProps {
  onViewSummary: (sessionId: string) => void; // New prop to open the summary modal
}

export const PreviousWorkoutsCard = ({ onViewSummary }: PreviousWorkoutsCardProps) => {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [recentSessions, setRecentSessions] = useState<WorkoutSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWorkouts = async () => {
      if (!session) return;
      
      setLoading(true);
      try {
        // 1. Fetch recent workout sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('id, template_name, session_date, duration_string, completed_at, created_at, rating, t_path_id, user_id')
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null) // Only show completed workouts
          .order('session_date', { ascending: false })
          .limit(3);

        if (sessionsError) throw sessionsError;

        // Store fetched sessions in IndexedDB
        if (sessionsData && sessionsData.length > 0) {
          await db.workout_sessions.bulkPut(sessionsData);
        }

        const sessionIds = (sessionsData || []).map(s => s.id);

        // 2. Fetch set logs for these sessions
        const { data: setLogsData, error: setLogsError } = await supabase
          .from('set_logs')
          .select('id, session_id, exercise_id, weight_kg, reps, reps_l, reps_r, time_seconds, is_pb, created_at')
          .in('session_id', sessionIds);

        if (setLogsError) throw setLogsError;

        // Store fetched set logs in IndexedDB
        if (setLogsData && setLogsData.length > 0) {
          await db.set_logs.bulkPut(setLogsData);
        }

        // 3. Collect all unique exercise IDs from these set logs
        const exerciseIds = new Set<string>();
        (setLogsData || []).forEach(log => {
          if (log.exercise_id) {
            exerciseIds.add(log.exercise_id);
          }
        });

        // 4. Fetch exercise definitions for these exercises (if not already in cache)
        const existingExerciseDefs = await db.exercise_definitions_cache.where('id').anyOf(Array.from(exerciseIds)).toArray();
        const existingExerciseDefIds = new Set(existingExerciseDefs.map(ex => ex.id));
        const missingExerciseIds = Array.from(exerciseIds).filter(id => !existingExerciseDefIds.has(id));

        if (missingExerciseIds.length > 0) {
          const { data: missingExerciseDefs, error: missingDefsError } = await supabase
            .from('exercise_definitions')
            .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url')
            .in('id', missingExerciseIds);
          
          if (missingDefsError) throw missingDefsError;
          if (missingExerciseDefs && missingExerciseDefs.length > 0) {
            await db.exercise_definitions_cache.bulkPut(missingExerciseDefs);
          }
        }

        const sessionsWithDetails: WorkoutSessionWithDetails[] = await Promise.all(
          (sessionsData || []).map(async (sessionItem) => {
            // Count unique exercise_ids from the fetched setLogsData
            const uniqueExerciseCount = new Set(
              (setLogsData || [])
                .filter(log => log.session_id === sessionItem.id && log.exercise_id)
                .map(log => log.exercise_id)
            ).size;

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

  const handleViewSummaryClick = (sessionId: string) => {
    onViewSummary(sessionId); // Use the callback prop
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-center text-xl">
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
                  <div className="flex items-center justify-between p-3">
                    <div className="flex flex-col">
                      <CardTitle className={cn("text-base font-semibold leading-tight text-center", workoutTextClass)}>{workoutName}</CardTitle>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {sessionItem.completed_at ? formatTimeAgo(new Date(sessionItem.completed_at)) : 'N/A'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewSummaryClick(sessionItem.id)}
                      title="View Summary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="pt-0 pb-3 px-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" /> {sessionItem.exercise_count} Exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {sessionItem.duration_string || 'N/A'}
                      </span>
                    </div>
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