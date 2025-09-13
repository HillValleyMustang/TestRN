"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExerciseForm } from "@/components/manage-exercises/exercise-form";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition

// Removed local ExerciseDefinition definition

interface EditExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: FetchedExerciseDefinition | null;
  onSaveSuccess: () => void;
}

export const EditExerciseDialog = ({
  open,
  onOpenChange,
  exercise,
  onSaveSuccess,
}: EditExerciseDialogProps) => {
  const handleCancelEdit = () => {
    onOpenChange(false); // Close the dialog
  };

  const handleSaveSuccessAndClose = () => {
    onSaveSuccess(); // Trigger parent refresh
    onOpenChange(false); // Close the dialog
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            {exercise ? `Edit "${exercise.name}"` : "Add New Exercise"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-6">
          <ExerciseForm
            editingExercise={exercise}
            onCancelEdit={handleCancelEdit}
            onSaveSuccess={handleSaveSuccessAndClose}
            // Removed isExpandedInDialog prop
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};