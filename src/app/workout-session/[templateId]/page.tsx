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
import { Dumbbell, Info, Lightbulb, History, Plus, CheckCircle2, Trophy } from 'lucide-react';
import { Tables, TablesInsert } from '@/types/supabase';

type WorkoutTemplate = Tables<'workout_templates'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = TablesInsert<'set_logs'>; // Use TablesInsert for new logs

// Define a type for the joined result of workout_templates with exercise_definitions
type WorkoutTemplateWithExercise = WorkoutTemplate & {
  exercise_definitions: ExerciseDefinition | null;
};

interface SetLogState extends SetLog {
  isSaved: boolean;
  isPR: boolean;
}

export default function WorkoutSessionPage({ params }: { params: { templateId: string } }) {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { templateId } = params;

  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercisesForTemplate, setExercisesForTemplate] = useState<ExerciseDefinition[]>([]);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLogState[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchWorkoutData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch the workout template AND its associated exercise definition
        const { data: templateWithExercise, error: fetchError } = await supabase
          .from('workout_templates')
          .select('*, exercise_definitions(*)') // Select template data and joined exercise
          .eq('id', templateId)
          .eq('user_id', session.user.id)
          .single(); // Expecting a single template

        if (fetchError || !templateWithExercise) {
          throw new Error(fetchError?.message || "Workout template not found or no associated exercise.");
        }

        setWorkoutTemplate(templateWithExercise); // Set the base template data

        const fetchedExercises: ExerciseDefinition[] = [];
        if (templateWithExercise.exercise_definitions) {
          // If a template is linked to a single exercise, add it to the list
          fetchedExercises.push(templateWithExercise.exercise_definitions);
        }
        setExercisesForTemplate(fetchedExercises);

        // 2. Initialize sets for each exercise
        const initialSets: Record<string, SetLogState[]> = {};
        fetchedExercises.forEach(ex => {
          initialSets[ex.id] = [{ weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, isSaved: false, isPR: false }];
        });
        setExercisesWithSets(initialSets);

        // 3. Create a new workout session entry
        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: session.user.id,
            template_name: templateWithExercise.template_name, // Use the fetched template name
            session_date: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (sessionError || !sessionData) {
          throw new Error(sessionError?.message || "Failed to create workout session.");
        }
        setCurrentSessionId(sessionData.id);

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
    setExercisesWithSets(prev => ({
      ...prev,
      [exerciseId]: [...prev[exerciseId], { weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, isSaved: false, isPR: false }]
    }));
  };

  const handleInputChange = (exerciseId: string, setIndex: number, field: keyof SetLog, value: string) => {
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
    if (!currentSet.weight_kg && !currentSet.reps && !currentSet.time_seconds && !currentSet.reps_l && !currentSet.reps_r) {
      toast.error("Please enter at least one value (weight/reps/time) for the set.");
      return;
    }

    const newSetLog: SetLog = {
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
      // Simulate PR detection (very basic for now)
      const isPR = Boolean(currentSet.weight_kg && currentSet.reps && currentSet.weight_kg * currentSet.reps > 1000);

      setExercisesWithSets(prev => {
        const newSets = [...prev[exerciseId]];
        newSets[setIndex] = { ...newSets[setIndex], isSaved: true, isPR: isPR };
        return { ...prev, [exerciseId]: newSets };
      });
      toast.success("Set saved successfully!");
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
                <Button variant="outline" size="icon" title="History"><History className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" title="Info"><Info className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" title="Suggest Progression"><Lightbulb className="h-4 w-4" /></Button>
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
                        {/* Placeholder for hint */}
                        {setIndex === 0 ? "Last: 60kg x 8 reps" : "-"}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={set.weight_kg ?? ''}
                          onChange={(e) => handleInputChange(exercise.id, setIndex, 'weight_kg', e.target.value)}
                          disabled={set.isSaved}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={set.reps ?? ''}
                          onChange={(e) => handleInputChange(exercise.id, setIndex, 'reps', e.target.value)}
                          disabled={set.isSaved}
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

      <MadeWithDyad />
    </div>
  );
}