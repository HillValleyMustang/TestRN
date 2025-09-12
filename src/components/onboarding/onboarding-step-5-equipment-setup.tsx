"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { Tables } from "@/types/supabase";
import { Camera, Dumbbell, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface OnboardingStep5Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  firstGymName: string; // Prop from useOnboardingForm
  setFirstGymName: (name: string) => void; // Setter for firstGymName
  identifiedExercises: (Partial<ExerciseDefinition> & { isDuplicate?: boolean; locationTag: string })[]; // New prop
  setIdentifiedExercises: React.Dispatch<React.SetStateAction<(Partial<ExerciseDefinition> & { isDuplicate?: boolean; locationTag: string })[]>>; // New prop
}

export const OnboardingStep5_EquipmentSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  firstGymName,
  setFirstGymName,
  identifiedExercises,
  setIdentifiedExercises,
}: OnboardingStep5Props) => {
  const { session, supabase } = useSession();
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [showSaveAiExercisePrompt, setShowSaveAiExercisePrompt] = useState(false);
  const [aiIdentifiedExerciseForPrompt, setAiIdentifiedExerciseForPrompt] = useState<Partial<ExerciseDefinition> & { isDuplicate?: boolean; locationTag: string } | null>(null);
  const [isAiSaving, setIsAiSaving] = useState(false);

  const handleExercisesIdentified = useCallback((exercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean })[]) => {
    if (exercises.length === 0) {
      toast.info("AI couldn't identify any equipment in the photo. Try another angle or a different photo!");
      return;
    }
    // For onboarding, we assume the Edge Function has already handled persistence.
    // We just need to update our local state to display them.
    const exercisesWithTag = exercises.map(ex => ({ ...ex, locationTag: firstGymName }));
    setIdentifiedExercises(prev => [...prev, ...exercisesWithTag]);
    toast.success(`${exercises.length} exercise(s) identified!`);
  }, [firstGymName, setIdentifiedExercises]);

  const handleRemoveIdentifiedExercise = useCallback((indexToRemove: number) => {
    setIdentifiedExercises(prev => prev.filter((_, index) => index !== indexToRemove));
    toast.info("Exercise removed from identified list.");
  }, [setIdentifiedExercises]);

  const handleSaveAiExerciseToMyExercises = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    // This function is primarily for the 'Manage Exercises' page.
    // In onboarding, the Edge Function already handles the persistence.
    // We just need to close the prompt.
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExerciseForPrompt(null);
    toast.info("Exercise details noted for your profile.");
  }, []);

  const handleAddOnlyToCurrentWorkout = useCallback(async (exercise: Partial<Tables<'exercise_definitions'>>) => {
    // This function is primarily for the 'Workout' page.
    // In onboarding, the Edge Function already handles the persistence.
    // We just need to close the prompt.
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExerciseForPrompt(null);
    toast.info("Exercise details noted for your profile.");
  }, []);

  const handleEditIdentifiedExercise = useCallback((exercise: Partial<Tables<'exercise_definitions'>>) => {
    // This is not directly supported in the onboarding flow for identified exercises.
    // The user can edit them later in 'Manage Exercises'.
    toast.info("You can edit this exercise later in 'Manage Exercises'.");
    setShowSaveAiExercisePrompt(false);
    setAiIdentifiedExerciseForPrompt(null);
  }, []);

  const isNextButtonDisabled = equipmentMethod === 'photo' && identifiedExercises.length === 0;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="firstGymName">My First Virtual Gym Name</Label>
            <Input 
              id="firstGymName" 
              placeholder="e.g., Home Gym, University Gym" 
              value={firstGymName}
              onChange={(e) => setFirstGymName(e.target.value)}
              required
              disabled={equipmentMethod === 'skip'}
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This name will be used to tag equipment identified from your photos.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!firstGymName.trim()) {
                  toast.error("Please enter a gym name before uploading a photo.");
                  return;
                }
                setEquipmentMethod('photo');
                setShowAnalyseGymDialog(true);
              }}
              disabled={!firstGymName.trim()}
            >
              <Camera className="h-4 w-4 mr-2" /> Upload Gym Photo
            </Button>
            <p className="text-sm text-muted-foreground ml-6">
              Take photos of your gym to help us identify available equipment. You can upload multiple photos.
            </p>
          </div>
          
          {identifiedExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Identified Equipment for "{firstGymName}":</h4>
              <ScrollArea className="h-40 border rounded-md p-2">
                <ul className="space-y-1">
                  {identifiedExercises.map((ex, index) => (
                    <li key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded-sm">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span>{ex.name}</span>
                        {ex.isDuplicate && <span className="text-xs text-muted-foreground">(Existing)</span>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveIdentifiedExercise(index)}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEquipmentMethod('skip');
                setIdentifiedExercises([]); // Clear identified exercises if skipping
              }}
              className={cn(
                "flex-1",
                equipmentMethod === 'skip' ? "border-primary ring-2 ring-primary" : ""
              )}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" /> Skip for Now
            </Button>
            <p className="text-sm text-muted-foreground flex-1">
              Use default "Common Gym" equipment set.
            </p>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!equipmentMethod || !firstGymName.trim() || isNextButtonDisabled}
          >
            Next
          </Button>
        </div>
      </div>

      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExercisesIdentified={handleExercisesIdentified}
        locationTag={firstGymName.trim() || null}
      />
      {aiIdentifiedExerciseForPrompt && (
        <SaveAiExercisePrompt
          open={showSaveAiExercisePrompt}
          onOpenChange={setShowSaveAiExercisePrompt}
          exercise={aiIdentifiedExerciseForPrompt}
          onSaveToMyExercises={handleSaveAiExerciseToMyExercises}
          onAddOnlyToCurrentWorkout={handleAddOnlyToCurrentWorkout}
          context="workout-flow" // Context is onboarding, but behavior is similar to workout-flow for saving
          onEditExercise={handleEditIdentifiedExercise}
          isSaving={isAiSaving}
          isDuplicate={aiIdentifiedExerciseForPrompt.isDuplicate || false}
        />
      )}
    </>
  );
};