"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScrollPosition } from '@/hooks/use-scroll-position';

interface FloatingSaveEditButtonProps {
  isEditing: boolean;
  onSave: () => void;
  isSaving: boolean;
}

export const FloatingSaveEditButton = ({ isEditing, onSave, isSaving }: FloatingSaveEditButtonProps) => {
  const isScrolled = useScrollPosition();

  if (!isEditing) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out",
        isScrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <Button onClick={onSave} disabled={isSaving} size="lg" className="shadow-lg">
        {isSaving ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="h-5 w-5 mr-2" /> Save Edits
          </>
        )}
      </Button>
    </div>
  );
};