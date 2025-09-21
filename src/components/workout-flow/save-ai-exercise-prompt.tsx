"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, PlusCircle, Edit } from "lucide-react"; // Added Edit icon
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingOverlay } from "../loading-overlay";
import { useGlobalStatus } from '@/contexts'; // NEW: Import useGlobalStatus

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface SaveAiExercisePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Partial<FetchedExerciseDefinition> | null; // Use FetchedExerciseDefinition
  onSaveToMyExercises: (exercise: Partial<FetchedExerciseDefinition>) => Promise<void>; // Updated type
  onAddOnlyToCurrentWorkout?: (exercise: Partial<FetchedExerciseDefinition>) => Promise<void>; // Updated type
  isSaving: boolean;
  context: 'manage-exercises' | 'workout-flow'; // New prop to differentiate context
  onEditExercise?: (exercise: Partial<FetchedExerciseDefinition>) => void; // Updated type
}

export const SaveAiExercisePrompt = ({
  open,
  onOpenChange,
  exercise,
  onSaveToMyExercises,
  onAddOnlyToCurrentWorkout,
  isSaving,
  context, // Destructure new prop
  onEditExercise, // Destructure new prop
}: SaveAiExercisePromptProps) => {
  const { startLoading, endLoadingSuccess, endLoadingError } = useGlobalStatus(); // NEW: Use global status

  if (!exercise) return null;

  const currentDuplicateStatus = exercise.duplicate_status || 'none'; // Access directly from exercise
  const showAddOnlyToWorkoutButton = typeof onAddOnlyToCurrentWorkout === 'function';

  const renderDescription = () => {
    if (context === 'manage-exercises') {
      if (currentDuplicateStatus === 'my-exercises') {
        return (
          <>AI has identified the exercise and it looks like you already have this in <strong className="font-semibold">My Exercises</strong>. Exercise name - "<span className="font-semibold">{exercise.name}</span>". Select Edit to change the exercise details or click Close to go back.</>
        );
      } else if (currentDuplicateStatus === 'global') {
        return (
          <>AI has identified the exercise and it looks like this already exists in the <strong className="font-semibold">Global Library</strong>. Exercise name - "<span className="font-semibold">{exercise.name}</span>". You can add it to "My Exercises" to customize it.</>
        );
      }
      return <>AI has identified the exercise. Save it to "My Exercises" for future use.</>;
    } else { // context === 'workout-flow'
      if (currentDuplicateStatus === 'my-exercises') {
        return <>AI has identified the exercise and it looks like you already have this in <strong className="font-semibold">My Exercises</strong>. You can still add it to your current ad-hoc workout from here.</>;
      } else if (currentDuplicateStatus === 'global') {
        return <>AI has identified the exercise and it looks like this already exists in the <strong className="font-semibold">Global Library</strong>. You can still add it to your current ad-hoc workout from here.</>;
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
              currentDuplicateStatus === 'my-exercises' ? (
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
              ) : ( // currentDuplicateStatus === 'none' or 'global' in manage-exercises context
                <Button
                  onClick={async () => {
                    startLoading(`Saving "${exercise.name}" to My Exercises...`); // NEW: Use global loading
                    try {
                      await onSaveToMyExercises(exercise);
                      endLoadingSuccess(`"${exercise.name}" saved to My Exercises!`); // NEW: Use global success
                    } catch (err: any) {
                      endLoadingError(`Failed to save "${exercise.name}": ${err.message}`); // NEW: Use global error
                    }
                  }}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Add and Save to My Exercises"}
                </Button>
              )
            ) : ( // context === 'workout-flow'
              <>
                {/* Primary action: Add to Current Workout */}
                {showAddOnlyToWorkoutButton && (
                  <Button variant="default" onClick={async () => {
                    startLoading(`Adding "${exercise.name}" to current workout...`); // NEW: Use global loading
                    try {
                      await onAddOnlyToCurrentWorkout!(exercise);
                      endLoadingSuccess(`"${exercise.name}" added to current workout!`); // NEW: Use global success
                    } catch (err: any) {
                      endLoadingError(`Failed to add "${exercise.name}": ${err.message}`); // NEW: Use global error
                    }
                  }} disabled={isSaving}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add to Current Workout
                  </Button>
                )}
                {/* Secondary action: Save to My Exercises (only if not a duplicate) */}
                {currentDuplicateStatus === 'none' && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      startLoading(`Saving "${exercise.name}" to My Exercises...`); // NEW: Use global loading
                      try {
                        await onSaveToMyExercises(exercise);
                        endLoadingSuccess(`"${exercise.name}" saved to My Exercises!`); // NEW: Use global success
                      } catch (err: any) {
                        endLoadingError(`Failed to save "${exercise.name}": ${err.message}`); // NEW: Use global error
                      }
                    }}
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