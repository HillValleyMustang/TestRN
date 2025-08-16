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
import { Tables } from '@/types/supabase';

type WorkoutTemplate = Tables<'workout_templates'> & {
  exercise_definitions: Tables<'exercise_definitions'> | null;
};

interface SetLog {
  weight_kg: number | null;
  reps: number | null;
  reps_l: number | null;
  reps_r: number | null;
  time_seconds: number | null;
  isSaved: boolean;
  isPR: boolean;
}

export default function WorkoutSessionPage({ params }: { params: { templateId: string } }) {
  const { session, supabase } = useSession();
  const router = useRouter();
  const { templateId } = params;

  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercisesWithSets, setExercisesWithSets] = useState<Record<string, SetLog[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    const fetchWorkoutData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Mock data for now. In a real app, you'd fetch from Supabase.
        // For templateId "up-next-workout-id"
        if (templateId === "up-next-workout-id") {
          const mockTemplate: WorkoutTemplate = {
            id: "up-next-workout-id",
            user_id: session.user.id,
            template_name: "Full Body Blast",
            is_bonus: false,
            exercise_id: null,
            created_at: new Date().toISOString(),
            exercise_definitions: null, // This will be populated by individual exercises
          };

          const mockExercises: Tables<'exercise_definitions'>[] = [
            { id: "exercise-1", user_id: session.user.id, name: "Barbell Squat", main_muscle: "Quads, Glutes", description: "Compound leg exercise.", pro_tip: "Keep chest up.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
            { id: "exercise-2", user_id: session.user.id, name: "Bench Press", main_muscle: "Chest, Triceps", description: "Compound upper body exercise.", pro_tip: "Retract shoulder blades.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
            { id: "exercise-3", user_id: session.user.id, name: "Deadlift", main_muscle: "Hamstrings, Glutes, Back", description: "Full body strength exercise.", pro_tip: "Maintain a neutral spine.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
          ];

          setWorkoutTemplate(mockTemplate);
          const initialSets: Record<string, SetLog[]> = {};
          mockExercises.forEach(ex => {
            initialSets[ex.id] = [{ weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, isSaved: false, isPR: false }];
          });
          setExercisesWithSets(initialSets);

        } else {
          // For other mock templates, you can add more specific mock data or a generic one
          const mockTemplate: WorkoutTemplate = {
            id: templateId,
            user_id: session.user.id,
            template_name: `Custom Workout ${templateId.split('-')[1]}`,
            is_bonus: false,
            exercise_id: null,
            created_at: new Date().toISOString(),
            exercise_definitions: null,
          };
          const mockExercises: Tables<'exercise_definitions'>[] = [
            { id: `exercise-${templateId}-a`, user_id: session.user.id, name: "Overhead Press", main_muscle: "Shoulders", description: "Press weight overhead.", pro_tip: "Engage core.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
            { id: `exercise-${templateId}-b`, user_id: session.user.id, name: "Barbell Row", main_muscle: "Back", description: "Pull weight to torso.", pro_tip: "Squeeze shoulder blades.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
          ];
          setWorkoutTemplate(mockTemplate);
          const initialSets: Record<string, SetLog[]> = {};
          mockExercises.forEach(ex => {
            initialSets[ex.id] = [{ weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, isSaved: false, isPR: false }];
          });
          setExercisesWithSets(initialSets);
        }

      } catch (err) {
        console.error("Failed to fetch workout data:", err);
        setError("Failed to load workout. Please try again.");
        toast.error("Failed to load workout.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [session, router, templateId]);

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
        [field]: parseFloat(value) || null // Convert to number, or null if empty/invalid
      };
      return { ...prev, [exerciseId]: newSets };
    });
  };

  const handleSaveSet = async (exerciseId: string, setIndex: number) => {
    const currentSet = exercisesWithSets[exerciseId][setIndex];
    if (!currentSet.weight_kg && !currentSet.reps && !currentSet.time_seconds) {
      toast.error("Please enter weight/reps or time for the set.");
      return;
    }

    // Mock saving to Supabase
    toast.success(`Set saved for ${exerciseId}!`);

    // Simulate PR detection (very basic for now)
    const isPR = Boolean(currentSet.weight_kg && currentSet.reps && currentSet.weight_kg * currentSet.reps > 1000); // Fixed: Explicitly cast to boolean

    setExercisesWithSets(prev => {
      const newSets = [...prev[exerciseId]];
      newSets[setIndex] = { ...newSets[setIndex], isSaved: true, isPR: isPR };
      return { ...prev, [exerciseId]: newSets };
    });
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

  // Mock exercises for the template
  const exercisesForTemplate: Tables<'exercise_definitions'>[] = [];
  if (templateId === "up-next-workout-id") {
    exercisesForTemplate.push(
      { id: "exercise-1", user_id: session?.user.id || "", name: "Barbell Squat", main_muscle: "Quads, Glutes", description: "Compound leg exercise.", pro_tip: "Keep chest up.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
      { id: "exercise-2", user_id: session?.user.id || "", name: "Bench Press", main_muscle: "Chest, Triceps", description: "Compound upper body exercise.", pro_tip: "Retract shoulder blades.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
      { id: "exercise-3", user_id: session?.user.id || "", name: "Deadlift", main_muscle: "Hamstrings, Glutes, Back", description: "Full body strength exercise.", pro_tip: "Maintain a neutral spine.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
    );
  } else {
    exercisesForTemplate.push(
      { id: `exercise-${templateId}-a`, user_id: session?.user.id || "", name: "Overhead Press", main_muscle: "Shoulders", description: "Press weight overhead.", pro_tip: "Engage core.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
      { id: `exercise-${templateId}-b`, user_id: session?.user.id || "", name: "Barbell Row", main_muscle: "Back", description: "Pull weight to torso.", pro_tip: "Squeeze shoulder blades.", video_url: null, type: "weight", category: null, created_at: new Date().toISOString() },
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
                            {set.isPR && <Trophy className="h-5 w-5 ml-2 text-yellow-500" />} {/* Fixed: Removed title prop */}
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