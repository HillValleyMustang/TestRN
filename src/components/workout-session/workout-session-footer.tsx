"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface WorkoutSessionFooterProps {
  currentSessionId: string | null;
  sessionStartTime: Date | null; // Now dynamically updated
  supabase: SupabaseClient;
}

export const WorkoutSessionFooter = ({ currentSessionId, sessionStartTime, supabase }: WorkoutSessionFooterProps) => {
  const router = useRouter();

  const handleFinishWorkout = async () => {
    if (!currentSessionId || !sessionStartTime) {
      toast.error("Workout session not properly started or no sets logged yet.");
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
    <footer className="sticky bottom-0 z-50 w-full bg-background/95 backdrop-blur-md border-t p-4 sm:px-6 sm:py-4"> {/* Increased z-index */}
      <Button size="lg" onClick={handleFinishWorkout} className="w-full">
        Finish Workout
      </Button>
    </footer>
  );
};