"use client";

import React, { useState } from 'react';
import { Loader2, GitCompareArrows } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { PhotoCard } from './photo-card';
import { PhotoDetailDialog } from './photo-detail-dialog';
import { Button } from '@/components/ui/button';

type ProgressPhoto = Tables<'progress_photos'>;

interface PhotoJourneyTabProps {
  photos: ProgressPhoto[];
  loading: boolean;
}

export const PhotoJourneyTab = ({ photos, loading }: PhotoJourneyTabProps) => {
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handlePhotoClick = (photo: ProgressPhoto) => {
    setSelectedPhoto(photo);
    setIsDetailOpen(true);
  };

  return (
    <>
      <div className="relative mt-6 border-none p-0">
        <header className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold">My Progress Journey</h1>
          </div>
          <Button variant="outline" disabled={photos.length < 2}>
            <GitCompareArrows className="h-4 w-4 mr-2" />
            Compare Photos
          </Button>
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
              <div key={photo.id} onClick={() => handlePhotoClick(photo)} className="cursor-pointer">
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>
        )}
      </div>
      <PhotoDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        photo={selectedPhoto}
        totalPhotos={photos.length}
      />
    </>
  );
};