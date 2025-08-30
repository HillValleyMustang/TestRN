"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AnalyzeGymDialog } from "@/components/manage-exercises/analyze-gym-dialog";
import { Tables } from "@/types/supabase";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AnalyzeGymButtonProps {
  showAnalyzeGymDialog: boolean;
  setShowAnalyzeGymDialog: (open: boolean) => void;
  onExerciseIdentified: (exerciseData: Partial<ExerciseDefinition>) => void;
}

export const AnalyzeGymButton = ({
  showAnalyzeGymDialog,
  setShowAnalyzeGymDialog,
  onExerciseIdentified,
}: AnalyzeGymButtonProps) => {
  return (
    <>
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setShowAnalyzeGymDialog(true)}
        className="flex-1"
      >
        <Sparkles className="h-4 w-4 mr-2" /> Analyse My Gym
      </Button>
      <AnalyzeGymDialog
        open={showAnalyzeGymDialog}
        onOpenChange={setShowAnalyzeGymDialog}
        onExerciseIdentified={onExerciseIdentified}
      />
    </>
  );
};