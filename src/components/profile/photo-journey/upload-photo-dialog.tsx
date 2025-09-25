"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';

interface UploadPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
  initialFile?: File | null;
}

export const UploadPhotoDialog = ({ open, onOpenChange, onUploadSuccess, initialFile }: UploadPhotoDialogProps) => {
  const { session, supabase } = useSession();
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
    if (!session?.user) {
      toast.error("You must be logged in to upload photos.");
      return;
    }
    setLoading(true);

    try {
      // 1. Find the timestamp of the user's most recent photo
      const { data: lastPhoto, error: lastPhotoError } = await supabase
        .from('progress_photos')
        .select('created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastPhotoError && lastPhotoError.code !== 'PGRST116') { // Ignore 'not found' error
        throw lastPhotoError;
      }

      // 2. If a previous photo exists, count workouts since then
      let workoutsSinceLastPhoto: number | null = null;
      if (lastPhoto) {
        const { count, error: countError } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null)
          .gt('completed_at', lastPhoto.created_at);

        if (countError) {
          throw countError;
        }
        workoutsSinceLastPhoto = count;
      }

      const timestamp = Date.now();
      const filePath = `${session.user.id}/${timestamp}-${file.name}`;

      // 3. Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 4. Insert record into database with the new count
      const { error: insertError } = await supabase
        .from('progress_photos')
        .insert({
          user_id: session.user.id,
          photo_path: uploadData.path,
          notes: notes,
          workouts_since_last_photo: workoutsSinceLastPhoto,
        });

      if (insertError) {
        // If DB insert fails, try to remove the orphaned file from storage
        await supabase.storage.from('user-photos').remove([filePath]);
        throw insertError;
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