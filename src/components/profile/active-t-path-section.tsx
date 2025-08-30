"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TPathSwitcher } from '@/components/t-path-switcher';
import { LayoutTemplate } from 'lucide-react';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';

type TPath = Tables<'t_paths'>;

interface ActiveTPathSectionProps {
  activeTPath: TPath | null;
  isEditing: boolean;
  onTPathChange: () => void; // Callback to refetch data after T-Path switch
}

export const ActiveTPathSection = ({ activeTPath, isEditing, onTPathChange }: ActiveTPathSectionProps) => {
  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-primary" /> Active T-Path
        </CardTitle>
        <CardDescription>
          Your Transformation Path is a pre-designed workout program tailored to your goals. Changing it here will regenerate your entire workout plan on the 'Workout' page, replacing your current set of exercises with a new one based on your preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {activeTPath && (
          <TPathSwitcher
            currentTPathId={activeTPath.id}
            onTPathChange={(newId) => {
              toast.info("T-Path changed! Refreshing data...");
              onTPathChange(); // Trigger parent to refetch data
            }}
            disabled={!isEditing}
          />
        )}
      </CardContent>
    </Card>
  );
};