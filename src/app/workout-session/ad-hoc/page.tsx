"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TPathHeader } from '@/components/workout-session/t-path-header';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { FinishWorkoutButton } from '@/components/workout-session/finish-workout-button';
import { useAdHocWorkoutSession } from '@/hooks/use-ad-hoc-workout-session';
import { Tables, SetLogState } from '@/types/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function AdHocWorkoutSessionPage() {
  const { session, supabase } = useSession();
  const router = useRouter();

  const {
    allExercises,
    exercisesForSession,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    addExerciseToSession,
    removeExerciseFromSession,
    setExercisesWithSets,
  } = useAdHocWorkoutSession({ session, supabase, router });

  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

  const handleAddExercise = () => {
    if (selectedExerciseToAdd) {
      const exercise = allExercises.find((ex: ExerciseDefinition) => ex.id === selectedExerciseToAdd);
      if (exercise) {
        addExerciseToSession(exercise);
        setSelectedExerciseToAdd(""); // Reset select input
      } else {
        toast.error("Selected exercise not found.");
      }
    } else {
      toast.error("Please select an exercise to add.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Starting ad-hoc workout...</p>
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
      <TPathHeader tPathName="Ad Hoc Workout" />

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
                  .filter((ex: ExerciseDefinition) => !exercisesForSession.some((sessionEx: WorkoutExercise) => sessionEx.id === ex.id)) // Filter out already added exercises
                  .map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exercise.name} ({exercise.main_muscle})
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAddExercise} disabled={!selectedExerciseToAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Exercise
          </Button>
        </div>
      </section>

      <section className="mb-8">
        {exercisesForSession.length === 0 ? (
          <p className="text-muted-foreground text-center">Add exercises to start your workout!</p>
        ) : (
          exercisesForSession.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              currentSessionId={currentSessionId}
              supabase={supabase}
              onUpdateGlobalSets={(exerciseId: string, newSets: SetLogState[]) => {
                setExercisesWithSets((prev: Record<string, SetLogState[]>) => ({
                  ...prev,
                  [exerciseId]: newSets,
                }));
              }}
              initialSets={exercisesWithSets[exercise.id] || []}
            />
          ))
        )}
      </section>

      {exercisesForSession.length > 0 && (
        <FinishWorkoutButton
          currentSessionId={currentSessionId}
          sessionStartTime={sessionStartTime}
          supabase={supabase}
        />
      )}

      <MadeWithDyad />
    </div>
  );
}