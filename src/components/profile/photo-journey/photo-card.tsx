"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';

type ProgressPhoto = Tables<'progress_photos'>;

interface PhotoCardProps {
  photo: ProgressPhoto;
}

export const PhotoCard = ({ photo }: PhotoCardProps) => {
  const { supabase } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        console.error("Error fetching signed URL:", error);
        toast.error("Could not load image.");
      } finally {
        setLoading(false);
      }
    };

    if (supabase) {
      fetchSignedUrl();
    }
  }, [photo.photo_path, supabase]);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-square w-full bg-muted">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={photo.notes || 'Progress photo'} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              Image not available
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-sm font-medium">{new Date(photo.created_at).toLocaleDateString()}</p>
          <p className="text-sm text-muted-foreground">{photo.notes || 'No notes'}</p>
        </div>
      </CardContent>
    </Card>
  );
};