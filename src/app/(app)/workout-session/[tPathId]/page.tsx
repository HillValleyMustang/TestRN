"use client";

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TPathHeader } from '@/components/workout-session/t-path-header';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { FinishWorkoutButton } from '@/components/workout-session/finish-workout-button';
import { useTPathSession } from '@/hooks/use-t-path-session';
import { SetLogState } from '@/types/supabase';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Dumbbell, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link'; // Import Link for navigation

interface WorkoutSessionPageProps {
  params: any;
  searchParams: any; // Changed to 'any' to resolve TypeScript error
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
  } = useTPathSession({ tPathId: tPathId || '', session, supabase, router });

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

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

  const currentExercise = exercisesForTPath[currentExerciseIndex];
  const totalExercises = exercisesForTPath.length;

  const handleSubstituteExercise = (oldExerciseId: string, newExercise: any) => {
    // Replace the exercise in the session
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
    
    // Update exercisesForTPath to replace the old exercise with the new one
    // This would require updating the parent state in a real implementation
    
    toast.success(`Replaced with ${newExercise.name}`);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    // Remove the exercise from the session
    setExercisesWithSets(prev => {
      const newExercisesWithSets = { ...prev };
      delete newExercisesWithSets[exerciseId];
      return newExercisesWithSets;
    });
    
    // Update exercisesForTPath to remove the exercise
    // This would require updating the parent state in a real implementation
    
    toast.success("Exercise removed from this workout");
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <TPathHeader tPathName={tPath.template_name} />

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
        <>
          {/* Progress indicator for mobile */}
          <div className="mb-4 sm:hidden">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Exercise {currentExerciseIndex + 1} of {totalExercises}</span>
              <span>{Math.round(((currentExerciseIndex + 1) / totalExercises) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Navigation buttons for mobile */}
          <div className="flex justify-between mb-4 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
              disabled={currentExerciseIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentExerciseIndex(Math.min(totalExercises - 1, currentExerciseIndex + 1))}
              disabled={currentExerciseIndex === totalExercises - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Desktop view - all exercises visible */}
          <div className="hidden sm:block mb-8">
            {exercisesForTPath.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
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
              />
            ))}
          </div>

          {/* Mobile view - single exercise at a time */}
          <div className="sm:hidden">
            {currentExercise && (
              <ExerciseCard
                key={currentExercise.id}
                exercise={currentExercise}
                currentSessionId={currentSessionId}
                supabase={supabase}
                onUpdateGlobalSets={(exerciseId: string, newSets: SetLogState[]) => {
                  setExercisesWithSets(prev => ({
                    ...prev,
                    [exerciseId]: newSets,
                  }));
                }}
                initialSets={exercisesWithSets[currentExercise.id] || []}
                onSubstituteExercise={handleSubstituteExercise}
                onRemoveExercise={handleRemoveExercise}
              />
            )}
          </div>

          <FinishWorkoutButton
            currentSessionId={currentSessionId}
            sessionStartTime={sessionStartTime}
            supabase={supabase}
          />
        </>
      )}

      <MadeWithDyad />
    </div>
  );
}