"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useSession } from "@/components/session-context-provider";
import { Tables, WorkoutExercise } from '@/types/supabase'; // Import WorkoutExercise
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { ExerciseSubstitutionDialog } from "./exercise-substitution-dialog";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface CantDoToggleProps {
  open: boolean; // Controlled prop
  onOpenChange: (open: boolean) => void; // Controlled prop
  exercise: ExerciseDefinition;
  onRemove: () => void;
  onSubstitute: (newExercise: ExerciseDefinition) => void;
}

export const CantDoToggle = ({ open, onOpenChange, exercise, onRemove, onSubstitute }: CantDoToggleProps) => {
  const [showSubstitutionDialog, setShowSubstitutionDialog] = React.useState(false);

  const handleSubstitute = () => {
    onOpenChange(false); // Close current dialog
    setShowSubstitutionDialog(true); // Open substitution dialog
  };

  const handleRemove = () => {
    onOpenChange(false); // Close current dialog
    onRemove();
    toast.success(`Removed ${exercise.name} from this workout`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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