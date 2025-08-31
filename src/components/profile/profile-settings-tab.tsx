"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Form } from "@/components/ui/form";
import { LogOut } from 'lucide-react';
import { PersonalInfoForm } from './personal-info-form';
import { WorkoutPreferencesForm } from './workout-preferences-form';
import { ActiveTPathSection } from './active-t-path-section';
import { AICoachUsageSection } from './ai-coach-usage-section';
import { DataExportSection } from './data-export-section'; // Import the new component
import { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { Tables } from '@/types/supabase';

type TPath = Tables<'t_paths'>;

const profileSchema = z.object({
  full_name: z.string().min(1, "Your name is required."),
  height_cm: z.coerce.number().positive("Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().positive("Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().min(0, "Cannot be negative.").max(100, "Cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_session_length: z.string().optional().nullable(),
  preferred_muscles: z.array(z.string()).optional().nullable(),
});

interface ProfileSettingsTabProps {
  form: UseFormReturn<z.infer<typeof profileSchema>>;
  isEditing: boolean;
  mainMuscleGroups: string[];
  activeTPath: TPath | null;
  aiCoachUsageToday: number;
  AI_COACH_LIMIT_PER_SESSION: number;
  onTPathChange: () => void;
  onSignOut: () => void;
  onSubmit: (values: z.infer<typeof profileSchema>) => Promise<void>;
}

export const ProfileSettingsTab = ({
  form,
  isEditing,
  mainMuscleGroups,
  activeTPath,
  aiCoachUsageToday,
  AI_COACH_LIMIT_PER_SESSION,
  onTPathChange,
  onSignOut,
  onSubmit,
}: ProfileSettingsTabProps) => {
  return (
    <div className="mt-6 space-y-6 border-none p-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <PersonalInfoForm form={form} isEditing={isEditing} mainMuscleGroups={mainMuscleGroups} />
          <WorkoutPreferencesForm form={form} isEditing={isEditing} />
          <ActiveTPathSection activeTPath={activeTPath} isEditing={isEditing} onTPathChange={onTPathChange} />
          <AICoachUsageSection aiCoachUsageToday={aiCoachUsageToday} AI_COACH_LIMIT_PER_SESSION={AI_COACH_LIMIT_PER_SESSION} />
          <DataExportSection /> {/* Add the new DataExportSection here */}
        </form>
      </Form>
      
      <div className="flex justify-end mt-6">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
};