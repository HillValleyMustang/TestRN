"use client";

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { useTPathSession } from '@/hooks/use-t-path-session';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { useState, useEffect } from 'react'; // Import useEffect
import { Button } from '@/components/ui/button';
import { Dumbbell, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { WorkoutSessionHeader } from '@/components/workout-session/workout-session-header';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { toast } from 'sonner';

interface WorkoutSessionPageProps {
  params: { tPathId: string };
}

export default function WorkoutSessionPage({ params }: WorkoutSessionPageProps) {
  const { tPathId } = params;

  const { session, supabase } = useSession();
  const router = useRouter();

  const {
    tPath,
    exercisesForTPath,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    setExercisesWithSets,
    refreshExercisesForTPath, // New function to refresh exercises
  } = useTPathSession({ tPathId: tPathId || '', session, supabase, router });

  // State to track completed exercises for progress bar
  const [completedExerciseCount, setCompletedExerciseCount] = useState(0);

  useEffect(() => {
    // Calculate completed exercises: an exercise is 'completed' if it has at least one saved set
    const count = exercisesForTPath.filter(exercise => 
      exercisesWithSets[exercise.id]?.some(set => set.isSaved)
    ).length;
    setCompletedExerciseCount(count);
  }, [exercisesForTPath, exercisesWithSets]);

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

  if (!tPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Transformation Path not found.</p>
      </div>
    );
  }

  const totalExercises = exercisesForTPath.length;

  const handleSubstituteExercise = (oldExerciseId: string, newExercise: WorkoutExercise) => {
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      // Remove old exercise's sets
      delete newExercisesWithSets[oldExerciseId];
      // Add new exercise with an initial empty set
      newExercisesWithSets[newExercise.id] = [{
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
      }];
      return newExercisesWithSets;
    });
    // Trigger a refresh of the exercises list to update the displayed exercise
    refreshExercisesForTPath(oldExerciseId, newExercise);
    toast.success(`Replaced with ${newExercise.name}`);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      delete newExercisesWithSets[exerciseId];
      return newExercisesWithSets;
    });
    // Trigger a refresh of the exercises list to remove the exercise
    refreshExercisesForTPath(exerciseId, null);
    toast.success("Exercise removed from this workout");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <WorkoutSessionHeader
        tPathName={tPath.template_name}
        currentExerciseCount={completedExerciseCount}
        totalExercises={totalExercises}
      />

      <main className="flex-1 p-4 sm:px-6 sm:py-4 overflow-y-auto">
        {totalExercises === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No exercises found for this workout.</h2>
            <p className="text-muted-foreground mb-4">
              Please add exercises to this workout to begin. You can add exercises to your workout within the{" "}
              <Link href="/manage-exercises" className="font-bold text-primary hover:underline">Exercises</Link> page and by clicking the <PlusCircle className="inline-block h-4 w-4" /> icon next to an exercise.
            </p>
            <Button onClick={() => router.push('/manage-exercises')}>Go to Manage Exercises</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {exercisesForTPath.map((exercise, index) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                exerciseNumber={index + 1} // Pass exercise number
                currentSessionId={currentSessionId}
                supabase={supabase}
                onUpdateGlobalSets={(exerciseId: string, newSets: SetLogState[]) => {
                  setExercisesWithSets(prev => ({
                    ...prev,
                    [exerciseId]: newSets,
                  }));
                }}
                initialSets={exercisesWithSets[exercise.id] || []}
                onSubstituteExercise={handleSubstituteExercise}
                onRemoveExercise={handleRemoveExercise}
                workoutTemplateName={tPath.template_name} // Pass the workout's template name
              />
            ))}
          </div>
        )}
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