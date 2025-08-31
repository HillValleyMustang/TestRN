"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
  isEditing: boolean;
  onToggleEditSave: () => void; // Single prop for toggling edit/save
}

export const ProfileHeader = ({ isEditing, onToggleEditSave }: ProfileHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <Button onClick={onToggleEditSave}>
        {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit className="h-4 w-4 mr-2" /> Edit</>}
      </Button>
    </header>
  );
};