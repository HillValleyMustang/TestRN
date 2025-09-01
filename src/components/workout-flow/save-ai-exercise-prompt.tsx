"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, PlusCircle } from "lucide-react";
import { Tables } from "@/types/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingOverlay } from "../loading-overlay";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface SaveAiExercisePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Partial<ExerciseDefinition> | null;
  onSaveToMyExercises: (exercise: Partial<ExerciseDefinition>) => Promise<void>;
  onSkip: () => void; // Now means "Add just to this workout"
  isSaving: boolean;
  isDuplicate: boolean; // New prop to indicate if the exercise is a duplicate
}

export const SaveAiExercisePrompt = ({
  open,
  onOpenChange,
  exercise,
  onSaveToMyExercises,
  onSkip, // Now means "Add just to this workout"
  isSaving,
  isDuplicate, // Destructure new prop
}: SaveAiExercisePromptProps) => {
  if (!exercise) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" /> AI Identified Exercise
            </DialogTitle>
            <DialogDescription>
              The AI has identified an exercise. You can add it to your current ad-hoc workout, and optionally save it to "My Exercises" for future use.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow py-4"> {/* Removed h-full and pr-4, added py-4 */}
            <div className="px-4"> {/* Added px-4 for content padding */}
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
                    <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline truncate block">
                      {exercise.video_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <div className="flex flex-col gap-2 pt-4 border-t px-4"> {/* Added px-4 for button padding */}
            <Button 
              onClick={() => onSaveToMyExercises(exercise)} 
              disabled={isSaving || isDuplicate} // Disable if saving or if it's a duplicate
            >
              <Save className="h-4 w-4 mr-2" /> {isSaving ? "Saving..." : "Add and Save to My Exercises"}
            </Button>
            <Button variant="outline" onClick={onSkip} disabled={isSaving}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add just to this workout
            </Button>
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