"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Dumbbell, Timer, Trophy } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type WorkoutSession = Tables<'workout_sessions'>;
type SetLog = Tables<'set_logs'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Define a type for set logs joined with exercise definitions, including is_pb
type SetLogWithExercise = SetLog & {
  exercise_definitions: ExerciseDefinition | null;
  is_pb?: boolean; // Add is_pb property for display
};

interface WorkoutSummaryPageProps {
  params: Record<string, string>;
}

export default function WorkoutSummaryPage({ params }: WorkoutSummaryPageProps) {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { sessionId } = params;

  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [setLogs, setSetLogs] = useState<SetLogWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [prsAchieved, setPrsAchieved] = useState<number>(0);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchWorkoutSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch workout session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('id', sessionId)
          .eq('user_id', session.user.id)
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || "Workout session not found.");
        }
        setWorkoutSession(sessionData);

        // Fetch all set logs for this session, joining with exercise definitions
        const { data: setLogsData, error: setLogsError } = await supabase
          .from('set_logs')
          .select(`
            *,
            exercise_definitions (
              id, name, main_muscle, type, category
            )
          `)
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (setLogsError) {
          throw new Error(setLogsError.message);
        }

        let volume = 0;
        let prCount = 0;
        const processedSetLogs: SetLogWithExercise[] = [];

        for (const log of setLogsData) {
          const exerciseDef = log.exercise_definitions as ExerciseDefinition;
          if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
            volume += log.weight_kg * log.reps;
          }

          // Re-check PR status for each set log
          let isCurrentSetPR = false;
          if (log.exercise_id) {
            const { data: allPreviousSets, error: fetchPreviousError } = await supabase
              .from('set_logs')
              .select('id, weight_kg, reps, time_seconds') // Include 'id' here
              .eq('exercise_id', log.exercise_id)
              .order('created_at', { ascending: false });

            if (!fetchPreviousError && allPreviousSets) {
              // Filter out the current set from comparison
              const relevantPreviousSets = allPreviousSets.filter(s => s.id !== log.id);

              if (exerciseDef?.type === 'weight') {
                const currentVolume = (log.weight_kg || 0) * (log.reps || 0);
                isCurrentSetPR = relevantPreviousSets.every(prevSet => {
                  const prevVolume = (prevSet.weight_kg || 0) * (prevSet.reps || 0);
                  return currentVolume > prevVolume;
                });
              } else if (exerciseDef?.type === 'timed') {
                const currentTime = log.time_seconds || Infinity;
                isCurrentSetPR = relevantPreviousSets.every(prevSet => {
                  const prevTime = prevSet.time_seconds || Infinity;
                  return currentTime < prevTime;
                });
              }
            }
          }
          if (isCurrentSetPR) {
            prCount++;
          }
          processedSetLogs.push({ ...log, exercise_definitions: exerciseDef, is_pb: isCurrentSetPR });
        }
        
        setSetLogs(processedSetLogs);
        setTotalVolume(volume);
        setPrsAchieved(prCount);

      } catch (err: any) {
        console.error("Failed to fetch workout summary:", err);
        setError(err.message || "Failed to load workout summary. Please try again.");
        toast.error(err.message || "Failed to load workout summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutSummary();
  }, [session, router, sessionId, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout summary...</p>
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

  if (!workoutSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Workout session not found.</p>
      </div>
    );
  }

  // Group set logs by exercise
  const exercisesWithGroupedSets = setLogs.reduce((acc, log) => {
    const exerciseName = log.exercise_definitions?.name || 'Unknown Exercise';
    if (!acc[exerciseName]) {
      acc[exerciseName] = [];
    }
    acc[exerciseName].push(log);
    return acc;
  }, {} as Record<string, SetLogWithExercise[]>);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workout Summary</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{workoutSession.template_name || 'Ad Hoc Workout'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Date: {new Date(workoutSession.session_date).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Timer className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">Duration: {workoutSession.duration_string || 'N/A'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">Total Volume: {totalVolume.toLocaleString()} kg</p>
          </div>
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="text-lg font-semibold">PRs Achieved: {prsAchieved}</p>
          </div>
        </CardContent>
      </Card>

      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Exercises Performed</h2>
        {Object.entries(exercisesWithGroupedSets).length === 0 ? (
          <p className="text-muted-foreground">No exercises logged for this session.</p>
        ) : (
          Object.entries(exercisesWithGroupedSets).map(([exerciseName, sets]) => (
            <Card key={exerciseName} className="mb-4">
              <CardHeader>
                <CardTitle>{exerciseName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Set</TableHead>
                      <TableHead>Weight (kg)</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Time (s)</TableHead>
                      <TableHead>Reps (L)</TableHead>
                      <TableHead>Reps (R)</TableHead>
                      <TableHead>PR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sets.map((set, index) => (
                      <TableRow key={set.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{set.weight_kg ?? '-'}</TableCell>
                        <TableCell>{set.reps ?? '-'}</TableCell>
                        <TableCell>{set.time_seconds ?? '-'}</TableCell>
                        <TableCell>{set.reps_l ?? '-'}</TableCell>
                        <TableCell>{set.reps_r ?? '-'}</TableCell>
                        <TableCell>{set.is_pb ? <Trophy className="h-4 w-4 text-yellow-500" /> : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <MadeWithDyad />
    </div>
  );
}