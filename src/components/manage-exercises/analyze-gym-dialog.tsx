"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Sparkles, Loader2, AlertCircle, XCircle } from "lucide-react";
import { useSession } from "@/components/session-context-provider";
import { toast } from "sonner";
import { Tables } from "@/types/supabase";
import { LoadingOverlay } from '../loading-overlay';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AnalyzeGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseIdentified: (exerciseData: Partial<ExerciseDefinition>, isDuplicate: boolean) => void;
}

export const AnalyzeGymDialog = ({ open, onOpenChange, onExerciseIdentified }: AnalyzeGymDialogProps) => {
  const { session, supabase } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const base64Image = reader.result?.toString().split(',')[1];

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
          const isDuplicate = data.isDuplicate as boolean;

          if (isDuplicate) {
            toast.info("Exercise already exists in your library or the global library.");
          } else {
            toast.success("Equipment identified!");
          }
          onExerciseIdentified(aiExercise, isDuplicate);
          onOpenChange(false);
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

  const handleClear = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              Upload photos of your gym equipment to automatically identify it and add it to your workout.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center space-y-4">
              {imagePreviewUrl ? (
                <div className="relative w-full max-w-xs h-48 border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                  <img src={imagePreviewUrl} alt="Equipment Preview" className="max-w-full max-h-full object-contain" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70" onClick={handleClear}>
                    <XCircle className="h-4 w-4" />
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
        <LoadingOverlay 
          isOpen={loading} 
          title="Analysing Gym Equipment" 
          description="Please wait while the AI identifies equipment from your photo." 
        />
      </Dialog>
    </>
  );
};