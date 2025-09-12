"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { SaveAiExercisePrompt } from "@/components/workout-flow/save-ai-exercise-prompt";
import { Tables } from "@/types/supabase";
import { Camera, Dumbbell, CheckCircle2, XCircle, PlusCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface OnboardingStep5Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  // NEW: Props for managing virtual gyms
  virtualGymNames: string[];
  setVirtualGymNames: React.Dispatch<React.SetStateAction<string[]>>;
  activeLocationTag: string | null;
  setActiveLocationTag: React.Dispatch<React.SetStateAction<string | null>>;
  identifiedExercises: (Partial<ExerciseDefinition> & { isDuplicate?: boolean; locationTag: string })[];
  setIdentifiedExercises: React.Dispatch<React.SetStateAction<(Partial<ExerciseDefinition> & { isDuplicate?: boolean; locationTag: string })[]>>;
}

export const OnboardingStep5_EquipmentSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  virtualGymNames,
  setVirtualGymNames,
  activeLocationTag,
  setActiveLocationTag,
  identifiedExercises,
  setIdentifiedExercises,
}: OnboardingStep5Props) => {
  const { session, supabase } = useSession();
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [newGymNameInput, setNewGymNameInput] = useState(""); // State for new gym name input
  
  // Removed SaveAiExercisePrompt related states as it's not directly used here for saving,
  // the Edge Function handles the initial persistence.

  useEffect(() => {
    // If no gym names exist, and the user hasn't skipped, prompt to add one.
    if (virtualGymNames.length === 0 && equipmentMethod !== 'skip') {
      setActiveLocationTag(null);
    } else if (virtualGymNames.length > 0 && !activeLocationTag) {
      // If gyms exist but none is active, set the first one as active
      setActiveLocationTag(virtualGymNames[0]);
    }
  }, [virtualGymNames, activeLocationTag, setActiveLocationTag, equipmentMethod]);

  const handleAddGym = () => {
    if (newGymNameInput.trim() && !virtualGymNames.includes(newGymNameInput.trim())) {
      const newGyms = [...virtualGymNames, newGymNameInput.trim()];
      setVirtualGymNames(newGyms);
      setActiveLocationTag(newGymNameInput.trim());
      setNewGymNameInput("");
      toast.success(`Virtual gym '${newGymNameInput.trim()}' added!`);
    } else if (virtualGymNames.includes(newGymNameInput.trim())) {
      toast.info(`'${newGymNameInput.trim()}' already exists.`);
      setActiveLocationTag(newGymNameInput.trim()); // Set it as active if it exists
      setNewGymNameInput("");
    }
  };

  const handleExercisesIdentified = useCallback((exercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean; location_tags?: string[] | null })[]) => {
    if (exercises.length === 0) {
      toast.info("AI couldn't identify any equipment in the photo. Try another angle or a different photo!");
      return;
    }
    // The Edge Function has already handled the persistence and updated location_tags.
    // We just need to update our local state to display them.
    const exercisesWithTag = exercises.map(ex => ({ 
      ...ex, 
      locationTag: activeLocationTag || 'Unknown Gym', // Ensure locationTag is present
      // Ensure location_tags array is correctly passed if it exists from the Edge Function
      location_tags: ex.location_tags || [], 
    }));
    setIdentifiedExercises(prev => [...prev, ...exercisesWithTag]);
    toast.success(`${exercises.length} exercise(s) identified!`);
  }, [activeLocationTag, setIdentifiedExercises]);

  const handleRemoveIdentifiedExercise = useCallback((indexToRemove: number) => {
    setIdentifiedExercises(prev => prev.filter((_, index) => index !== indexToRemove));
    toast.info("Exercise removed from identified list.");
  }, [setIdentifiedExercises]);

  const isNextButtonDisabled = equipmentMethod === 'photo' && identifiedExercises.length === 0;
  const canUploadPhoto = activeLocationTag !== null && activeLocationTag.trim() !== '';

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {/* Virtual Gym Management */}
          <div>
            <Label htmlFor="activeGymSelect">Active Virtual Gym</Label>
            <div className="flex gap-2">
              <Select
                value={activeLocationTag || ''}
                onValueChange={(value) => setActiveLocationTag(value === 'none' ? null : value)}
                disabled={equipmentMethod === 'skip'}
              >
                <SelectTrigger id="activeGymSelect">
                  <SelectValue placeholder="Select or add a gym" />
                </SelectTrigger>
                <SelectContent>
                  {virtualGymNames.map(gym => (
                    <SelectItem key={gym} value={gym}>{gym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" disabled={equipmentMethod === 'skip'}>
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Add New Virtual Gym</AlertDialogTitle>
                    <AlertDialogDescription>
                      Enter a name for your new gym location. This will become your new active gym.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="e.g., Office Gym"
                      value={newGymNameInput}
                      onChange={(e) => setNewGymNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddGym();
                        }
                      }}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setNewGymNameInput("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddGym} disabled={!newGymNameInput.trim()}>
                      Add and Set Active
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Equipment identified from photos will be tagged with the active gym.
            </p>
          </div>

          {/* Upload Photo Button */}
          <div className="flex flex-col space-y-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!canUploadPhoto) {
                  toast.error("Please select or add a virtual gym before uploading a photo.");
                  return;
                }
                setEquipmentMethod('photo');
                setShowAnalyseGymDialog(true);
              }}
              disabled={!canUploadPhoto || equipmentMethod === 'skip'}
            >
              <Camera className="h-4 w-4 mr-2" /> Upload Gym Photo
            </Button>
            <p className="text-sm text-muted-foreground ml-6">
              Take photos of your gym to help us identify available equipment. You can upload multiple photos.
            </p>
          </div>
          
          {/* Identified Exercises List */}
          {identifiedExercises.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Identified Equipment:</h4>
              <ScrollArea className="h-40 border rounded-md p-2">
                <ul className="space-y-1">
                  {identifiedExercises.map((ex, index) => (
                    <li key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded-sm">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span>{ex.name}</span>
                        {ex.locationTag && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {ex.locationTag}
                          </span>
                        )}
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

          {/* Skip for Now Option */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setEquipmentMethod('skip');
                setIdentifiedExercises([]); // Clear identified exercises if skipping
                setActiveLocationTag(null); // Clear active location tag
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
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!equipmentMethod || (equipmentMethod === 'photo' && identifiedExercises.length === 0)}
          >
            Next
          </Button>
        </div>
      </div>

      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExercisesIdentified={handleExercisesIdentified}
        locationTag={activeLocationTag} // Pass the active location tag
      />
      {/* Removed SaveAiExercisePrompt as it's not used in this flow */}
    </>
  );
};