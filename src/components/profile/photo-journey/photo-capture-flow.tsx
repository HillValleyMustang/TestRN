"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Check, RefreshCw, X, Ghost, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/components/session-context-provider';

interface PhotoCaptureFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoCaptured: (file: File) => void;
}

// Helper function to convert data URL to File
function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid data URL");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

export const PhotoCaptureFlow = ({ open, onOpenChange, onPhotoCaptured }: PhotoCaptureFlowProps) => {
  const { session, supabase } = useSession();
  const [step, setStep] = useState<'capture' | 'confirm'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPoseGhostVisible, setIsPoseGhostVisible] = useState(false);
  const [ghostImageUrl, setGhostImageUrl] = useState<string | null>(null);
  const [loadingGhost, setLoadingGhost] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer rear camera
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera. Please check permissions.");
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setStep('capture');
      setCapturedImage(null);
      setIsPoseGhostVisible(false);
      setGhostImageUrl(null);
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        toast.error("Camera is not ready. Please try again in a moment.");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');

        if (!dataUrl || dataUrl === "data:,") {
          toast.error("Could not capture photo. Please try again.");
          return;
        }

        setCapturedImage(dataUrl);
        setStep('confirm');
        stopCamera();
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setStep('capture');
    startCamera();
  };

  const handleSave = () => {
    if (capturedImage) {
      const file = dataURLtoFile(capturedImage, `progress-photo-${Date.now()}.jpg`);
      onPhotoCaptured(file);
      onOpenChange(false);
    }
  };

  const togglePoseGhost = async () => {
    const turningOn = !isPoseGhostVisible;
    setIsPoseGhostVisible(turningOn);

    if (turningOn) {
      setLoadingGhost(true);
      try {
        if (!session?.user.id) {
          toast.error("You must be logged in to use this feature.");
          setIsPoseGhostVisible(false);
          return;
        }

        const { data: latestPhoto, error: fetchError } = await supabase
          .from('progress_photos')
          .select('photo_path')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            toast.info("No previous photo found to use as a ghost.");
            setIsPoseGhostVisible(false);
            return;
          }
          throw fetchError;
        }

        if (!latestPhoto) {
          toast.info("No previous photo found to use as a ghost.");
          setIsPoseGhostVisible(false);
          return;
        }

        const { data: urlData, error: urlError } = await supabase.storage
          .from('user-photos')
          .createSignedUrl(latestPhoto.photo_path, 60);

        if (urlError) throw urlError;
        setGhostImageUrl(urlData.signedUrl);

      } catch (error: any) {
        console.error("Error fetching pose ghost image:", error);
        toast.error("Could not load your last photo for the ghost overlay.");
        setIsPoseGhostVisible(false);
      } finally {
        setLoadingGhost(false);
      }
    } else {
      setGhostImageUrl(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 m-0 w-screen h-screen max-w-full max-h-full bg-black border-0 rounded-none flex items-center justify-center">
        <div className="relative w-full h-full">
          {step === 'capture' && (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          )}
          {step === 'confirm' && capturedImage && (
            <img src={capturedImage} alt="Captured progress" className="w-full h-full object-contain" />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Pose Ghost Overlay */}
          {isPoseGhostVisible && ghostImageUrl && step === 'capture' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img src={ghostImageUrl} alt="Pose ghost" className="w-full h-full object-contain opacity-30" />
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent flex justify-center items-center">
            {step === 'capture' && (
              <Button
                size="icon"
                className="w-20 h-20 rounded-full border-4 border-white bg-white/30 hover:bg-white/50"
                onClick={handleCapture}
              >
                <Camera className="h-10 w-10 text-white" />
              </Button>
            )}
            {step === 'confirm' && (
              <div className="flex w-full justify-between items-center gap-4">
                <Button variant="outline" className="text-base p-4 flex-1" onClick={handleRetake}>
                  <RefreshCw className="h-5 w-5 mr-2" /> Retake
                </Button>
                <Button className="text-base p-4 bg-primary flex-1" onClick={handleSave}>
                  <Check className="h-5 w-5 mr-2" /> Save Snapshot
                </Button>
              </div>
            )}
          </div>
          
          {/* Top-right controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {step === 'capture' && (
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-black/30 hover:bg-black/50 hover:text-white"
                onClick={togglePoseGhost}
                title="Toggle Pose Ghost"
                disabled={loadingGhost}
              >
                {loadingGhost ? <Loader2 className="h-6 w-6 animate-spin" /> : <Ghost className="h-6 w-6" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/30 hover:bg-black/50 hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};