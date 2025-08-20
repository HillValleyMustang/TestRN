"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import cn and getWorkoutColorClass

type WorkoutSession = Tables<'workout_sessions'>;

export default function WorkoutHistoryPage() { // Renamed component
  const { session, supabase } = useSession();
  const router = useRouter();
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkoutHistory = async () => {
    if (!session) {
      router.push('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, template_name, session_date, duration_string, created_at, rating, user_id') // Specify all columns required by WorkoutSession
        .eq('user_id', session.user.id)
        .order('session_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      setWorkoutSessions(data as WorkoutSession[] || []); // Explicitly cast
    } catch (err: any) {
      console.error("Failed to fetch workout history:", err);
      setError(err.message || "Failed to load workout history. Please try again.");
      toast.error(err.message || "Failed to load workout history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      await fetchWorkoutHistory();
    }
    fetch();
  }, [session, router, supabase]);

  const handleDeleteSession = async (sessionId: string, tPathName: string | null) => {
    if (!confirm(`Are you sure you want to delete the workout session "${tPathName || 'Ad Hoc Workout'}"? This action cannot be undone.`)) {
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
      await fetchWorkoutHistory();
    } catch (err: any) {
      console.error("Failed to delete workout session:", err);
      toast.error("Failed to delete workout session: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout History</h1> {/* Renamed title */}
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <section className="mb-8">
        {workoutSessions.length === 0 ? (
          <p className="text-muted-foreground text-center">No workout sessions logged yet. Start a workout to see your history!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutSessions.map((sessionItem) => {
              const workoutName = sessionItem.template_name || 'Ad Hoc Workout';
              const workoutBorderClass = getWorkoutColorClass(workoutName, 'border');
              return (
                <Card key={sessionItem.id} className={cn("border-2", workoutBorderClass)}>
                  <CardHeader>
                    <CardTitle>{workoutName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sessionItem.session_date).toLocaleDateString()}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Duration: {sessionItem.duration_string || 'N/A'}
                    </p>
                    <div className="flex justify-between gap-2">
                      <Button
                        onClick={() => router.push(`/workout-summary/${sessionItem.id}`)}
                        className="flex-1"
                      >
                        View Summary
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteSession(sessionItem.id, sessionItem.template_name)}
                        title="Delete Workout Session"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <MadeWithDyad />
    </div>
  );
}