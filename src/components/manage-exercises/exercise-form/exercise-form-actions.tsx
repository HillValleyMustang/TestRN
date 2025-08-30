"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, XCircle } from "lucide-react";
import { Tables } from "@/types/supabase";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseFormActionsProps {
  editingExercise: ExerciseDefinition | null;
  onCancelEdit: () => void;
  toggleExpand: () => void;
}

export const ExerciseFormActions = ({
  editingExercise,
  onCancelEdit,
  toggleExpand,
}: ExerciseFormActionsProps) => {
  return (
    <div className="flex gap-2 pt-2">
      <Button type="submit" className="flex-1">
        {editingExercise ? (
          editingExercise.user_id === null ? (
            <>
              <PlusCircle className="h-4 w-4 mr-2" /> Adopt & Edit
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" /> Update
            </>
          )
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" /> Add
          </>
        )}
      </Button>
      {editingExercise && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            onCancelEdit();
            toggleExpand();
          }}
        >
          <XCircle className="h-4 w-4 mr-2" /> Cancel
        </Button>
      )}
      {!editingExercise && (
        <Button 
          type="button" 
          variant="outline" 
          onClick={toggleExpand}
        >
          Close
        </Button>
      )}
    </div>
  );
};