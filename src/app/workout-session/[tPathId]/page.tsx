"use client";

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { TPathHeader } from '@/components/workout-session/t-path-header';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { FinishWorkoutButton } from '@/components/workout-session/finish-workout-button';
import { useTPathSession } from '@/hooks/use-t-path-session';
import { SetLogState } from '@/types/supabase';

export default function WorkoutSessionPage({ params }: { params: { tPathId: string } }) {
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
      </div >
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <TPathHeader tPathName={tPath.template_name} />

      <section className="mb-8">
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
          />
        ))}
      </section>

      <FinishWorkoutButton
        currentSessionId={currentSessionId}
        sessionStartTime={sessionStartTime}
        supabase={supabase}
      />

      <MadeWithDyad />
    </div>
  );
}