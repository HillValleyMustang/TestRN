"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  title?: string;
  description?: string;
}

export const LoadingOverlay = ({ isOpen, title = "Processing...", description = "Please wait while we update your data." }: LoadingOverlayProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-sm flex flex-col items-center justify-center text-center p-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};