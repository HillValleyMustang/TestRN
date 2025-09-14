"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, PlusCircle, Edit } from "lucide-react"; // Added Edit icon
import { Tables } from "@/types/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingOverlay } from "../loading-overlay";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface SaveAiExercisePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Partial<ExerciseDefinition> | null;
  onSaveToMyExercises: (exercise: Partial<ExerciseDefinition>) => Promise<void>;
  onAddOnlyToCurrentWorkout?: (exercise: Partial<ExerciseDefinition>) => Promise<void>; // Made optional
  isSaving: boolean;
  duplicateStatus: 'none' | 'global' | 'my-exercises'; // Changed from isDuplicate: boolean
  context: 'manage-exercises' | 'workout-flow'; // New prop to differentiate context
  onEditExercise?: (exercise: Partial<ExerciseDefinition>) => void; // New prop for editing identified exercise
}

export const SaveAiExercisePrompt = ({
  open,
  onOpenChange,
  exercise,
  onSaveToMyExercises,
  onAddOnlyToCurrentWorkout,
  isSaving,
  duplicateStatus, // Destructure new prop
  context, // Destructure new prop
  onEditExercise, // Destructure new prop
}: SaveAiExercisePromptProps) => {
  if (!exercise) return null;

  const showAddOnlyToWorkoutButton = typeof onAddOnlyToCurrentWorkout === 'function';

  const renderDescription = () => {
    if (context === 'manage-exercises') {
      if (duplicateStatus === 'my-exercises') {
        return (
          <>AI has identified the exercise and it looks like you already have this in "My Exercises". Exercise name - "<span className="font-semibold">{exercise.name}</span>". Select Edit to change the exercise details or click Close to go back.</>
        );
      } else if (duplicateStatus === 'global') {
        return (
          <>AI has identified the exercise and it looks like this already exists in the "Global Library". Exercise name - "<span className="font-semibold">{exercise.name}</span>". You can add it to "My Exercises" to customize it.</>
        );
      }
      return <>AI has identified the exercise. Save it to "My Exercises" for future use.</>;
    } else { // context === 'workout-flow'
      if (duplicateStatus === 'my-exercises') {
        return <>AI has identified the exercise and it looks like you already have this in "My Exercises". You can add it to your current ad-hoc workout.</>;
      } else if (duplicateStatus === 'global') {
        return <>AI has identified the exercise and it looks like this already exists in the "Global Library". You can add it to your current ad-hoc workout, and optionally save it to "My Exercises" to customize it.</>;
      }
      return <>The AI has identified an exercise. You can add it to your current ad-hoc workout, and optionally save it to "My Exercises" for future use.</>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] grid grid-rows-[auto_1fr_auto] p-4">
          <DialogHeader className="row-start-1 pb-4">
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" /> AI Identified Exercise
            </DialogTitle>
            <DialogDescription>
              {renderDescription()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="row-start-2 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Name:</h4>
                <p className="text-base font-medium">{exercise.name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Main Muscle:</h4>
                <p className="text-sm text-muted-foreground">{exercise.main_muscle || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Type:</h4>
                <p className="text-sm text-muted-foreground">{exercise.type || 'N/A'}</p>
              </div>
              {exercise.category && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Category:</h4>
                  <p className="text-sm text-muted-foreground">{exercise.category}</p>
                </div>
              )}
              {exercise.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Description:</h4>
                  <p className="text-sm text-muted-foreground">{exercise.description}</p>
                </div>
              )}
              {exercise.pro_tip && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Pro Tip:</h4>
                    <p className="text-sm text-muted-foreground">{exercise.pro_tip}</p>
                  </div>
                )}
                {exercise.video_url && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Video URL:</h4>
                    <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline block break-all">
                      {exercise.video_url}
                    </a>
                  </div>
                )}
            </div>
          </ScrollArea>
          <div className="row-start-3 flex flex-col gap-2 pt-4 border-t">
            {context === 'manage-exercises' ? (
              duplicateStatus === 'my-exercises' ? (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                    Close
                  </Button>
                  {onEditExercise && (
                    <Button onClick={() => onEditExercise(exercise)} disabled={isSaving}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Exercise
                    </Button>
                  )}
                </>
              ) : ( // duplicateStatus === 'none' or 'global' in manage-exercises context
                <Button
                  onClick={() => onSaveToMyExercises(exercise)}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Add and Save to My Exercises"}
                </Button>
              )
            ) : ( // context === 'workout-flow'
              <>
                {/* Primary action: Add to Current Workout */}
                {showAddOnlyToWorkoutButton && (
                  <Button variant="default" onClick={() => onAddOnlyToCurrentWorkout!(exercise)} disabled={isSaving}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add to Current Workout
                  </Button>
                )}
                {/* Secondary action: Save to My Exercises (only if not a duplicate) */}
                {duplicateStatus === 'none' && (
                  <Button
                    variant="outline"
                    onClick={() => onSaveToMyExercises(exercise)}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Save to My Exercises"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <LoadingOverlay
        isOpen={isSaving}
        title="Saving Exercise"
        description="Please wait while the exercise is added to your library."
      />
    </>
  );
};