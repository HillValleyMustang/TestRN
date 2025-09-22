"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dumbbell, Edit, Save, Loader2 } from 'lucide-react'; // Added Edit, Save, Loader2
import { useFormContext } from 'react-hook-form'; // Import useFormContext
import { toast } from 'sonner'; // Import toast
import { Button } from '@/components/ui/button'; // Import Button
import { useSession } from '@/components/session-context-provider'; // Import useSession
import { ProfileUpdate } from '@/types/supabase'; // Import ProfileUpdate
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher'; // Import useWorkoutDataFetcher

interface WorkoutPreferencesFormProps {
  onDataChange: () => void;
  setIsSaving: (isSaving: boolean) => void;
}

export const WorkoutPreferencesForm = ({ onDataChange, setIsSaving }: WorkoutPreferencesFormProps) => {
  const [isEditing, setIsEditing] = useState(false); // Local editing state
  const form = useFormContext(); // Use context
  const { session, supabase } = useSession();
  const { profile } = useWorkoutDataFetcher(); // Get profile to check active_t_path_id

  const handleSave = async () => {
    if (!session || !profile) {
      toast.error("Cannot save preferences: session or profile data missing.");
      return;
    }

    setIsSaving(true); // Set global saving state
    try {
      const values = form.getValues(); // Get current form values

      const updateData: ProfileUpdate = {
        primary_goal: values.primary_goal,
        preferred_session_length: values.preferred_session_length,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
      if (error) {
        console.error("Failed to update workout preferences:", error);
        toast.error("Failed to update workout preferences.");
        return;
      }
      toast.success("Workout preferences updated successfully!");
      onDataChange(); // Refresh parent data

      // Always trigger plan regeneration if an active T-Path exists and session length changed
      if (profile.active_t_path_id && form.formState.dirtyFields.preferred_session_length) {
        console.log(`[WorkoutPreferencesForm] Initiating workout plan update because session length changed. Active T-Path: ${profile.active_t_path_id}.`);
        try {
          const response = await fetch(`/api/generate-t-path`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ 
              tPathId: profile.active_t_path_id,
              preferred_session_length: values.preferred_session_length // Use the value from the form
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[WorkoutPreferencesForm] Failed to initiate T-Path workout regeneration API:", errorText);
            throw new Error(`Failed to initiate T-Path workout regeneration: ${errorText}`);
          }
          console.log("[WorkoutPreferencesForm] Successfully initiated T-Path workout regeneration API call.");
        } catch (err: any) {
          console.error("[WorkoutPreferencesForm] Error initiating workout plan update:", err);
          toast.error("Error initiating workout plan update.");
        }
      }

      setIsEditing(false); // Exit editing mode
    } catch (error: any) {
      console.error("Error saving workout preferences:", error);
      toast.error("Error saving workout preferences.");
    } finally {
      setIsSaving(false); // Clear global saving state
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between"> {/* Adjusted for buttons */}
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" /> Workout Preferences
        </CardTitle>
        {isEditing ? (
          <Button onClick={form.handleSubmit(handleSave)} size="sm" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        ) : (
          <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <FormField control={form.control} name="primary_goal" render={({ field }) => (
          <FormItem>
            <FormLabel>Primary Goal</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!isEditing}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select your goal" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="fat_loss">Fat Loss</SelectItem>
                <SelectItem value="strength_increase">Strength Increase</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="preferred_session_length" render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Session Length</FormLabel>
            <Select onValueChange={(value) => {
              form.setValue(field.name, value, { shouldDirty: true }); // Force dirty state
            }} value={field.value || ''} disabled={!isEditing}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="15-30">15-30 mins</SelectItem>
                <SelectItem value="30-45">30-45 mins</SelectItem>
                <SelectItem value="45-60">45-60 mins</SelectItem>
                <SelectItem value="60-90">60-90 mins</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
};