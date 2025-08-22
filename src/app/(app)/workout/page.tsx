"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { SetLogState, WorkoutExercise, Tables } from '@/types/supabase';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dumbbell, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { WorkoutSessionHeader } from '@/components/workout-session/workout-session-header';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { toast } from 'sonner';
import React from 'react';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutIdFromParams = searchParams.get('workoutId');

  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");
  const [isWorkoutSelected, setIsWorkoutSelected] = useState(false);

  const {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    selectWorkout,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime,
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
  } = useWorkoutFlowManager({ initialWorkoutId: initialWorkoutIdFromParams, session, supabase, router });

  useEffect(() => {
    if (initialWorkoutIdFromParams && !activeWorkout && !loading && !error) {
      selectWorkout(initialWorkoutIdFromParams);
    }
  }, [initialWorkoutIdFromParams, activeWorkout, loading, error, selectWorkout]);

  useEffect(() => {
    setIsWorkoutSelected(!!activeWorkout && activeWorkout.id !== null);
  }, [activeWorkout]);

  const handleWorkoutSelect = useCallback(async (workoutId: string | null) => {
    await selectWorkout(workoutId);
  }, [selectWorkout]);

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allAvailableExercises.find((ex: ExerciseDefinition) => ex.id === selectedExerciseToAdd);
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

  const handleBackToSelection = () => {
    resetWorkoutSession();
  };

  const totalExercises = exercisesForSession.length;
  const completedExerciseCount = completedExercises.size;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive p-4 sm:p-8">
        <Dumbbell className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Workout</h2>
        <p className="text-lg text-center mb-4">{error}</p>
        <Button onClick={handleBackToSelection}>Back to Workout Selection</Button>
      </div>
    );
  }

  if (!isWorkoutSelected || !activeWorkout) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:px-4 sm:py-4 md:px-6 lg:px-8">
        <header className="mb-4">
          <h1 className="text-3xl font-bold">Start Your Workout</h1>
          <p className="text-muted-foreground">
            Choose an ad-hoc session or one of your personalised Transformation Paths.
          </p>
        </header>
        <WorkoutSelector onWorkoutSelect={handleWorkoutSelect} selectedWorkoutId={initialWorkoutIdFromParams} />
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <WorkoutSessionHeader
        tPathName={activeWorkout.template_name}
        currentExerciseCount={completedExerciseCount}
        totalExercises={totalExercises}
      />

      <main className="flex-1 p-4 sm:px-4 sm:py-4 overflow-y-auto">
        {activeWorkout.id === 'ad-hoc' && (
          <section className="mb-8 p-4 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold mb-4">Add Exercises</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an exercise" />
                </SelectTrigger>
                <SelectContent>
                  {allAvailableExercises.length === 0 ? (
                    <div className="p-2 text-muted-foreground">No exercises defined. Go to Dashboard &gt; Manage Exercises to add some!</div>
                  ) : (
                    allAvailableExercises
                      .filter((ex: ExerciseDefinition) => !exercisesForSession.some((sessionEx: WorkoutExercise) => sessionEx.id === ex.id))
                      .map((exercise: ExerciseDefinition) => ( // Explicitly type 'exercise'
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
              <Button variant="outline" onClick={handleBackToSelection} className="mt-4">Back to Workout Selection</Button>
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
                  onUpdateGlobalSets={updateExerciseSets}
                  initialSets={exercisesWithSets[exercise.id] || []}
                  onSubstituteExercise={substituteExercise}
                  onRemoveExercise={removeExerciseFromSession}
                  workoutTemplateName={activeWorkout.template_name}
                  onFirstSetSaved={updateSessionStartTime}
                  onExerciseCompleted={markExerciseAsCompleted}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {totalExercises > 0 && (
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