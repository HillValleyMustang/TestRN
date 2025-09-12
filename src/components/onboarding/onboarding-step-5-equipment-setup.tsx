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
  // NEW: Props for managing active gyms
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
  
  const hasActiveGym = activeLocationTag !== null && activeLocationTag.trim() !== '';
  const hasIdentifiedExercises = identifiedExercises.length > 0;

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
      toast.success(`Active gym '${newGymNameInput.trim()}' added!`);
    } else if (virtualGymNames.includes(newGymNameInput.trim())) {
      toast.info(`'${newGymNameInput.trim()}' already exists.`);
      setActiveLocationTag(newGymNameInput.trim()); // Set it as active if it exists
      setNewGymNameInput("");
    }
  };

  const handleExercisesIdentified = useCallback((exercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean; location_tags?: string[] | null })[]) => {
    if (exercises.length === 0) {
      toast.info("AI couldn't identify any gym equipment in the photo(s). Try another angle or different photos!");
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

  const isNextButtonDisabled = equipmentMethod === 'photo' && !hasIdentifiedExercises;

  return (
    <>
      <div className="space-y-6">
        {/* Step 1: Setup First Active Gym */}
        {!hasActiveGym && virtualGymNames.length === 0 && equipmentMethod !== 'skip' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> 1. Setup Your First Active Gym
            </h3>
            <p className="text-sm text-muted-foreground">
              Give a name to your primary gym location. You can set up additional gyms in your profile later.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Home Gym, Local Fitness, Work Gym"
                value={newGymNameInput}
                onChange={(e) => setNewGymNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGym();
                  }
                }}
                className="flex-1"
              />
              <Button onClick={handleAddGym} disabled={!newGymNameInput.trim()}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Gym
              </Button>
            </div>
          </div>
        )}

        {/* Display Active Gym if set */}
        {hasActiveGym && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Active Gym: <span className="text-primary">{activeLocationTag}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Equipment identified from photos will be tagged with this gym. You can change or add more gyms in your profile.
            </p>
            {virtualGymNames.length > 1 && (
              <div>
                <Label htmlFor="activeGymSelect" className="sr-only">Change Active Gym</Label>
                <Select
                  value={activeLocationTag || ''}
                  onValueChange={(value) => setActiveLocationTag(value === 'none' ? null : value)}
                  disabled={equipmentMethod === 'skip'}
                >
                  <SelectTrigger id="activeGymSelect" className="w-full">
                    <SelectValue placeholder="Change active gym" />
                  </SelectTrigger>
                  <SelectContent>
                    {virtualGymNames.map(gym => (
                      <SelectItem key={gym} value={gym}>{gym}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Photo Upload Button */}
        {hasActiveGym && equipmentMethod !== 'skip' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> 2. Upload Gym Photo(s)
            </h3>
            <p className="text-sm text-muted-foreground">
              Take photos of your gym to help us identify available equipment. You can upload multiple photos.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setEquipmentMethod('photo');
                setShowAnalyseGymDialog(true);
              }}
              disabled={!hasActiveGym}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" /> Upload Gym Photo(s)
            </Button>
          </div>
        )}
          
        {/* Identified Exercises List */}
        {hasIdentifiedExercises && (
          <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" /> Identified Equipment:
            </h4>
            <ScrollArea className="h-40 border rounded-md p-2">
              <ul className="space-y-1">
                {identifiedExercises.map((ex, index) => (
                  <li key={index} className="flex items-center justify-between text-sm bg-card p-2 rounded-sm">
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

        {/* Step 3: Skip for Now Option */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> 3. Or, Skip Equipment Setup
          </h3>
          <p className="text-sm text-muted-foreground">
            Use our carefully crafted "Common Gym" equipment set. You can always add your specific gym equipment later in your profile.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setEquipmentMethod('skip');
              setIdentifiedExercises([]); // Clear identified exercises if skipping
              setActiveLocationTag(null); // Clear active location tag
            }}
            className={cn(
              "w-full",
              equipmentMethod === 'skip' ? "border-primary ring-2 ring-primary" : ""
            )}
          >
            Skip for Now
          </Button>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!equipmentMethod || isNextButtonDisabled}
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
    </>
  );
};