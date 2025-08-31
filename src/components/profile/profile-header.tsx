"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react'; // Removed Save icon
import { useRouter } from 'next/navigation';

interface ProfileHeaderProps {
  isEditing: boolean; // Still receive isEditing to show current state
  onEditToggle: () => void; // Only a toggle function
}

export const ProfileHeader = ({ isEditing, onEditToggle }: ProfileHeaderProps) => {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between mb-6">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>
      <Button onClick={onEditToggle} disabled={isEditing}> {/* Disable if already editing */}
        <Edit className="h-4 w-4 mr-2" /> Edit
      </Button>
    </header>
  );
};