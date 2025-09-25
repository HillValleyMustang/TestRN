"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { PhotoCard } from './photo-card';
import { UploadPhotoDialog } from './upload-photo-dialog';

type ProgressPhoto = Tables<'progress_photos'>;

export const PhotoJourneyTab = () => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/photos');
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error("Error fetching photos:", error);
      toast.error("Could not load your photos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return (
    <>
      <div className="relative mt-6 border-none p-0">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">My Progress Journey</h1>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <p>You haven't uploaded any progress photos yet.</p>
            <p>Click the camera button to start your journey!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map(photo => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        )}

        <Button
          size="icon"
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 h-14 w-14 rounded-full shadow-lg z-20"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          <Camera className="h-6 w-6" />
          <span className="sr-only">Upload Photo</span>
        </Button>
      </div>

      <UploadPhotoDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadSuccess={fetchPhotos}
      />
    </>
  );
};