"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, Dumbbell, Timer, ArrowUp } from "lucide-react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";

type ExerciseDefinition = Tables<'exercise_definitions'>;
type SetLog = Tables<'set_logs'>;

interface ExerciseProgressionDialogProps {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseDefinition['type'];
}

export const ExerciseProgressionDialog = ({ exerciseId, exerciseName, exerciseType }: ExerciseProgressionDialogProps) => {
  const { session, supabase } = useSession();
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProgressionSuggestion = async () => {
      if (!session || !exerciseId || !open) return;

      setLoading(true);
      setSuggestion(null);
      try {
        const { data: lastSet, error } = await supabase
          .from('set_logs')
          .select('weight_kg, reps, time_seconds')
          .eq('exercise_id', exerciseId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          throw new Error(error.message);
        }

        if (!lastSet) {
          setSuggestion("No previous sets found. Focus on mastering the form first!");
          return;
        }

        if (exerciseType === 'weight') {
          const { weight_kg, reps } = lastSet;
          if (weight_kg && reps) {
            if (reps >= 8) { // Simple rule: if 8+ reps achieved, suggest weight increase
              const newWeight = (weight_kg + 2.5).toFixed(1);
              setSuggestion(`Great work! Try increasing the weight to ${newWeight} kg for your next set.`);
            } else if (reps >= 5) { // If 5-7 reps, suggest increasing reps
              const newReps = reps + 1;
              setSuggestion(`Good effort! Try to hit ${newReps} reps with ${weight_kg} kg next time.`);
            } else {
              setSuggestion(`Consider maintaining ${weight_kg} kg and focusing on form, or slightly reducing weight to hit more reps.`);
            }
          } else {
            setSuggestion("No weight/reps recorded for the last set. Please log your sets accurately.");
          }
        } else if (exerciseType === 'timed') {
          const { time_seconds } = lastSet;
          if (time_seconds) {
            const newTime = time_seconds + 5;
            setSuggestion(`Nice! Try to hold for ${newTime} seconds next time.`);
          } else {
            setSuggestion("No time recorded for the last set. Please log your sets accurately.");
          }
        } else {
          setSuggestion("Progression suggestions are currently available for weight and timed exercises only.");
        }

      } catch (err: any) {
        console.error("Failed to fetch progression suggestion:", err);
        toast.error("Failed to load progression suggestion: " + err.message);
        setSuggestion("Failed to load suggestion. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchProgressionSuggestion();
    }
  }, [open, session, exerciseId, exerciseType, supabase]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Suggest Progression">
          <Lightbulb className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Progression Suggestion for {exerciseName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {loading ? (
            <p className="text-muted-foreground text-center">Generating suggestion...</p>
          ) : (
            <p className="text-base text-foreground text-center font-medium">
              {suggestion || "No suggestion available."}
            </p>
          )}
          <div className="flex justify-center mt-4">
            {exerciseType === 'weight' && <Dumbbell className="h-8 w-8 text-primary" />}
            {exerciseType === 'timed' && <Timer className="h-8 w-8 text-primary" />}
            {suggestion && !loading && <ArrowUp className="h-8 w-8 text-green-500 ml-2" />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};