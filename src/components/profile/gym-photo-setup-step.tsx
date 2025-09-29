"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AnalyseGymDialog } from "@/components/manage-exercises/exercise-form/analyze-gym-dialog";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { Camera, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from '@/components/ui/scroll-area';

interface GymPhotoSetupStepProps {
  gym: Tables<'gyms'>;
  onBack: () => void;
  onFinish: () => void;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
}

export const GymPhotoSetupStep = ({ gym, onBack, onFinish, setTempStatusMessage }: GymPhotoSetupStepProps) => {
  const { session, supabase } = useSession();
  const [identifiedExercises, setIdentifiedExercises] = useState<Partial<FetchedExerciseDefinition>[]>([]);
  const [confirmedExercises, setConfirmedExercises] = useState<Set<string>>(new Set());
  const [showAnalyseGymDialog, setShowAnalyseGymDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const addIdentifiedExercise = useCallback((exercise: Partial<FetchedExerciseDefinition>) => {
    setIdentifiedExercises(prev => {
      if (prev.some(e => e.name === exercise.name)) return prev;
      setConfirmedExercises(prevConfirmed => new Set(prevConfirmed).add(exercise.name!));
      return [...prev, exercise];
    });
  }, []);

  const removeIdentifiedExercise = useCallback((exerciseName: string) => {
    setIdentifiedExercises(prev => prev.filter(e => e.name !== exerciseName));
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      newSet.delete(exerciseName);
      return newSet;
    });
  }, []);

  const toggleConfirmedExercise = useCallback((exerciseName: string) => {
    setConfirmedExercises(prevConfirmed => {
      const newSet = new Set(prevConfirmed);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  }, []);

  const handleExerciseIdentified = useCallback((exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => {
    if (exercises.length === 0) {
      toast.info("No exercises were identified from the photos.");
      return;
    }
    exercises.forEach(ex => {
      addIdentifiedExercise(ex);
    });
  }, [addIdentifiedExercise]);

  const handleSubmit = async () => {
    if (!session) {
      toast.error("You must be logged in.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        gymId: gym.id,
        confirmedExercises: identifiedExercises.filter(ex => confirmedExercises.has(ex.name!)),
      };

      const response = await fetch('/api/setup-gym-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to set up gym with AI.');

      setTempStatusMessage({ message: "Setup complete!", type: 'success' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      onFinish();
    } catch (error: any) {
      console.error("Failed to setup gym with AI:", error);
      setTempStatusMessage({ message: `Setup failed: ${error.message}`, type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Analyse "{gym.name}" with AI</DialogTitle>
        <DialogDescription>Upload photos of your equipment. The AI will identify exercises and build a plan.</DialogDescription>
      </DialogHeader>
      <div className="flex-grow overflow-y-auto py-4 space-y-6 pr-4 -mr-4">
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
            <ScrollArea className="max-h-48 pr-4">
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
            </ScrollArea>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={loading}>Back</Button>
        <Button onClick={handleSubmit} disabled={loading || (identifiedExercises.length > 0 && confirmedExercises.size === 0)}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          {loading ? "Setting up..." : "Finish Setup"}
        </Button>
      </DialogFooter>
      <AnalyseGymDialog
        open={showAnalyseGymDialog}
        onOpenChange={setShowAnalyseGymDialog}
        onExerciseIdentified={handleExerciseIdentified}
      />
    </>
  );
};