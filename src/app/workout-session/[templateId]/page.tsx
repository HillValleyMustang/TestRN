"use client";

import { useRouter } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { WorkoutHeader } from '@/components/workout-session/workout-header';
import { ExerciseCard } from '@/components/workout-session/exercise-card';
import { FinishWorkoutButton } from '@/components/workout-session/finish-workout-button';
import { useWorkoutSession } from '@/hooks/use-workout-session';
import { SetLogState } from '@/types/supabase'; // Import SetLogState for typing from consolidated types

export default function WorkoutSessionPage({ params }: { params: { templateId: string } }) {
  const { templateId } = params;

  const { session, supabase } = useSession();
  const router = useRouter();

  const {
    workoutTemplate,
    exercisesForTemplate,
    exercisesWithSets,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    setExercisesWithSets, // This setter is passed down to ExerciseCard
  } = useWorkoutSession({ templateId: templateId || '', session, supabase, router }); // Added || '' for safety, though templateId should be present

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
      </div >
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <WorkoutHeader templateName={workoutTemplate.template_name} />

      <section className="mb-8">
        {exercisesForTemplate.map((exercise) => (
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