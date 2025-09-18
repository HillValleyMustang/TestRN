"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, LayoutTemplate, Dumbbell, User, Info } from "lucide-react";
import { Tables, FetchedExerciseDefinition } from '@/types/supabase';
import { cn, getWorkoutColorClass, getWorkoutIcon } from '@/lib/utils';
import { WorkoutBadge } from '../workout-badge';

type Profile = Tables<'profiles'>;
type TPath = Tables<'t_paths'>;

interface OnboardingSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summaryData: {
    profile: Profile;
    mainTPath: TPath;
    childWorkouts: (TPath & { exercises: (Tables<'exercise_definitions'> & { is_bonus_exercise: boolean })[] })[];
    identifiedExercises: Partial<FetchedExerciseDefinition>[];
    confirmedExerciseNames: Set<string>;
  } | null;
  onClose: () => void;
}

export const OnboardingSummaryModal = ({ open, onOpenChange, summaryData, onClose }: OnboardingSummaryModalProps) => {
  if (!summaryData) return null;

  const { profile, mainTPath, childWorkouts } = summaryData;

  const renderProfileSummary = () => (
    <div className="space-y-2 text-sm">
      <p><span className="font-semibold">Name:</span> {profile.full_name}</p>
      {profile.height_cm && <p><span className="font-semibold">Height:</span> {profile.height_cm} cm</p>}
      {profile.weight_kg && <p><span className="font-semibold">Weight:</span> {profile.weight_kg} kg</p>}
      {profile.body_fat_pct && <p><span className="font-semibold">Body Fat:</span> {profile.body_fat_pct}%</p>}
      {profile.primary_goal && <p><span className="font-semibold">Goal:</span> {profile.primary_goal.replace(/_/g, ' ')}</p>}
      {profile.preferred_muscles && profile.preferred_muscles.length > 0 && (
        <p><span className="font-semibold">Preferred Muscles:</span> {profile.preferred_muscles}</p>
      )}
      {profile.health_notes && <p><span className="font-semibold">Health Notes:</span> {profile.health_notes}</p>}
      {profile.preferred_session_length && <p><span className="font-semibold">Session Length:</span> {profile.preferred_session_length}</p>}
    </div>
  );

  const renderWorkoutPlanSummary = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your new Transformation Path, "<span className="font-semibold">{mainTPath.template_name}</span>", has been created with the following workouts:
      </p>
      {childWorkouts.map(workout => {
        const Icon = getWorkoutIcon(workout.template_name);
        const workoutColorClass = getWorkoutColorClass(workout.template_name, 'text');
        return (
          <div key={workout.id} className="border rounded-md p-3">
            <h4 className={cn("font-semibold text-lg flex items-center gap-2", workoutColorClass)}>
              {Icon && <Icon className="h-5 w-5" />} {workout.template_name}
            </h4>
            {workout.exercises.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                {workout.exercises.map(ex => (
                  <li key={ex.id} className="flex items-center gap-2">
                    <span>{ex.name}</span>
                    {ex.is_bonus_exercise && <WorkoutBadge workoutName="Bonus">Bonus</WorkoutBadge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No exercises assigned for this session length.</p>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle className="h-6 w-6 text-green-500" /> Your Plan is Ready!
          </DialogTitle>
          <DialogDescription>
            Here's a summary of your personalized setup.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto py-4 pr-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <User className="h-5 w-5" /> Your Profile
              </h3>
              {renderProfileSummary()}
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <LayoutTemplate className="h-5 w-5" /> Your Workout Plan
              </h3>
              {renderWorkoutPlanSummary()}
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                <Info className="h-5 w-5" /> How Your Plan Was Built
              </h3>
              <p className="text-sm text-muted-foreground">
                Your workout plan was generated based on your session length preference, prioritizing exercises from your confirmed gym equipment, then your custom exercises, and finally a selection of effective bodyweight and common gym exercises from our global library.
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Start Training</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};