"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Check, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [step, setStep] = useState<'capture' | 'confirm'>('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Add validation for video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error("Video dimensions are not available yet.");
        toast.error("Camera is not ready. Please try again in a moment.");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');

        // Add validation for the generated data URL
        if (!dataUrl || dataUrl === "data:,") {
          console.error("Failed to generate a valid data URL from canvas.");
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
              <div className="flex w-full justify-around items-center">
                <Button variant="outline" className="text-lg p-6" onClick={handleRetake}>
                  <RefreshCw className="h-5 w-5 mr-2" /> Retake
                </Button>
                <Button className="text-lg p-6 bg-primary" onClick={handleSave}>
                  <Check className="h-5 w-5 mr-2" /> Save Snapshot
                </Button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white bg-black/30 hover:bg-black/50 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};