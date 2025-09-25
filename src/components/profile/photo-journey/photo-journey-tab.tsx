"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { PhotoCard } from './photo-card';

type ProgressPhoto = Tables<'progress_photos'>;

interface PhotoJourneyTabProps {
  photos: ProgressPhoto[];
  loading: boolean;
}

export const PhotoJourneyTab = ({ photos, loading }: PhotoJourneyTabProps) => {
  return (
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
    </div>
  );
};