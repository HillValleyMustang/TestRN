"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { RefreshCcw, Sparkles } from "lucide-react";

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
  const [generatingAi, setGeneratingAi] = useState(false);

  const fetchAvailableExercises = async () => {
    if (!session || !open) return;

    setLoading(true);
    try {
      // Fetch all exercises (user-owned and global) that match criteria
      const { data: allMatchingExercises, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url') // Specify all columns required by ExerciseDefinition
        .or(`user_id.eq.${session.user.id},user_id.is.null`) // User's own or global
        .eq('main_muscle', currentExercise.main_muscle) // Suggest exercises for the same main muscle
        .eq('type', currentExercise.type) // Suggest exercises of the same type (weight, timed, cardio)
        .neq('id', currentExercise.id) // Exclude the current exercise
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      // Filter out global exercises if a user-owned copy already exists
      // This logic is now for display purposes in the dropdown, not for preventing adoption.
      const userOwnedExerciseLibraryIds = new Set(
        allMatchingExercises
          .filter(ex => ex.user_id === session.user.id && ex.library_id)
          .map(ex => ex.library_id)
      );

      const filteredExercises = (allMatchingExercises as ExerciseDefinition[]).filter(ex => { // Explicitly cast
        // If it's a global exercise and the user already has a custom version of it, don't show the global one in the dropdown.
        if (ex.user_id === null && ex.library_id && userOwnedExerciseLibraryIds.has(ex.library_id)) {
          return false;
        }
        return true;
      });

      setAvailableExercises(filteredExercises || []);
    } catch (err: any) {
      console.error("Failed to fetch available exercises for swap:", err);
      toast.info("Failed to load swap options.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAvailableExercises();
      setSelectedNewExerciseId(""); // Reset selection when opening
    }
  }, [open, session, supabase, currentExercise]);

  // Removed adoptExercise function as per new requirements

  const handleConfirmSwap = async () => {
    const newExercise = availableExercises.find(ex => ex.id === selectedNewExerciseId);
    if (!newExercise) {
      toast.info("Please select an exercise to swap with.");
      return;
    }

    try {
      // Directly use the newExercise, no adoption needed.
      onSwap(newExercise);
      onOpenChange(false);
      console.log(`Swapped with ${newExercise.name}`); // Replaced toast.success
    } catch (err: any) {
      console.error("Failed to swap exercise:", err);
      toast.info("Failed to swap exercise.");
    }
  };

  const handleGenerateAiSuggestion = async () => {
    if (!session) {
      toast.info("You must be logged in to generate AI suggestions.");
      return;
    }
    setGeneratingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-exercise-suggestion', {
        body: {
          main_muscle: currentExercise.main_muscle,
          type: currentExercise.type,
          category: currentExercise.category,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
      if (data.error) {
        throw new Error(data.error);
      }

      const newAiExercise = data.newExercise;
      if (newAiExercise) {
        // Add the newly generated exercise to the list of available exercises
        setAvailableExercises(prev => [...prev, newAiExercise]);
        console.log("AI generated a new exercise suggestion!"); // Replaced toast.success
      } else {
        toast.info("AI did not return a valid exercise.");
      }
    } catch (err: any) {
      console.error("Failed to generate AI suggestion:", err);
      toast.info("Failed to generate AI suggestion.");
    } finally {
      setGeneratingAi(false);
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
          ) : availableExercises.length === 0 && !generatingAi ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                No suitable alternative exercises found in your library or global defaults.
              </p>
              <Button onClick={handleGenerateAiSuggestion} disabled={generatingAi}>
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAi ? "Generating..." : "Generate AI Suggestion"}
              </Button>
            </div>
          ) : (
            <>
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
              <Button onClick={handleConfirmSwap} disabled={!selectedNewExerciseId || loading || generatingAi}>
                <RefreshCcw className="h-4 w-4 mr-2" /> Confirm Swap
              </Button>
              <Button 
                variant="outline" 
                onClick={handleGenerateAiSuggestion} 
                disabled={generatingAi}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generatingAi ? "Generating..." : "Generate More Suggestions"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};