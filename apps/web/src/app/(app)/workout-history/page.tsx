"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Dumbbell, Timer, ListChecks, Trophy, CalendarDays } from 'lucide-react';
import { Tables, WorkoutSessionWithAggregatedDetails } from '@/types/supabase';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTimeAgo, getWorkoutColorClass, cn } from '@/lib/utils';
import { WorkoutBadge } from '@/components/workout-badge';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
import { ConsistencyCalendarModal } from '@/components/dashboard/consistency-calendar-modal';
import { useWorkoutHistory } from '@/hooks/data/useWorkoutHistory'; // Import the new centralized hook

export default function WorkoutHistoryPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  
  // Use the new centralized hook for all data and state management
  const { sessions: workoutSessions, isLoading: loading, error, refresh: fetchWorkoutHistory } = useWorkoutHistory();

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

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
      await fetchWorkoutHistory(); // Re-fetch history using the hook's refresh function
    } catch (err: any) {
      console.error("Failed to delete workout session:", err);
      toast.error("Failed to delete workout session."); // Changed to toast.error
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
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout History</h1>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </header>

      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground text-lg">
          Total Workouts: <span className="font-semibold text-primary">{workoutSessions.length}</span>
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCalendarOpen(true)}
        >
          <CalendarDays className="h-4 w-4 mr-2" /> Calendar
        </Button>
      </div>

      <section className="mb-8">
        {workoutSessions.length === 0 ? (
          <p className="text-muted-foreground text-center">No workout sessions logged yet. Start a workout to see your history!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutSessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');

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
                        <CalendarDays className="h-4 w-4 text-primary" />
                        <span>{new Date(sessionItem.session_date).toLocaleDateString()}</span>
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
                        <span>{sessionItem.has_prs ? 'PBs Achieved!' : 'No PBs'}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleViewSummary(sessionItem.id)}
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