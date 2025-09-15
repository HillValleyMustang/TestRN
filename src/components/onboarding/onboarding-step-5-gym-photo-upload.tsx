"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase'; // Import FetchedExerciseDefinition
import { toast } from 'sonner';
import { Camera, CheckCircle, Trash2 } from 'lucide-react';

interface OnboardingStep5Props {
  identifiedExercises: Partial<Tables<'exercise_definitions'>>[];
  addIdentifiedExercise: (exercise: Partial<Tables<'exercise_definitions'>>) => void;
  removeIdentifiedExercise: (exerciseName: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep5_GymPhotoUpload = ({
  identifiedExercises,
  addIdentifiedExercise,
  removeIdentifiedExercise,
  handleNext,
  handleBack,
}: OnboardingStep5Props) => {
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExercise, setAiIdentifiedExercise] = useState<Partial<Tables<'exercise_definitions'>> | null>(null);
  const [aiDuplicateStatus, setAiDuplicateStatus] = useState<'none' | 'global' | 'my-exercises'>('none'); // Changed from isDuplicateAiExercise

  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    if (exercises.length === 0) {
      toast.info("No exercises were identified from the photos.");
      return;
    }
    // For onboarding, we directly add all identified exercises to the list
    exercises.forEach(ex => {
      // Cast to Partial<Tables<'exercise_definitions'>> as addIdentifiedExercise expects this
      addIdentifiedExercise(ex as Partial<Tables<'exercise_definitions'>>);
    });
    console.log(`${exercises.length} exercise(s) identified and added to your setup!`); // Replaced toast.success
    // No need to show SaveAiExercisePrompt for each one individually in onboarding context
    // If we wanted to allow review/edit of each, we'd loop and open the prompt for each.
    // For now, we assume direct addition.
  }, [addIdentifiedExercise]);

  const handleSaveToOnboardingState = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    addIdentifiedExercise(exercise);
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExercise(null);
    console.log(`'${exercise.name}' added to your setup!`); // Replaced toast.success
  }, [addIdentifiedExercise]);

  return (
    <>
      <div className="space-y-6">
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground mb-4 text-sm"> {/* Reduced text size */}
            Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload multiple photos.
          </p>
          <Button onClick={() => setShowAnalyseGymDialog(true)} size="sm"> {/* Smaller button */}
            <Camera className="h-4 w-4 mr-2" />
            Upload & Analyse
          </Button>
        </div>

        {identifiedExercises.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Identified Exercises for Your Gym:</h4>
            <ul className="space-y-2">
              {identifiedExercises.map((ex, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <span className="flex items-center gap-2 text-sm"> {/* Reduced text size */}
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {ex.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeIdentifiedExercise(ex.name!)} className="h-7 w-7"> {/* Smaller button */}
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Next
          </Button>
        </div>
      </div>

      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
      {/* The SaveAiExercisePrompt is no longer directly used here for individual exercises, 
          as handleExerciseIdentified now adds all at once. 
          Keeping it commented out in case future requirements change.
      <SaveAiExercisePrompt
        open={showSaveAiExercisePrompt}
        onOpenChange={setShowSaveAiExercisePrompt}
        exercise={aiIdentifiedExercise}
        onSaveToMyExercises={handleSaveToOnboardingState}
        isSaving={false}
        duplicateStatus={aiDuplicateStatus}
        context="manage-exercises"
      /> */}
    </>
  );
};