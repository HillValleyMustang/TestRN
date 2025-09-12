"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, ImageOff, Sparkles, Check, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { LoadingOverlay } from "@/components/loading-overlay";
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface SelectedFile {
  id: string;
  file: File;
  previewUrl: string;
  base64: string | null;
  status: 'pending' | 'processing' | 'success' | 'error';
  identifiedExercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean; locationTag: string })[] | null;
  errorMessage: string | null;
}

interface AnalyseGymDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExercisesIdentified: (exercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean; locationTag: string })[]) => void;
  locationTag: string | null;
}

export const AnalyseGymDialog = ({ open, onOpenChange, onExercisesIdentified, locationTag }: AnalyseGymDialogProps) => {
  const { session } = useSession();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newFilesPromises = files.map(file => {
      return new Promise<SelectedFile | null>((resolve) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`File '${file.name}' is not an image.`);
          resolve(null);
          return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error(`File '${file.name}' exceeds 5MB limit.`);
          resolve(null);
          return;
        }

        const id = uuidv4();
        const previewUrl = URL.createObjectURL(file);
        const reader = new FileReader();

        reader.onloadend = () => {
          resolve({
            id,
            file,
            previewUrl,
            base64: (reader.result as string).split(',')[1],
            status: 'pending',
            identifiedExercises: null,
            errorMessage: null,
          });
        };
        reader.onerror = () => {
          toast.error(`Failed to read file '${file.name}'.`);
          URL.revokeObjectURL(previewUrl);
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    });

    const resolvedNewFiles = (await Promise.all(newFilesPromises)).filter(Boolean) as SelectedFile[];
    setSelectedFiles(prev => [...prev, ...resolvedNewFiles]);

    // Clear the input value to allow selecting the same file(s) again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === idToRemove);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl); // Clean up object URL
      }
      return prev.filter(file => file.id !== idToRemove);
    });
  };

  const handleProcessAllImages = async () => {
    if (!session) {
      toast.error("You must be logged in to use this feature.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Please upload at least one image first.");
      return;
    }
    if (selectedFiles.some(f => f.base64 === null)) {
      toast.error("Some images are still loading. Please wait or remove them.");
      return;
    }

    setIsProcessingAll(true);
    setCurrentProcessingIndex(0);
    const allIdentifiedExercises: (Partial<ExerciseDefinition> & { isDuplicate: boolean; locationTag: string })[] = [];
    
    // Create a mutable copy of selectedFiles to update within the loop
    const updatedFilesState: SelectedFile[] = selectedFiles.map(file => ({ ...file }));

    for (let i = 0; i < updatedFilesState.length; i++) {
      const fileToProcess = updatedFilesState[i];
      setCurrentProcessingIndex(i + 1);

      // Update the status in the mutable copy
      updatedFilesState[i].status = 'processing';
      updatedFilesState[i].errorMessage = null;
      // Trigger a re-render here to show the 'processing' status for the current file.
      // This is the only place setSelectedFiles is called inside the loop.
      setSelectedFiles([...updatedFilesState]); // Create a new array instance to trigger re-render

      try {
        const response = await fetch('/api/identify-equipment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ base64Image: fileToProcess.base64, locationTag }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to analyze image.');
        }

        if (data.identifiedExercises && Array.isArray(data.identifiedExercises)) {
          const exercisesWithLocationTag = data.identifiedExercises.map((ex: any) => ({
            ...ex,
            locationTag: locationTag || 'Unknown Gym', // Ensure locationTag is always present
          }));
          allIdentifiedExercises.push(...exercisesWithLocationTag);
          updatedFilesState[i].status = 'success';
          updatedFilesState[i].identifiedExercises = exercisesWithLocationTag;
        } else {
          updatedFilesState[i].status = 'success';
          updatedFilesState[i].identifiedExercises = [];
        }
      } catch (err: any) {
        console.error(`Error analyzing image ${fileToProcess.file.name}:`, err);
        updatedFilesState[i].status = 'error';
        updatedFilesState[i].errorMessage = err.message || 'Analysis failed.';
      }
    }

    // After the loop, ensure the final state is set (though individual updates should have covered it)
    setSelectedFiles(updatedFilesState);

    onExercisesIdentified(allIdentifiedExercises);
    onOpenChange(false); // Close this dialog after processing all
    resetForm();
  };

  const resetForm = useCallback(() => {
    selectedFiles.forEach(file => URL.revokeObjectURL(file.previewUrl)); // Clean up object URLs
    setSelectedFiles([]);
    setIsProcessingAll(false);
    setCurrentProcessingIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedFiles]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const canProcess = selectedFiles.length > 0 && !isProcessingAll && !selectedFiles.some(f => f.base64 === null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Analyse Gym Photo(s)
            </DialogTitle>
            <DialogDescription>
              Upload photos of your gym equipment, and our AI will try to identify exercises.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-hidden py-4 space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple // Allow multiple file selection
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-colors"
            >
              <Upload className="w-6 h-6 mb-1 text-muted-foreground" />
              <p className="mb-1 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">JPEG, PNG, GIF (MAX. 5MB per image)</p>
            </label>

            {selectedFiles.length > 0 && (
              <ScrollArea className="h-48 w-full rounded-md border p-2">
                <div className="grid grid-cols-3 gap-2">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="relative group">
                      <img src={file.previewUrl} alt="Preview" className="w-full h-24 object-cover rounded-md" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveFile(file.id)}
                        title="Remove image"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      {file.status === 'processing' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-md">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                      {file.status === 'success' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-green-500/50 text-white rounded-md">
                          <Check className="h-6 w-6" />
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/50 text-white rounded-md">
                          <AlertCircle className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessingAll}>
              Cancel
            </Button>
            <Button onClick={handleProcessAllImages} disabled={!canProcess}>
              {isProcessingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analysing {currentProcessingIndex} of {selectedFiles.length}...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyse Image{selectedFiles.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <LoadingOverlay
        isOpen={isProcessingAll}
        title="Analysing Image(s)"
        description={`Processing ${currentProcessingIndex} of ${selectedFiles.length} photos. Please wait.`}
      />
    </>
  );
};