"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { RefreshCcw } from "lucide-react";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentExercise: ExerciseDefinition;
  onSwap: (newExercise: ExerciseDefinition) => void;
}

export const ExerciseSwapDialog = ({ open, onOpenChange, currentExercise, onSwap }: ExerciseSwapDialogProps) => {
  const { session, supabase } = useSession();
  const [availableExercises, setAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [selectedNewExerciseId, setSelectedNewExerciseId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailableExercises = async () => {
      if (!session || !open) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('exercise_definitions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('main_muscle', currentExercise.main_muscle) // Suggest exercises for the same main muscle
          .eq('type', currentExercise.type) // Suggest exercises of the same type (weight, timed, cardio)
          .neq('id', currentExercise.id) // Exclude the current exercise
          .order('name', { ascending: true });

        if (error) {
          throw new Error(error.message);
        }
        setAvailableExercises(data || []);
      } catch (err: any) {
        console.error("Failed to fetch available exercises for swap:", err);
        toast.error("Failed to load swap options: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchAvailableExercises();
      setSelectedNewExerciseId(""); // Reset selection when opening
    }
  }, [open, session, supabase, currentExercise]);

  const handleConfirmSwap = () => {
    const newExercise = availableExercises.find(ex => ex.id === selectedNewExerciseId);
    if (newExercise) {
      onSwap(newExercise);
      onOpenChange(false);
    } else {
      toast.error("Please select an exercise to swap with.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Swap Exercise: {currentExercise.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            Select an alternative exercise for the same muscle group and type.
          </p>
          {loading ? (
            <p className="text-muted-foreground text-center">Loading exercises...</p>
          ) : availableExercises.length === 0 ? (
            <p className="text-muted-foreground text-center">No suitable alternative exercises found.</p>
          ) : (
            <Select onValueChange={setSelectedNewExerciseId} value={selectedNewExerciseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a new exercise" />
              </SelectTrigger>
              <SelectContent>
                {availableExercises.map(ex => (
                  <SelectItem key={ex.id} value={ex.id}>
                    {ex.name} ({ex.main_muscle})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleConfirmSwap} disabled={!selectedNewExerciseId || loading}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Confirm Swap
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};