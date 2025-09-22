"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { FormProvider, UseFormReturn } from 'react-hook-form'; // Import FormProvider
import { LogOut } from 'lucide-react';
import { PersonalInfoForm } from './personal-info-form';
import { WorkoutPreferencesForm } from './workout-preferences-form';
import { ProgrammeTypeSection } from './programme-type-section';
import { AICoachUsageSection } from './ai-coach-usage-section';
import { DataExportSection } from './data-export-section';
import { GymManagementSection } from './gym-management-section';
import { Tables, Profile } from '@/types/supabase';
import { toast } from 'sonner'; // Import toast

type TPath = Tables<'t_paths'>;

interface ProfileSettingsTabProps {
  form: UseFormReturn<any>;
  mainMuscleGroups: string[];
  aiCoachUsageToday: number;
  AI_COACH_DAILY_LIMIT: number;
  onSignOut: () => void;
  profile: Profile | null;
  onDataChange: () => void;
  setIsSaving: (isSaving: boolean) => void; // NEW: Pass setIsSaving down
}

export const ProfileSettingsTab = ({
  form,
  mainMuscleGroups,
  aiCoachUsageToday,
  AI_COACH_DAILY_LIMIT,
  onSignOut,
  profile,
  onDataChange,
  setIsSaving, // NEW
}: ProfileSettingsTabProps) => {
  return (
    <div className="mt-6 space-y-6 border-none p-0">
      {/* Removed the <form> wrapper here, each section will manage its own submission */}
      <PersonalInfoForm 
        mainMuscleGroups={mainMuscleGroups} 
        onDataChange={onDataChange} 
        setIsSaving={setIsSaving} 
      />
      <WorkoutPreferencesForm 
        onDataChange={onDataChange} 
        setIsSaving={setIsSaving} 
      />
      <ProgrammeTypeSection 
        profile={profile} 
        onDataChange={onDataChange} 
        setIsSaving={setIsSaving} 
      />
      <GymManagementSection 
        profile={profile} 
        onDataChange={onDataChange} 
        setIsSaving={setIsSaving} 
      />
      <AICoachUsageSection aiCoachUsageToday={aiCoachUsageToday} AI_COACH_DAILY_LIMIT={AI_COACH_DAILY_LIMIT} />
      <DataExportSection />
      
      <div className="flex justify-end mt-6">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
};