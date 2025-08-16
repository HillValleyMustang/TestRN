"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface FinishWorkoutButtonProps {
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  supabase: SupabaseClient;
}

export const FinishWorkoutButton = ({ currentSessionId, sessionStartTime, supabase }: FinishWorkoutButtonProps) => {
  const router = useRouter();

  const handleFinishWorkout = async () => {
    if (!currentSessionId || !sessionStartTime) {
      toast.error("Workout session not properly started.");
      return;
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - sessionStartTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    let durationString = '';
    if (durationMinutes < 60) {
      durationString = `${durationMinutes} minutes`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      durationString = `${hours}h ${minutes}m`;
    }

    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({ duration_string: durationString })
      .eq('id', currentSessionId);

    if (updateError) {
      toast.error("Failed to save workout duration: " + updateError.message);
      console.error("Error saving duration:", updateError);
    } else {
      toast.success("Workout session finished and duration saved!");
      router.push(`/workout-summary/${currentSessionId}`);
    }
  };

  return (
    <div className="flex justify-center mt-8">
      <Button size="lg" onClick={handleFinishWorkout}>Finish Workout</Button>
    </div>
  );
};