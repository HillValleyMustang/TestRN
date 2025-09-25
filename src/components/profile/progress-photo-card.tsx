"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Trash2, ImageOff } from "lucide-react";
import { Tables } from '@/types/supabase';
import { useSession } from '@/components/session-context-provider';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProgressPhoto = Tables<'progress_photos'>;

interface ProgressPhotoCardProps {
  photo: ProgressPhoto;
  onDelete: (photoId: string) => void;
}

export const ProgressPhotoCard = ({ photo, onDelete }: ProgressPhotoCardProps) => {
  const { session } = useSession();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!session) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/photos/signed-url?path=${photo.photo_path}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to get signed URL.');
        }
        const data = await response.json();
        setImageUrl(data.signedUrl);
      } catch (error) {
        console.error("Error fetching signed URL:", error);
        toast.error("Could not load image.");
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [photo.photo_path, session]);

  const handleDelete = async () => {
    if (!session) {
      toast.error("You must be logged in.");
      return;
    }
    try {
      onDelete(photo.id);
    } catch (error: any) {
      toast.error(`Failed to delete photo: ${error.message}`);
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden group relative">
        <CardContent className="p-0">
          <div className="aspect-square w-full bg-muted flex items-center justify-center">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : imageUrl ? (
              <img src={imageUrl} alt={photo.notes || 'Progress photo'} className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-sm font-semibold">{new Date(photo.created_at!).toLocaleDateString()}</p>
            <p className="text-xs truncate">{photo.notes || 'No notes'}</p>
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your progress photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};