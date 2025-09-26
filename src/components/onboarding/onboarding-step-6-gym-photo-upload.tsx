"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase';
import { toast } from 'sonner';
import { Camera, CheckCircle, Trash2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface OnboardingStep6Props {
  identifiedExercises: Partial<FetchedExerciseDefinition>[];
  addIdentifiedExercise: (exercise: Partial<FetchedExerciseDefinition>) => void;
  removeIdentifiedExercise: (exerciseName: string) => void;
  confirmedExercises: Set<string>;
  toggleConfirmedExercise: (exerciseName: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep6_GymPhotoUpload = ({
  identifiedExercises,
  addIdentifiedExercise,
  removeIdentifiedExercise,
  confirmedExercises,
  toggleConfirmedExercise,
  handleNext,
  handleBack,
}: OnboardingStep6Props) => {
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);

  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    if (exercises.length === 0) {
      toast.info("No exercises were identified from the photos.");
      return;
    }
    exercises.forEach(ex => {
      addIdentifiedExercise(ex as Partial<Tables<'exercise_definitions'>>);
    });
    toast.success(`${exercises.length} exercise(s) identified and added for review!`);
  }, [addIdentifiedExercise]);

  return (
    <>
      <div className="space-y-6">
        <div className="p-4 border-2 border-dashed rounded-lg text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            Upload photos of your gym equipment. Our AI will identify exercises you can do. You can upload multiple photos.
          </p>
          <Button onClick={() => setShowAnalyseGymDialog(true)} size="sm">
            <Camera className="h-4 w-4 mr-2" />
            Upload & Analyse
          </Button>
        </div>

        {identifiedExercises.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Review Identified Exercises:</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Confirm the exercises you want to associate with this gym. Uncheck any you don't want.
            </p>
            <ul className="space-y-2">
              {identifiedExercises.map((ex, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`exercise-${index}`}
                      checked={confirmedExercises.has(ex.name!)}
                      onCheckedChange={() => toggleConfirmedExercise(ex.name!)}
                    />
                    <Label htmlFor={`exercise-${index}`} className="text-sm font-medium cursor-pointer">
                      {ex.name}
                    </Label>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeIdentifiedExercise(ex.name!)} className="h-7 w-7">
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
          <Button 
            onClick={handleNext} 
            disabled={identifiedExercises.length > 0 && confirmedExercises.size === 0}
            size="lg"
          >
            {identifiedExercises.length > 0 ? `Confirm ${confirmedExercises.size} Exercises` : 'Next'}
          </Button>
        </div>
      </div>

      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
    </>
  );
};