"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "@/components/session-context-provider";
import { Tables } from '@/types/supabase';
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { ExerciseSubstitutionDialog } from "./exercise-substitution-dialog";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface CantDoToggleProps {
  exercise: ExerciseDefinition;
  onRemove: () => void;
  onSubstitute: (newExercise: ExerciseDefinition) => void;
}

export const CantDoToggle = ({ exercise, onRemove, onSubstitute }: CantDoToggleProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [showSubstitutionDialog, setShowSubstitutionDialog] = useState(false);

  const handleCantDo = () => {
    setShowDialog(true);
  };

  const handleSubstitute = () => {
    setShowDialog(false);
    setShowSubstitutionDialog(true);
  };

  const handleRemove = () => {
    setShowDialog(false);
    onRemove();
    toast.success(`Removed ${exercise.name} from this workout`);
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleCantDo}
        className="flex items-center"
      >
        <Ban className="h-4 w-4 mr-2" />
        Can't Do
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Can't Do This Exercise?</DialogTitle>
            <DialogDescription>
              What would you like to do with <span className="font-semibold">{exercise.name}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You've indicated you can't perform this exercise. You can either substitute it 
              with a similar exercise or remove it from this workout session.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSubstitute}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Substitute
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExerciseSubstitutionDialog
        open={showSubstitutionDialog}
        onOpenChange={setShowSubstitutionDialog}
        currentExercise={exercise}
        onSubstitute={onSubstitute}
      />
    </>
  );
};