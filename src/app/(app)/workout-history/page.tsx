"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Dumbbell, Timer, ListChecks, Trophy, CalendarDays } from 'lucide-react'; // Added CalendarDays
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { WorkoutBadge } from '@/components/workout-badge';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal'; // Import the modal
import { ConsistencyCalendarModal } from '@/components/dashboard/consistency-calendar-modal'; // Import ConsistencyCalendarModal

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutSessionWithAggregatedDetails extends WorkoutSession {
  exercise_count: number;
  total_volume_kg: number;
  has_prs: boolean;
}

export default function WorkoutHistoryPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSessionWithAggregatedDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); // State for Consistency Calendar modal

  const fetchWorkoutHistory = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all completed workout sessions for the user
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, template_name, session_date, duration_string, completed_at, created_at, rating, t_path_id, user_id')
        .eq('user_id', session.user.id)
        .not('completed_at', 'is', null) // Only show completed workouts
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Store fetched sessions in IndexedDB
      if (sessionsData && sessionsData.length > 0) {
        await db.workout_sessions.bulkPut(sessionsData);
      }

      const sessionIds = (sessionsData || []).map(s => s.id);

      // 2. Fetch all set logs for these sessions
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

      const allExerciseDefs = await db.exercise_definitions_cache.toArray();
      const exerciseDefMap = new Map(allExerciseDefs.map(def => [def.id, def]));

      // 5. Aggregate details for each session
      const sessionsWithDetails: WorkoutSessionWithAggregatedDetails[] = (sessionsData || []).map(sessionItem => {
        let exerciseCount = new Set<string>();
        let totalVolume = 0;
        let hasPRs = false;

        (setLogsData || [])
          .filter(log => log.session_id === sessionItem.id)
          .forEach(log => {
            if (log.exercise_id) {
              exerciseCount.add(log.exercise_id);
              const exerciseDef = exerciseDefMap.get(log.exercise_id);
              if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
                totalVolume += (log.weight_kg * log.reps);
              }
            }
            if (log.is_pb) {
              hasPRs = true;
            }
          });

        return {
          ...sessionItem,
          exercise_count: exerciseCount.size,
          total_volume_kg: totalVolume,
          has_prs: hasPRs,
        };
      });
      setWorkoutSessions(sessionsWithDetails);
    } catch (err: any) {
      toast.error("Failed to load workout history: " + err.message);
      console.error("Error fetching workout history:", err);
      setError(err.message || "Failed to load workout history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutHistory();
  }, [session, router, supabase]);

  const handleDeleteSession = async (sessionId: string, templateName: string | null) => {
    if (!confirm(`Are you sure you want to delete the workout session "${templateName || 'Ad Hoc Workout'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workout_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', session?.user?.id);

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Workout session deleted successfully!");
      await fetchWorkoutHistory(); // Re-fetch history after deletion
    } catch (err: any) {
      console.error("Failed to delete workout session:", err);
      toast.error("Failed to delete workout session: " + err.message);
    }
  };

  const handleViewSummary = (sessionId: string) => {
    setSummarySessionId(sessionId);
    setShowSummaryModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <p className="text-muted-foreground">Loading workout history...</p>
        <div className="space-y-4 mt-4 w-full max-w-md">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive p-4">
        <p>{error}</p>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-2 sm:p-4">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout History</h1>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </header>

      <p className="text-muted-foreground mb-6 text-center text-lg">
        Total Workouts: <span className="font-semibold text-primary">{workoutSessions.length}</span>
      </p>

      <section className="mb-8">
        {workoutSessions.length === 0 ? (
          <p className="text-muted-foreground text-center">No workout sessions logged yet. Start a workout to see your history!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutSessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');
              const workoutBgClass = getWorkoutColorClass(workoutName, 'bg'); // For the badge background

              return (
                <Card key={sessionItem.id} className={cn("border-2", workoutBorderClass, "group hover:shadow-lg transition-shadow duration-200 ease-in-out")}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <WorkoutBadge workoutName={workoutName} className="text-base px-3 py-1">
                      {workoutName}
                    </WorkoutBadge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSession(sessionItem.id, sessionItem.template_name)}
                      title="Delete Workout Session"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-3">
                    <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-primary" /> {/* Added CalendarDays icon */}
                        <span>{new Date(sessionItem.session_date).toLocaleDateString()}</span> {/* Display workout date */}
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="h-4 w-4 text-primary" />
                        <span>{sessionItem.duration_string || 'Less than a minute'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-4 w-4 text-primary" />
                        <span>{sessionItem.exercise_count} Exercises</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span>{sessionItem.total_volume_kg.toLocaleString()} kg Volume</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className={cn("h-4 w-4", sessionItem.has_prs ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground")} />
                        <span>{sessionItem.has_prs ? 'PRs Achieved!' : 'No PRs'}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleViewSummary(sessionItem.id)} // Changed to open modal
                      className="w-full mt-4"
                    >
                      View Summary
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Button
        variant="outline"
        className="w-full mt-4"
        onClick={() => setIsCalendarOpen(true)}
      >
        <CalendarDays className="h-4 w-4 mr-2" /> View Consistency Calendar
      </Button>

      <WorkoutSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        sessionId={summarySessionId}
      />

      <ConsistencyCalendarModal
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
      />
    </div>
  );
}