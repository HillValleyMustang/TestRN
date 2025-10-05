"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';
import { Loader2, Lightbulb, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

type ProgressPhoto = Tables<'progress_photos'>;

interface PhotoComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourcePhoto: ProgressPhoto | null;
}

const proTips = [
  'Progress isn\'t always linear! Factors like water retention can affect daily photos. Stay consistent!',
  'Different lighting can change how a photo looks. For best results, try to use the same spot each time.',
  'Notice a difference in angle? Try using the Pose Ghost next time for a perfect match.'
];

export const PhotoComparisonDialog = ({ open, onOpenChange, sourcePhoto }: PhotoComparisonDialogProps) => {
  const { session, supabase } = useSession();
  const [comparisonPhoto, setComparisonPhoto] = useState<ProgressPhoto | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [comparisonImageUrl, setComparisonImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sliderValue, setSliderValue] = useState(50);
  const [tip, setTip] = useState<string | null>(null);
  const [isTipVisible, setIsTipVisible] = useState(true);

  useEffect(() => {
    if (!open || !sourcePhoto) {
      setComparisonPhoto(null);
      setSourceImageUrl(null);
      setComparisonImageUrl(null);
      setLoading(true);
      return;
    }

    const randomTip = proTips[Math.floor(Math.random() * proTips.length)];
    setTip(randomTip);
    setIsTipVisible(true);

    const fetchComparisonData = async () => {
      setLoading(true);
      try {
        const { data: sourceUrlData, error: sourceUrlError } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(sourcePhoto.photo_path, 60);
        if (sourceUrlError) throw sourceUrlError;
        setSourceImageUrl(sourceUrlData.signedUrl);

        const response = await fetch('/api/photos/find-matching-pose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ source_photo_id: sourcePhoto.id }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to find matching photo.');
        }
        
        const matchedPhoto = data.matchedPhoto as ProgressPhoto;
        setComparisonPhoto(matchedPhoto);

        const { data: comparisonUrlData, error: comparisonUrlError } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(matchedPhoto.photo_path, 60);
        if (comparisonUrlError) throw comparisonUrlError;
        setComparisonImageUrl(comparisonUrlData.signedUrl);

      } catch (error: any) {
        console.error("Error in comparison dialog:", error);
        toast.error(error.message || "Could not load comparison photos.");
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [open, sourcePhoto, supabase, session]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare Progress</DialogTitle>
          <DialogDescription>
            Use the slider to fade between your photos for a precise comparison.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex items-center justify-center">
          <div className="relative w-full max-w-lg aspect-square">
            {loading ? (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted rounded-md">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {comparisonImageUrl && (
                  <img src={comparisonImageUrl} alt="Comparison photo" className="absolute inset-0 w-full h-full object-contain rounded-md" />
                )}
                {sourceImageUrl && (
                  <img
                    src={sourceImageUrl}
                    alt="Source photo"
                    className="absolute inset-0 w-full h-full object-contain rounded-md transition-opacity duration-100"
                    style={{ opacity: sliderValue / 100 }}
                  />
                )}
              </>
            )}
          </div>
        </div>
        <div className="px-4 pb-4 space-y-4">
          {isTipVisible && tip && (
            <Alert className="relative pr-10">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Pro Tip</AlertTitle>
              <AlertDescription>{tip}</AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setIsTipVisible(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}
          <div>
            <Slider
              value={[sliderValue]}
              onValueChange={(value) => setSliderValue(value[0])}
              max={100}
              step={1}
              disabled={loading}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{comparisonPhoto ? new Date(comparisonPhoto.created_at).toLocaleDateString() : 'Older'}</span>
              <span>{sourcePhoto ? new Date(sourcePhoto.created_at).toLocaleDateString() : 'Newer'}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};