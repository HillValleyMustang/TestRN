"use client";

import React from 'react';
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  title?: string;
  description?: string;
}

export const LoadingOverlay = ({ isOpen, title = "Processing...", description = "Please wait while we update your data." }: LoadingOverlayProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
      <div className="max-w-sm flex flex-col items-center justify-center text-center p-8 bg-card rounded-lg shadow-lg">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};