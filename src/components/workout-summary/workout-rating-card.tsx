"use client";

import React, { useState } from "react";
import { Tables } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";

type WorkoutSession = Tables<'workout_sessions'>;

interface WorkoutRatingCardProps {
  workoutSession: WorkoutSession;
  onRatingChange: (rating: number) => void;
  currentRating: number | null;
  isRatingSaved: boolean;
}

export const WorkoutRatingCard = ({ workoutSession, onRatingChange, currentRating, isRatingSaved }: WorkoutRatingCardProps) => {
  const { session, supabase } = useSession();

  const handleRatingClick = async (rating: number) => {
    if (!session || !workoutSession) return;

    onRatingChange(rating);

    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({ rating: rating })
      .eq('id', workoutSession.id)
      .eq('user_id', session.user.id);

    if (updateError) {
      toast.error("Failed to save rating: " + updateError.message);
      console.error("Error saving rating:", updateError);
    } else {
      toast.success("Workout rated successfully!");
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Rate Your Workout</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-8 w-8 cursor-pointer ${
                (currentRating && star <= currentRating) ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
              }`}
              onClick={() => handleRatingClick(star)}
            />
          ))}
          {isRatingSaved && <span className="ml-2 text-sm text-green-500">Saved!</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          How would you rate this workout session? (1-5 stars)
        </p>
      </CardContent>
    </Card>
  );
};