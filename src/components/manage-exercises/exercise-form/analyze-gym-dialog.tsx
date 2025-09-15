"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, ImageOff, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
import { LoadingOverlay } from "@/components/loading-overlay";
import { ScrollArea } from "@/components/ui/scroll-area";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AnalyseGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExerciseIdentified: (exercises: Partial<FetchedExerciseDefinition>[], duplicate_status: 'none' | 'global' | 'my-exercises') => void;
}

export const AnalyseGymDialog = ({ open, onOpenChange, onExerciseIdentified }: AnalyseGymDialogProps) => {
  const { session } = useSession();
  const [imagePreviews, setImagePreviews] = useState<string[]>([]
);
  const [base64Images, setBase64Images] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newImagePreviews: string[] = [];
    const newBase64Images: string[] = [];
    let hasError = false;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`File '${file.name}' is not an image.`);
        hasError = true;
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`File '${file.name}' exceeds 5MB limit.`);
        hasError = true;
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        newImagePreviews.push(reader.result as string);
        newBase64Images.push(base64);

        // Only update state once all files are processed
        if (newImagePreviews.length === files.length) {
          setImagePreviews(prev => [...prev, ...newImagePreviews]);
          setBase64Images(prev => [...prev, ...newBase64Images]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (hasError) {
      // Clear the file input if there was an error with any file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    setBase64Images(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAnalyseImage = async () => {
    if (base64Images.length === 0) {
      toast.error("Please upload at least one image first.");
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
        body: JSON.stringify({ base64Images }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyse images.');
      }

      const identifiedExercises = data.identifiedExercises;
      if (identifiedExercises && identifiedExercises.length > 0) {
        const firstExerciseDuplicateStatus = identifiedExercises[0].duplicate_status || 'none';
        onExerciseIdentified(identifiedExercises, firstExerciseDuplicateStatus);
      } else {
        toast.info("The AI couldn't identify any specific exercises from the uploaded images. Please try different angles or add them manually.");
      }

      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      console.error("Error analysing images:", err);
      toast.error("Image analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setImagePreviews([]);
    setBase64Images([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
              <Camera className="h-5 w-5" /> Analyse Gym Photos
            </DialogTitle>
            <DialogDescription className="text-sm">
              Upload photos of your gym equipment, and our AI will try to identify exercises.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto py-4 space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
            >
              {imagePreviews.length > 0 ? (
                <ScrollArea className="w-full h-full p-2">
                  <div className="flex flex-wrap justify-center gap-2">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border">
                        <img src={src} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6 rounded-full p-0"
                          onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center"> {/* Added text-center */}
                  <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, GIF (MAX. 5MB per image)</p>
                </div>
              )}
            </label>
            {imagePreviews.length > 0 && (
              <Button variant="outline" onClick={resetForm} className="w-full h-8 text-sm">
                <ImageOff className="h-4 w-4 mr-2" /> Remove All Images
              </Button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t"> {/* Made buttons responsive */}
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} size="sm" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAnalyseImage} disabled={base64Images.length === 0 || loading} size="sm" className="flex-1">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? "Analysing..." : `Analyse ${base64Images.length} Image(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LoadingOverlay
        isOpen={loading}
        title="Analysing Images"
        description="Please wait while the AI identifies equipment in your photos."
      />
    </>
  );
};