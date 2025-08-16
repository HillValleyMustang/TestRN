"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dumbbell, Info, Lightbulb, Plus, CheckCircle2, Trophy } from 'lucide-react';
import { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { ExerciseHistoryDialog } from '@/components/exercise-history-dialog';
import { ExerciseInfoDialog } from '@/components/exercise-info-dialog';
import { ExerciseProgressionDialog } from '@/components/exercise-progression-dialog';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>; // Use Tables for fetched logs
type SetLogInsert = TablesInsert<'set_logs'>; // Use TablesInsert for new logs

// Define a type for the joined data from template_exercises
type TemplateExerciseJoin = Tables<'template_exercises'> & {
  exercise_definitions: Tables<'exercise_definitions'>[] | null;
};

interface SetLogState extends SetLogInsert {
  isSaved: boolean;
  isPR: boolean;
  lastWeight?: number | null;
  lastReps?: number | null;
  lastTimeSeconds?: number | null;
}

// Explicitly define the props for the page component using Record<string, string> for params
interface WorkoutSessionPageProps {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>; // Removed Readonly
}

export default function WorkoutSessionPage({ params, searchParams }: WorkoutSessionPageProps) {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { templateId } = params;

  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercisesForTemplate, setExercisesForTemplate] = useState<ExerciseDefinition[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null); // Track session start time

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchWorkoutData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch the workout template
        const { data: templateData, error: fetchTemplateError } = await supabase
          .from('workout_templates')
          .select('*')
          .eq('id', templateId)
          .eq('user_id', session.user.id)
          .single();

        if (fetchTemplateError || !templateData) {
          throw new Error(fetchTemplateError?.message || "Workout template not found.");
        }
        setWorkoutTemplate(templateData);

        // 2. Fetch all exercises associated with this template via template_exercises
        const { data: templateExercisesData, error: fetchTemplateExercisesError } = await supabase
          .from('template_exercises')
          .select(`
            id, created_at, exercise_id, template_id, order_index,
            exercise_definitions (
              id, name, main_muscle, type, category, description, pro_tip, video_url
            )
          `)
          .eq('template_id', templateId)
          .order('order_index', { ascending: true });

        if (fetchTemplateExercisesError) {
          throw new Error(fetchTemplateExercisesError.message);
        }

        const fetchedExercises: ExerciseDefinition[] = (templateExercisesData as TemplateExerciseJoin[])
          .filter(te => te.exercise_definitions && te.exercise_definitions.length > 0)
          .map(te => te.exercise_definitions![0] as ExerciseDefinition); // Access the first element of the array

        setExercisesForTemplate(fetchedExercises);

        // 3. Fetch the ID of the most recent previous workout session for the user
        const { data: lastSessionData, error: lastSessionError } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: false })
          .limit(1)
          .single();

        if (lastSessionError && lastSessionError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.warn("Error fetching last session ID:", lastSessionError.message);
        }

        const lastSessionId = lastSessionData ? lastSessionData.id : null;

        // 4. Fetch last set data for each exercise using the lastSessionId
        const lastSetsData: Record<string, { weight_kg: number | null, reps: number | null, time_seconds: number | null }> = {};
        for (const ex of fetchedExercises) {
          if (lastSessionId) { // Only fetch last set if a previous session exists
            const { data: lastSet, error: lastSetError } = await supabase
              .from('set_logs')
              .select('weight_kg, reps, time_seconds')
              .eq('exercise_id', ex.id)
              .eq('session_id', lastSessionId) // Use the fetched lastSessionId
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastSetError && lastSetError.code !== 'PGRST116') {
              console.warn(`Could not fetch last set for exercise ${ex.name}:`, lastSetError.message);
            }
            if (lastSet) {
              lastSetsData[ex.id] = {
                weight_kg: lastSet.weight_kg,
                reps: lastSet.reps,
                time_seconds: lastSet.time_seconds,
              };
            }
          }
        }

        // 5. Create a new workout session entry
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: session.user.id,
            template_name: templateData.template_name, // Use the fetched template name
            session_date: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || "Failed to create workout session.");
        }
        setCurrentSessionId(sessionData.id);
        setSessionStartTime(new Date()); // Set the start time when the session is created

        // 6. Initialize sets for each exercise with last set data
        const initialSets: Record<string, SetLogState[]> = {};
        fetchedExercises.forEach(ex => {
          const lastSet = lastSetsData[ex.id];
          initialSets[ex.id] = [{
            weight_kg: null,
            reps: null,
            reps_l: null,
            reps_r: null,
            time_seconds: null,
            isSaved: false,
            isPR: false,
            lastWeight: lastSet?.weight_kg, // Carry over last entered values as hints for next set
            lastReps: lastSet?.reps,
            lastTimeSeconds: lastSet?.time_seconds,
          }];
        });
        setExercisesWithSets(initialSets);

      } catch (err: any) {
        console.error("Failed to fetch workout data:", err);
        setError(err.message || "Failed to load workout. Please try again.");
        toast.error(err.message || "Failed to load workout.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [session, router, templateId, supabase]);

  const handleAddSet = (exerciseId: string) => {
    setExercisesWithSets(prev => {
      const currentExerciseSets = prev[exerciseId];
      const lastSet = currentExerciseSets[currentExerciseSets.length - 1]; // Get the last set entered
      return {
        ...prev,
        [exerciseId]: [...currentExerciseSets, {
          weight_kg: null,
          reps: null,
          reps_l: null,
          reps_r: null,
          time_seconds: null,
          isSaved: false,
          isPR: false,
          lastWeight: lastSet?.weight_kg, // Carry over last entered values as hints for next set
          lastReps: lastSet?.reps,
          lastTimeSeconds: lastSet?.time_seconds,
        }]
      };
    });
  };

  const handleInputChange = (exerciseId: string, setIndex: number, field: keyof SetLogInsert, value: string) => {
    setExercisesWithSets(prev => {
      const newSets = [...prev[exerciseId]];
      newSets[setIndex] = {
        ...newSets[setIndex],
        [field]: parseFloat(value) || null
      };
      return { ...prev, [exerciseId]: newSets };
    });
  };

  const handleSaveSet = async (exerciseId: string, setIndex: number) => {
    if (!currentSessionId) {
      toast.error("Workout session not started. Please refresh.");
      return;
    }

    const currentSet = exercisesWithSets[exerciseId][setIndex];
    const exercise = exercisesForTemplate.find(ex => ex.id === exerciseId);

    if (!exercise) {
      toast.error("Exercise not found.");
      return;
    }

    if (exercise.type === 'weight' && (!currentSet.weight_kg || !currentSet.reps)) {
      toast.error("Please enter weight and reps for this set.");
      return;
    }
    if (exercise.type === 'timed' && !currentSet.time_seconds) {
      toast.error("Please enter time for this set.");
      return;
    }
    if (exercise.category === 'Unilateral' && (!currentSet.reps_l || !currentSet.reps_r)) {
      toast.error("Please enter reps for both left and right sides.");
      return;
    }

    const newSetLog: SetLogInsert = {
      session_id: currentSessionId,
      exercise_id: exerciseId,
      weight_kg: currentSet.weight_kg,
      reps: currentSet.reps,
      reps_l: currentSet.reps_l,
      reps_r: currentSet.reps_r,
      time_seconds: currentSet.time_seconds,
    };

    const { error: saveError } = await supabase.from('set_logs').insert([newSetLog]);

    if (saveError) {
      toast.error("Failed to save set: " + saveError.message);
      console.error("Error saving set:", saveError);
    } else {
      // Check for Personal Record (PR)
      let isPR = false;
      const { data: allPreviousSets, error: fetchPreviousError } = await supabase
        .from('set_logs')
        .select('weight_kg, reps, time_seconds')
        .eq('exercise_id', exerciseId)
        .order('created_at', { ascending: false }); // Fetch all sets for this exercise to check PR

      if (fetchPreviousError) {
        console.error("Error fetching previous sets for PR check:", fetchPreviousError);
      } else {
        const relevantPreviousSets = allPreviousSets || [];

        if (exercise.type === 'weight') {
          const currentVolume = (currentSet.weight_kg || 0) * (currentSet.reps || 0);
          // A new PR if current volume is strictly greater than all previous volumes for this exercise
          isPR = relevantPreviousSets.every(prevSet => {
            const prevVolume = (prevSet.weight_kg || 0) * (prevSet.reps || 0);
            return currentVolume > prevVolume;
          });
        } else if (exercise.type === 'timed') {
          const currentTime = currentSet.time_seconds || Infinity;
          // A new PR if current time is strictly less than all previous times for this exercise
          isPR = relevantPreviousSets.every(prevSet => {
            const prevTime = prevSet.time_seconds || Infinity;
            return currentTime < prevTime;
          });
        }
      }

      setExercisesWithSets(prev => {
        const newSets = [...prev[exerciseId]];
        newSets[setIndex] = { ...newSets[setIndex], isSaved: true, isPR: isPR };
        return { ...prev, [exerciseId]: newSets };
      });
      toast.success("Set saved successfully!");
    }
  };

  const handleFinishWorkout = async () => {
    if (!currentSessionId || !sessionStartTime) {
      toast.error("Workout session not properly started.");
      return;
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    let durationString = '';
    if (durationMinutes < 60) {
      durationString = `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      durationString = `${hours}h ${minutes}m`;
    }

    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({ duration_string: durationString })
      .eq('id', currentSessionId);

    if (updateError) {
      toast.error("Failed to save workout duration: " + updateError.message);
      console.error("Error saving duration:", updateError);
    } else {
      toast.success("Workout session finished and duration saved!");
      router.push(`/workout-summary/${currentSessionId}`); // Redirect to summary page
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout...</p>
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

  if (!workoutTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Workout template not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold">{workoutTemplate.template_name}</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </header>

      <section className="mb-8">
        {exercisesForTemplate.map((exercise) => (
          <Card key={exercise.id} className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">{exercise.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{exercise.main_muscle}</p>
              </div>
              <div className="flex space-x-2">
                <ExerciseHistoryDialog
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  exerciseType={exercise.type}
                  exerciseCategory={exercise.category}
                />
                <ExerciseInfoDialog exercise={exercise} />
                <ExerciseProgressionDialog
                  exerciseId={exercise.id}
                  exerciseName={exercise.name}
                  exerciseType={exercise.type}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Set</TableHead>
                    <TableHead>Hint</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Reps</TableHead>
                    {exercise.type === 'timed' && <TableHead>Time (s)</TableHead>}
                    {exercise.category === 'Unilateral' && (
                      <>
                        <TableHead>Reps (L)</TableHead>
                        <TableHead>Reps (R)</TableHead>
                      </>
                    )}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercisesWithSets[exercise.id]?.map((set, setIndex) => (
                    <TableRow key={setIndex}>
                      <TableCell>{setIndex + 1}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {exercise.type === 'weight' && set.lastWeight && set.lastReps && `Last: ${set.lastWeight}kg x ${set.lastReps} reps`}
                        {exercise.type === 'timed' && set.lastTimeSeconds && `Last: ${set.lastTimeSeconds}s`}
                        {!set.lastWeight && !set.lastReps && !set.lastTimeSeconds && "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={set.weight_kg ?? ''}
                          onChange={(e) => handleInputChange(exercise.id, setIndex, 'weight_kg', e.target.value)}
                          disabled={set.isSaved || exercise.type === 'timed'}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={set.reps ?? ''}
                          onChange={(e) => handleInputChange(exercise.id, setIndex, 'reps', e.target.value)}
                          disabled={set.isSaved || exercise.type === 'timed'}
                          className="w-20"
                        />
                      </TableCell>
                      {exercise.type === 'timed' && (
                        <TableCell>
                          <Input
                            type="number"
                            value={set.time_seconds ?? ''}
                            onChange={(e) => handleInputChange(exercise.id, setIndex, 'time_seconds', e.target.value)}
                            disabled={set.isSaved}
                            className="w-20"
                          />
                        </TableCell>
                      )}
                      {exercise.category === 'Unilateral' && (
                        <>
                          <TableCell>
                            <Input
                              type="number"
                              value={set.reps_l ?? ''}
                              onChange={(e) => handleInputChange(exercise.id, setIndex, 'reps_l', e.target.value)}
                              disabled={set.isSaved}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={set.reps_r ?? ''}
                              onChange={(e) => handleInputChange(exercise.id, setIndex, 'reps_r', e.target.value)}
                              disabled={set.isSaved}
                              className="w-20"
                            />
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {set.isSaved ? (
                          <div className="flex items-center text-green-500">
                            <CheckCircle2 className="h-5 w-5 mr-1" /> Saved
                            {set.isPR && <Trophy className="h-5 w-5 ml-2 text-yellow-500" />}
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => handleSaveSet(exercise.id, setIndex)}>Save</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button variant="outline" className="mt-4" onClick={() => handleAddSet(exercise.id)}>
                <Plus className="h-4 w-4 mr-2" /> Add Set
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex justify-center mt-8">
        <Button size="lg" onClick={handleFinishWorkout}>Finish Workout</Button>
      </div>

      <MadeWithDyad />
    </div>
  );
}