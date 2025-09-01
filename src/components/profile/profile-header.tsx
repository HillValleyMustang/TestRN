"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save, Loader2 } from 'lucide-react'; // Import Loader2
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  isSaving: boolean; // New prop
}

export const ProfileHeader = ({ isEditing, onEditToggle, onSave, isSaving }: ProfileHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <Button onClick={() => isEditing ? onSave() : onEditToggle()} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
          </>
        ) : isEditing ? (
          <>
            <Save className="h-4 w-4 mr-2" /> Save
          </>
        ) : (
          <>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </>
        )}
      </Button>
    </header>
  );
};