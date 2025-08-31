"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Tables } from "@/types/supabase";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AddAsBonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToAddDetails: ExerciseDefinition | null;
  handleAddExerciseWithBonusStatus: (isBonus: boolean) => Promise<void>;
  isSaving: boolean;
}

export const AddAsBonusDialog = ({
  open,
  onOpenChange,
  exerciseToAddDetails,
  handleAddExerciseWithBonusStatus,
  isSaving,
}: AddAsBonusDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{exerciseToAddDetails?.name}" as?</DialogTitle>
          <DialogDescription>
            Choose whether to add this exercise as a core part of your workout or as an optional bonus.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button onClick={() => handleAddExerciseWithBonusStatus(false)} disabled={isSaving}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Add as Core Exercise
          </Button>
          <Button variant="outline" onClick={() => handleAddExerciseWithBonusStatus(true)} disabled={isSaving}>
            <Sparkles className="h-4 w-4 mr-2" /> Add as Bonus Exercise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};