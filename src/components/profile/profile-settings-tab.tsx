"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Form } from "@/components/ui/form";
import { LogOut } from 'lucide-react';
import { PersonalInfoForm } from './personal-info-form';
import { WorkoutPreferencesForm } from './workout-preferences-form';
import { ProgrammeTypeSection } from './programme-type-section';
import { AICoachUsageSection } from './ai-coach-usage-section';
import { DataExportSection } from './data-export-section';
import { GymManagementSection } from './gym-management-section';
import { UseFormReturn } from 'react-hook-form';
import *as z from 'zod';
import { Tables, Profile } from '@/types/supabase';

type TPath = Tables<'t_paths'>;

interface ProfileSettingsTabProps {
  form: UseFormReturn<any>;
  isEditing: boolean;
  mainMuscleGroups: string[];
  aiCoachUsageToday: number;
  AI_COACH_DAILY_LIMIT: number;
  onSignOut: () => void;
  onSubmit: (values: any) => Promise<void>;
  profile: Profile | null;
  onDataChange: () => void;
}

export const ProfileSettingsTab = ({
  form,
  isEditing,
  mainMuscleGroups,
  aiCoachUsageToday,
  AI_COACH_DAILY_LIMIT,
  onSignOut,
  onSubmit,
  profile,
  onDataChange,
}: ProfileSettingsTabProps) => {
  return (
    <div className="mt-6 space-y-6 border-none p-0">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PersonalInfoForm form={form} isEditing={isEditing} mainMuscleGroups={mainMuscleGroups} />
        <WorkoutPreferencesForm form={form} isEditing={isEditing} />
        <ProgrammeTypeSection form={form} profile={profile} isEditing={isEditing} onDataChange={onDataChange} />
        <GymManagementSection isEditing={isEditing} profile={profile} onDataChange={onDataChange} />
        <AICoachUsageSection aiCoachUsageToday={aiCoachUsageToday} AI_COACH_DAILY_LIMIT={AI_COACH_DAILY_LIMIT} />
        <DataExportSection />
      </form>
      
      <div className="flex justify-end mt-6">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
};