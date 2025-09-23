"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Image } from 'lucide-react';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';

type BodyFatReferenceImage = Tables<'body_fat_reference_images'>;

interface BodyFatInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BodyFatInfoModal = ({ open, onOpenChange }: BodyFatInfoModalProps) => {
  const { supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [referenceImages, setReferenceImages] = useState<BodyFatReferenceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferenceImages = async () => {
      if (!open) return;
      if (!memoizedSessionUserId) { // Ensure user is logged in
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('body_fat_reference_images')
          .select('*')
          .order('percentage', { ascending: true });

        if (error) throw error;
        setReferenceImages(data || []);
      } catch (err: any) {
        console.error("Failed to fetch body fat reference images:", err);
        setError(err.message || "Failed to load body fat reference images.");
        toast.error(err.message || "Failed to load body fat reference images."); // Changed to toast.error
      } finally {
        setLoading(false);
      }
    };

    fetchReferenceImages();
  }, [open, supabase, memoizedSessionUserId]); // Depend on memoized ID

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> Body Fat % Reference
          </DialogTitle>
          <DialogDescription>
            Visual guide to help estimate body fat percentages.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto py-4 pr-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading images...</p>
          ) : error ? (
            <p className="text-destructive text-center">Error: {error}</p>
          ) : referenceImages.length === 0 ? (
            <p className="text-center text-muted-foreground">No reference images available.</p>
          ) : (
            <div className="space-y-6">
              {referenceImages.map((ref) => (
                <div key={ref.id} className="flex flex-col items-center text-center">
                  <h3 className="text-xl font-bold mb-2">{ref.percentage}% Body Fat</h3>
                  {ref.image_url ? (
                    <img
                      src={ref.image_url}
                      alt={`${ref.percentage}% Body Fat`}
                      className="w-full max-w-xs rounded-lg shadow-md object-cover mb-3"
                      style={{ aspectRatio: '1/1' }} // Ensure square aspect ratio
                    />
                  ) : (
                    <div className="w-full max-w-xs h-48 bg-muted flex items-center justify-center rounded-lg mb-3">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {ref.description && (
                    <p className="text-sm text-muted-foreground">{ref.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};