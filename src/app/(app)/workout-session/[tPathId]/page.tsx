"use client";

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { useTPathSession } from '@/hooks/use-t-path-session';
import { SetLogState, WorkoutExercise } from '@/types/supabase';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dumbbell, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { WorkoutSessionHeader } from '@/components/workout-session/workout-session-header';
import { WorkoutSessionFooter } from '@/components/workout-session/workout-session-footer';
import { toast } from 'sonner';
import React from 'react';

// Define a simple interface for the expected params structure
interface PageParams {
  tPathId: string;
}

export default function WorkoutSessionPage({ params }: { params: any }) {
  const [resolvedTPathId, setResolvedTPathId] = useState<string | null>(null);
  const [isParamsResolved, setIsParamsResolved] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then(p => {
      setResolvedTPathId(p.tPathId);
      setIsParamsResolved(true);
    });
  }, [params]);

  const { session, supabase } = useSession();
  const router = useRouter();

  // Call useTPathSession unconditionally
  const {
    tPath,
    exercisesForTPath,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    setExercisesWithSets,
    refreshExercisesForTPath,
  } = useTPathSession({ tPathId: resolvedTPathId || '', session, supabase, router }); // Pass resolvedTPathId or empty string

  const [completedExerciseCount, setCompletedExerciseCount] = useState(0);

  useEffect(() => {
    // Only update completed count if exercisesForTPath is not empty (i.e., after data is loaded)
    if (exercisesForTPath.length > 0) {
      const count = exercisesForTPath.filter(exercise => 
        exercisesWithSets[exercise.id]?.some(set => set.isSaved)
      ).length;
      setCompletedExerciseCount(count);
    }
  }, [exercisesForTPath, exercisesWithSets]);

  // Show loading state if params are not resolved OR if the hook is still loading
  if (!isParamsResolved || loading) {
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
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  if (!tPath) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 sm:p-8">
        <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Transformation Path Not Found</h2>
        <p className="text-muted-foreground mb-4 text-center">
          The workout you are trying to access could not be found or is not accessible.
          This might happen if the T-Path was deleted or if there's a data issue.
        </p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const totalExercises = exercisesForTPath.length;

  const handleSubstituteExercise = (oldExerciseId: string, newExercise: WorkoutExercise) => {
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      delete newExercisesWithSets[oldExerciseId];
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
    refreshExercisesForTPath(oldExerciseId, newExercise);
    toast.success(`Replaced with ${newExercise.name}`);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      delete newExercisesWithSets[exerciseId];
      return newExercisesWithSets;
    });
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
                exerciseNumber={index + 1}
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
                workoutTemplateName={tPath.template_name}
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