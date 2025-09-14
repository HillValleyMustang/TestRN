"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { Tables } from '@/types/supabase';
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
  const [isDuplicateAiExercise, setIsDuplicateAiExercise] = useState(false);

  const handleExerciseIdentified = useCallback((exercise: Partial<Tables<'exercise_definitions'>>, isDuplicate: boolean) => {
    setAiIdentifiedExercise(exercise);
    setIsDuplicateAiExercise(isDuplicate);
    setShowSaveAiExercisePrompt(true);
  }, []);

  const handleSaveToOnboardingState = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    addIdentifiedExercise(exercise);
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExercise(null);
    toast.success(`'${exercise.name}' added to your setup!`);
  }, [addIdentifiedExercise]);

  return (
    <>
      <div className="space-y-6">
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground mb-4">
            Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload multiple photos.
          </p>
          <Button onClick={() => setShowAnalyseGymDialog(true)}>
            <Camera className="h-4 w-4 mr-2" />
            Upload and Analyse Photo
          </Button>
        </div>

        {identifiedExercises.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Identified Exercises for Your Gym:</h4>
            <ul className="space-y-2">
              {identifiedExercises.map((ex, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    {ex.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeIdentifiedExercise(ex.name!)}>
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
      <SaveAiExercisePrompt
        open={showSaveAiExercisePrompt}
        onOpenChange={setShowSaveAiExercisePrompt}
        exercise={aiIdentifiedExercise}
        onSaveToMyExercises={handleSaveToOnboardingState}
        isSaving={false}
        isDuplicate={isDuplicateAiExercise}
        context="manage-exercises"
      />
    </>
  );
};