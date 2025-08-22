"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { WorkoutSessionHeader } from '@/components/workout-session/workout-session-header';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Dumbbell, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedWorkoutName, setSelectedWorkoutName] = useState<string | null>(null);
  const [isAdHocWorkout, setIsAdHocWorkout] = useState(false);

  const {
    allExercises,
    exercisesForSession,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    startNewSession,
    addExerciseToSession,
    removeExerciseFromSession,
    setExercisesWithSets,
    updateSessionStartTime,
    markExerciseAsCompleted,
    completedExercises,
    setExercisesForSession,
  } = useWorkoutFlowManager({ session, supabase, router });

  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  const handleWorkoutSelect = useCallback(async (workoutId: string, workoutName: string, isAdHoc: boolean) => {
    setSelectedWorkoutId(workoutId);
    setSelectedWorkoutName(workoutName);
    setIsAdHocWorkout(isAdHoc);
    await startNewSession(workoutName, isAdHoc ? null : workoutId); // Pass tPathId if not ad-hoc
  }, [startNewSession]);

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allExercises.find((ex: ExerciseDefinition) => ex.id === selectedExerciseToAdd);
      if (exercise) {
        addExerciseToSession(exercise);
        setSelectedExerciseToAdd("");
      } else {
        toast.error("Selected exercise not found.");
      }
    } else {
      toast.error("Please select an exercise to add.");
    }
  };

  const handleSubstituteExercise = (oldExerciseId: string, newExercise: WorkoutExercise) => {
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      delete newExercisesWithSets[oldExerciseId];
      newExercisesWithSets[newExercise.id] = Array.from({ length: 3 }).map(() => ({
        id: null, created_at: null, session_id: currentSessionId, exercise_id: newExercise.id,
        weight_kg: null, reps: null, reps_l: null, reps_r: null, time_seconds: null, is_pb: false,
        isSaved: false, isPR: false, lastWeight: null, lastReps: null, lastTimeSeconds: null,
      }));
      return newExercisesWithSets;
    });
    setExercisesForSession((prev: WorkoutExercise[]) => prev.map((ex: WorkoutExercise) => ex.id === oldExerciseId ? newExercise : ex));
    toast.success(`Replaced with ${newExercise.name}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive p-4 sm:p-8">
        <Dumbbell className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Workout</h2>
        <p className="text-lg text-center mb-4">{error}</p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const totalExercises = exercisesForSession.length;
  const currentCompletedCount = completedExercises.size;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <WorkoutSessionHeader
        tPathName={selectedWorkoutName || "Select a Workout"}
        currentExerciseCount={currentCompletedCount}
        totalExercises={totalExercises}
      />

      <main className="flex-1 p-4 sm:px-6 sm:py-4 overflow-y-auto">
        <WorkoutSelector onWorkoutSelect={handleWorkoutSelect} selectedWorkoutId={selectedWorkoutId} />

        {selectedWorkoutId && (
          <>
            {isAdHocWorkout && (
              <section className="mb-8 p-4 border rounded-lg bg-card">
                <h2 className="text-xl font-semibold mb-4">Add Exercises</h2>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select an exercise" />
                    </SelectTrigger>
                    <SelectContent>
                      {allExercises.length === 0 ? (
                        <div className="p-2 text-muted-foreground">No exercises defined. Go to Dashboard &gt; Manage Exercises to add some!</div>
                      ) : (
                        allExercises
                          .filter((ex: ExerciseDefinition) => !exercisesForSession.some((sessionEx: WorkoutExercise) => sessionEx.id === ex.id))
                          .map((exercise) => (
                            <SelectItem key={exercise.id} value={exercise.id}>
                              {exercise.name} ({exercise.main_muscle})
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Exercise
                  </Button>
                </div>
              </section>
            )}

            <section className="mb-8">
              {exercisesForSession.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-2xl font-bold mb-2">No exercises found for this workout.</h2>
                  <p className="text-muted-foreground mb-4 text-center">
                    Please add exercises to this workout to begin. You can add exercises to your workout within the{" "}
                    <Link href="/manage-exercises" className="font-bold text-primary hover:underline">Exercises</Link> page and by clicking the <PlusCircle className="inline-block h-4 w-4" /> icon next to an exercise.
                  </p>
                  <Button onClick={() => router.push('/manage-exercises')}>Go to Manage Exercises</Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {exercisesForSession.map((exercise, index) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      exerciseNumber={index + 1}
                      currentSessionId={currentSessionId}
                      supabase={supabase}
                      onUpdateGlobalSets={(exerciseId: string, newSets: SetLogState[]) => {
                        setExercisesWithSets((prev: Record<string, SetLogState[]>) => ({
                          ...prev,
                          [exerciseId]: newSets,
                        }));
                      }}
                      initialSets={exercisesWithSets[exercise.id] || []}
                      workoutTemplateName={selectedWorkoutName || "Ad Hoc Workout"}
                      onRemoveExercise={removeExerciseFromSession}
                      onSubstituteExercise={handleSubstituteExercise}
                      onFirstSetSaved={updateSessionStartTime}
                      onExerciseCompleted={markExerciseAsCompleted}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {selectedWorkoutId && exercisesForSession.length > 0 && (
        <WorkoutSessionFooter
          currentSessionId={currentSessionId}
          sessionStartTime={sessionStartTime}
          supabase={supabase}
        />
      )}

      <MadeWithDyad />
    </div>
  );
}