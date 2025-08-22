"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TPathHeader } from '@/components/workout-session/t-path-header';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { useAdHocWorkoutSession } from '@/hooks/use-ad-hoc-workout-session';
import { Tables, SetLogState, WorkoutExercise } from '@/types/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { WorkoutSessionHeader } from '@/components/workout-session/workout-session-header'; // Import WorkoutSessionHeader

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
    updateSessionStartTime, // New
    markExerciseAsCompleted, // New
    completedExercises, // New
  } = useAdHocWorkoutSession({ session, supabase, router });

  const [selectedExerciseToAdd, setSelectedExerciseToAdd] = useState<string>("");

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
      newExercisesWithSets[newExercise.id] = Array.from({ length: 3 }).map(() => ({ // Initialize with 3 sets
        id: null,
        created_at: null,
        session_id: currentSessionId,
        exercise_id: newExercise.id,
        weight_kg: null,
        reps: null,
        reps_l: null,
        reps_r: null,
        time_seconds: null,
        is_pb: false,
        isSaved: false,
        isPR: false,
        lastWeight: null,
        lastReps: null,
        lastTimeSeconds: null,
      }));
      return newExercisesWithSets;
    });
    // Update exercisesForSession to reflect the substitution
    setExercisesForSession(prev => prev.map(ex => ex.id === oldExerciseId ? newExercise : ex));
    toast.success(`Replaced with ${newExercise.name}`);
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

  const totalExercises = exercisesForSession.length;
  const currentCompletedCount = completedExercises.size;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <WorkoutSessionHeader
        tPathName="Ad Hoc Workout"
        currentExerciseCount={currentCompletedCount}
        totalExercises={totalExercises}
      />

      <main className="flex-1 p-4 sm:px-6 sm:py-4 overflow-y-auto">
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
              <Plus className="h-4 w-4 mr-2" /> Add Exercise
            </Button>
          </div>
        </section>

        <section className="mb-8">
          {exercisesForSession.length === 0 ? (
            <p className="text-muted-foreground text-center">Add exercises to start your workout!</p>
          ) : (
            exercisesForSession.map((exercise, index) => (
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
                workoutTemplateName="Ad Hoc Workout"
                onRemoveExercise={removeExerciseFromSession}
                onSubstituteExercise={handleSubstituteExercise}
                onFirstSetSaved={updateSessionStartTime}
                onExerciseCompleted={markExerciseAsCompleted}
              />
            ))
          )}
        </section>
      </main>

      {exercisesForSession.length > 0 && (
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