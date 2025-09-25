"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UploadPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
  initialFile?: File | null;
}

export const UploadPhotoDialog = ({ open, onOpenChange, onUploadSuccess, initialFile }: UploadPhotoDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && initialFile) {
      setFile(initialFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(initialFile);
    } else if (!open) {
      // Reset when dialog closes
      setFile(null);
      setPreview(null);
      setNotes('');
    }
  }, [open, initialFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("File size cannot exceed 5MB.");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleClose = () => {
    setFile(null);
    setNotes('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a photo to upload.");
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('notes', notes);

    try {
      const response = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      toast.success("Photo uploaded successfully!");
      onUploadSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => { if (loading) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (loading) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Upload New Progress Photo</DialogTitle>
          <DialogDescription>
            Add a new photo to your journey. You can add notes to track your progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialFile && (
            <div>
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} required disabled={loading} />
            </div>
          )}
          {preview && (
            <div className="mt-4">
              <img src={preview} alt="Preview" className="max-h-48 w-auto rounded-md mx-auto" />
            </div>
          )}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Morning weight: 75kg" disabled={loading} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={!file || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};