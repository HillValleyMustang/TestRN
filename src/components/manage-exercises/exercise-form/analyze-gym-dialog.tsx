"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, ImageOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { LoadingOverlay } from "@/components/loading-overlay";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AnalyseGymDialogProps { // Renamed to AnalyseGymDialogProps
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseIdentified: (exercise: Partial<ExerciseDefinition>, isDuplicate: boolean) => void;
}

export const AnalyseGymDialog = ({ open, onOpenChange, onExerciseIdentified }: AnalyseGymDialogProps) => { // Renamed to AnalyseGymDialog
  const { session } = useSession();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Image size should not exceed 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImagePreview(reader.result as string);
        setBase64Image(base64);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setBase64Image(null);
    }
  };

  const handleAnalyseImage = async () => { // Renamed to handleAnalyseImage
    if (!base64Image) {
      toast.error("Please upload an image first.");
      return;
    }
    if (!session) {
      toast.error("You must be logged in to use this feature.");
      return;
    }

    setLoading(true);
    try {
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
        throw new Error(data.error || 'Failed to analyse image.'); // Changed to analyse
      }

      onExerciseIdentified(data.identifiedExercise, data.isDuplicate);
      onOpenChange(false); // Close this dialog
      resetForm();
    } catch (err: any) {
      console.error("Error analysing image:", err); // Changed to analysing
      toast.error("Image analysis failed: " + err.message); // Changed to analysis
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImagePreview(null);
    setBase64Image(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Analyse Gym Photo
            </DialogTitle>
            <DialogDescription>
              Upload a photo of your gym equipment, and our AI will try to identify an exercise.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-4">
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, GIF (MAX. 5MB)</p>
                </div>
              )}
            </label>
            {imagePreview && (
              <Button variant="outline" onClick={resetForm} className="w-full">
                <ImageOff className="h-4 w-4 mr-2" /> Remove Image
              </Button>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleAnalyseImage} disabled={!base64Image || loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? "Analysing..." : "Analyse Image"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LoadingOverlay
        isOpen={loading}
        title="Analysing Image"
        description="Please wait while the AI identifies equipment in your photo."
      />
    </>
  );
};