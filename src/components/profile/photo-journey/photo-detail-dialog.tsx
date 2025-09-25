"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { Dumbbell } from 'lucide-react';

type ProgressPhoto = Tables<'progress_photos'>;

interface PhotoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photo: ProgressPhoto | null;
}

export const PhotoDetailDialog = ({ open, onOpenChange, photo }: PhotoDetailDialogProps) => {
  const { supabase } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && photo) {
      const fetchSignedUrl = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.storage
            .from('user-photos')
            .createSignedUrl(photo.photo_path, 60); // 60 seconds validity

          if (error) {
            throw error;
          }
          setImageUrl(data.signedUrl);
        } catch (error) {
          console.error("Error fetching signed URL for detail view:", error);
          toast.error("Could not load image detail.");
        } finally {
          setLoading(false);
        }
      };
      fetchSignedUrl();
    } else {
      // Reset when dialog closes or photo is null
      setImageUrl(null);
      setLoading(true);
    }
  }, [photo, open, supabase]);

  if (!photo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 border-0">
        <div className="relative aspect-square w-full bg-muted">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={photo.notes || 'Progress photo'} className="h-full w-full object-contain" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              Image not available
            </div>
          )}

          {photo.workouts_since_last_photo !== null && photo.workouts_since_last_photo > 0 && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm text-white p-3 rounded-lg flex items-center gap-2 animate-fade-in">
              <Dumbbell className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-semibold">
                {photo.workouts_since_last_photo} Workout(s) completed since your last snapshot.
              </p>
            </div>
          )}
        </div>
        <div className="p-4 pt-2">
          <p className="text-sm font-medium">{new Date(photo.created_at).toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{photo.notes || 'No notes'}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};