"use client";

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useSession } from '@/components/session-context-provider';

interface AddPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export const AddPhotoDialog = ({ open, onOpenChange, onUploadSuccess }: AddPhotoDialogProps) => {
  const { session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size cannot exceed 5MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a photo to upload.");
      return;
    }
    if (!session) {
      toast.error("You must be logged in to upload photos.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('notes', notes);

    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Failed to upload photo.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Ignore if response is not JSON
        }
        throw new Error(errorMessage);
      }

      toast.success("Photo uploaded successfully!");
      onUploadSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a short delay for animation
    setTimeout(() => {
      setFile(null);
      setPreviewUrl(null);
      setNotes("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Progress Photo</DialogTitle>
          <DialogDescription>
            Upload a new photo to track your visual progress.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Photo</Label>
            <Input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
          </div>
          {previewUrl && (
            <div className="w-full aspect-square rounded-md overflow-hidden border flex items-center justify-center bg-muted">
              <img src={previewUrl} alt="Selected preview" className="w-full h-full object-cover" />
            </div>
          )}
          {!previewUrl && (
            <div className="w-full aspect-square rounded-md border border-dashed flex items-center justify-center bg-muted">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" placeholder="e.g., Morning check-in, feeling strong!" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
            {isUploading ? "Uploading..." : "Upload Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};