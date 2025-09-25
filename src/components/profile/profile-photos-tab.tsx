"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, ImageOff } from "lucide-react";
import { Tables } from '@/types/supabase';
import { useSession } from '@/components/session-context-provider';
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AddPhotoDialog } from './add-photo-dialog';
import { ProgressPhotoCard } from './progress-photo-card';

type ProgressPhoto = Tables<'progress_photos'>;

export const ProfilePhotosTab = () => {
  const { session } = useSession();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPhotoDialogOpen, setIsAddPhotoDialogOpen] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch('/api/photos', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        let errorMessage = 'Failed to fetch photos.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
          console.error("Non-JSON error response from /api/photos:", errorText);
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setPhotos(data);
    } catch (error: any) {
      console.error("Error fetching photos:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDeletePhoto = async (photoId: string) => {
    const originalPhotos = photos;
    setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photoId));

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      if (!response.ok) {
        let errorMessage = 'Failed to delete photo.';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }
        throw new Error(errorMessage);
      }
      toast.success("Photo deleted successfully.");
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      toast.error(error.message);
      setPhotos(originalPhotos);
    }
  };

  return (
    <>
      <div className="mt-6 space-y-6 border-none p-0 relative">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg">
            <ImageOff className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No Photos Yet</h3>
            <p className="text-muted-foreground mt-2">Start your journey by adding your first progress photo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map(photo => (
              <ProgressPhotoCard key={photo.id} photo={photo} onDelete={handleDeletePhoto} />
            ))}
          </div>
        )}

        <Button
          className="fixed bottom-24 right-4 sm:bottom-8 sm:right-8 h-14 w-14 rounded-full shadow-lg z-20"
          onClick={() => setIsAddPhotoDialogOpen(true)}
        >
          <Camera className="h-6 w-6" />
          <span className="sr-only">Add Photo</span>
        </Button>
      </div>

      <AddPhotoDialog
        open={isAddPhotoDialogOpen}
        onOpenChange={setIsAddPhotoDialogOpen}
        onUploadSuccess={fetchPhotos}
      />
    </>
  );
};