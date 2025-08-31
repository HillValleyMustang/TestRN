"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: () => void;
}

export const ProfileHeader = ({ isEditing, onEditToggle, onSave }: ProfileHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <Button onClick={() => isEditing ? onSave() : onEditToggle()} variant={isEditing ? "default" : "outline"}>
        {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit className="h-4 w-4 mr-2" /> Edit</>}
      </Button>
    </header>
  );
};