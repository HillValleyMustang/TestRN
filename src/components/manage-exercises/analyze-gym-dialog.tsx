"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { Tables } from "@/types/supabase";
import { LoadingOverlay } from '../loading-overlay';
import { DuplicateExerciseConfirmDialog } from "./duplicate-exercise-confirm-dialog"; // Import the new dialog

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AnalyzeGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseIdentified: (exerciseData: Partial<ExerciseDefinition>) => void;
}

export const AnalyzeGymDialog = ({ open, onOpenChange, onExerciseIdentified }: AnalyzeGymDialogProps) => {
  const { session, supabase } = useSession(); // Destructure supabase from useSession
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDuplicateConfirmDialog, setShowDuplicateConfirmDialog] = useState(false);
  const [identifiedExerciseData, setIdentifiedExerciseData] = useState<Partial<ExerciseDefinition> | null>(null);
  const [duplicateLocation, setDuplicateLocation] = useState<'My Exercises' | 'Global Library'>('My Exercises'); // State for duplicate location

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setError(null);
    } else {
      setSelectedFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first.");
      return;
    }
    if (!session) {
      toast.error("You must be logged in to use AI analysis.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64Image = reader.result?.toString().split(',')[1]; // Get base64 part

        if (!base64Image) {
          throw new Error("Failed to read image file.");
        }

        const response = await fetch('/api/identify-equipment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ base64Image }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to identify equipment.");
        }

        if (data.identifiedExercise) {
          const aiExercise = data.identifiedExercise as Partial<ExerciseDefinition>;
          setIdentifiedExerciseData(aiExercise); // Store identified data

          // Check for duplicates by name only
          const { data: existingExercises, error: duplicateCheckError } = await supabase
            .from('exercise_definitions')
            .select('id, name, user_id')
            .eq('name', aiExercise.name)
            .or(`user_id.eq.${session.user.id},user_id.is.null`); // Check user's own and global

          if (duplicateCheckError) {
            throw new Error(duplicateCheckError.message);
          }

          if (existingExercises && existingExercises.length > 0) {
            // Determine where the duplicate exists
            const isUserOwnedDuplicate = existingExercises.some(ex => ex.user_id === session.user.id);
            setDuplicateLocation(isUserOwnedDuplicate ? 'My Exercises' : 'Global Library');
            // Duplicate found, show confirmation dialog
            setShowDuplicateConfirmDialog(true);
          } else {
            // No duplicate, proceed to add
            onExerciseIdentified(aiExercise);
            toast.success("Equipment identified! Review and save the exercise.");
            onOpenChange(false); // Close dialog on success
          }
        } else {
          throw new Error("AI could not identify specific equipment from the photo.");
        }
      };
      reader.onerror = () => {
        throw new Error("Error reading file.");
      };

    } catch (err: any) {
      console.error("AI identification error:", err);
      setError(err.message || "An unexpected error occurred during analysis.");
      toast.error(err.message || "Failed to analyse image.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAddAnyway = () => {
    if (identifiedExerciseData) {
      onExerciseIdentified(identifiedExerciseData);
      toast.success("Equipment identified! Review and save the exercise.");
    }
    setShowDuplicateConfirmDialog(false);
    onOpenChange(false); // Close main dialog
  };

  const handleCancelDuplicateAdd = () => {
    setShowDuplicateConfirmDialog(false);
    onOpenChange(false); // Close main dialog
    toast.info("Exercise not added.");
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2" /> Analyse My Gym
            </DialogTitle>
            <DialogDescription>
              Upload photos of your gym equipment to automatically build your exercise library.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center space-y-4">
              {imagePreviewUrl ? (
                <div className="relative w-full max-w-xs h-48 border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                  <img src={imagePreviewUrl} alt="Equipment Preview" className="max-w-full max-h-full object-contain" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70" onClick={handleClear}>
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-xs h-48 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground">
                  <Upload className="h-12 w-12" />
                </div>
              )}
              <Label htmlFor="picture" className="sr-only">Picture</Label>
              <Input 
                id="picture" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                className="w-full max-w-xs"
              />
              {/* Future enhancement: Webcam capture */}
              {/* <Button variant="outline" className="w-full max-w-xs">
                <Camera className="h-4 w-4 mr-2" /> Take Photo
              </Button> */}
            </div>

            {error && (
              <p className="text-destructive text-center text-sm flex items-center justify-center">
                <AlertCircle className="h-4 w-4 mr-2" /> {error}
              </p>
            )}

            <Button onClick={handleAnalyze} disabled={!selectedFile || loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? "Analysing..." : "Analyse Photo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* LoadingOverlay is now outside the Dialog */}
      <LoadingOverlay 
        isOpen={loading} 
        title="Analysing Gym Equipment" 
        description="Please wait while the AI identifies equipment from your photo." 
      />

      {identifiedExerciseData && (
        <DuplicateExerciseConfirmDialog
          open={showDuplicateConfirmDialog}
          onOpenChange={handleCancelDuplicateAdd} // If user closes dialog, it's a cancel
          exerciseName={identifiedExerciseData.name || "Unknown Exercise"}
          duplicateLocation={duplicateLocation} // Pass the determined location
          onConfirmAddAnyway={handleConfirmAddAnyway}
        />
      )}
    </>
  );
};