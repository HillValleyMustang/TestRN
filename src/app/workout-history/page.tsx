"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, History, CalendarDays, Trash2 } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutSession = Tables<'workout_sessions'>;

export default function WorkoutHistoryPage() {
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
        .select('*')
        .eq('user_id', session.user.id)
        .order('session_date', { ascending: false }); // Order by most recent first

      if (error) {
        throw new Error(error.message);
      }
      setWorkoutSessions(data || []);
    } catch (err: any) {
      console.error("Failed to fetch workout history:", err);
      setError(err.message || "Failed to load workout history. Please try again.");
      toast.error(err.message || "Failed to load workout history.");
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
        .eq('user_id', session?.user?.id); // Ensure only the user's own sessions can be deleted

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Workout session deleted successfully!");
      fetchWorkoutHistory(); // Re-fetch the list to update the UI
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
        <h1 className="text-3xl font-bold">Workout History</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <section className="mb-8">
        {workoutSessions.length === 0 ? (
          <p className="text-muted-foreground text-center">No workout sessions logged yet. Start a workout to see your history!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workoutSessions.map((sessionItem) => (
              <Card key={sessionItem.id}>
                <CardHeader>
                  <CardTitle>{sessionItem.template_name || 'Ad Hoc Workout'}</CardTitle>
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
            ))}
          </div>
        )}
      </section>

      <MadeWithDyad />
    </div>
  );
}