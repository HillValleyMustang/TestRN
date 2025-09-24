"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, XCircle } from "lucide-react";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { useSession } from "@/components/session-context-provider"; // Import useSession

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseFormActionsProps {
  editingExercise: FetchedExerciseDefinition | null; // Changed type to FetchedExerciseDefinition
  onCancelEdit: () => void;
  toggleExpand: () => void; // This prop is now used to close the dialog if not in dialog mode
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // NEW
}

export const ExerciseFormActions = ({
  editingExercise,
  onCancelEdit,
  toggleExpand,
  setTempStatusMessage, // NEW
}: ExerciseFormActionsProps) => {
  const { session } = useSession();
  // Determine if we are editing an existing user-owned exercise (not a global one being "copied")
  const isUserOwnedEditing = editingExercise && editingExercise.user_id === session?.user.id && editingExercise.library_id === null;

  return (
    <div className="flex gap-2 pt-2">
      <Button type="submit" className="flex-1">
        {isUserOwnedEditing ? (
          <>
            <Edit className="h-4 w-4 mr-2" /> Update
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" /> Add
          </>
        )}
      </Button>
      {/* The cancel button now always calls onCancelEdit, which will close the dialog */}
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancelEdit}
      >
        <XCircle className="h-4 w-4 mr-2" /> Cancel
      </Button>
    </div>
  );
};