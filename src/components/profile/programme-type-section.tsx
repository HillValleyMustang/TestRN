"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LayoutTemplate } from 'lucide-react';
import { Tables, Profile } from '@/types/supabase';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { LoadingOverlay } from '../loading-overlay';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFormContext } from 'react-hook-form'; // Import useFormContext

interface ProgrammeTypeSectionProps {
  isEditing: boolean;
  onDataChange: () => void;
  profile: Profile | null;
}

export const ProgrammeTypeSection = ({ isEditing, onDataChange, profile }: ProgrammeTypeSectionProps) => {
  const { session, supabase } = useSession();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingProgrammeType, setPendingProgrammeType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const form = useFormContext(); // Use context

  const currentProgrammeType = profile?.programme_type || '';

  const handleValueChange = (newType: string) => {
    // Only trigger the warning if in edit mode and the value actually changes
    if (isEditing && newType !== currentProgrammeType) {
      setPendingProgrammeType(newType);
      setIsWarningOpen(true);
    }
  };

  const confirmChange = async () => {
    if (!session || !pendingProgrammeType) return;
    setIsSaving(true);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ programme_type: pendingProgrammeType })
        .eq('id', session.user.id);
      if (profileError) throw profileError;

      // Call the new API route to regenerate all plans
      const response = await fetch('/api/regenerate-all-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}), // No body needed
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start plan regeneration.");
      }

      toast.success("Programme type updated! Your workout plans are regenerating in the background.");
      form.setValue('programme_type', pendingProgrammeType, { shouldDirty: true }); // Update form state
      onDataChange();
    } catch (err: any) {
      console.error("Failed to update programme type and regenerate plans:", err);
      toast.error("Failed to update programme type.");
      form.setValue('programme_type', currentProgrammeType); // Revert on error
    } finally {
      setIsSaving(false);
      setPendingProgrammeType(null);
    }
  };

  const cancelChange = () => {
    setIsWarningOpen(false);
    setPendingProgrammeType(null);
    form.setValue('programme_type', currentProgrammeType);
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Core Programme Type
          </CardTitle>
          <CardDescription>
            This is your fitness progamme (or Transformation Path as we call it). Changing this will reset and regenerate the workout plans for ALL your gyms to match the new structure. You can always manage the gyms, workouts and/or exercises later.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <FormField
            control={form.control}
            name="programme_type"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    handleValueChange(value);
                  }}
                  value={field.value || ''}
                  disabled={!isEditing || isSaving}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your programme type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ulul">4-Day Upper/Lower</SelectItem>
                    <SelectItem value="ppl">3-Day Push/Pull/Legs</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Programme Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your programme type? This action cannot be undone. It will permanently delete and regenerate the workout plans for ALL of your gyms to match the new structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirm & Reset All Plans</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LoadingOverlay 
        isOpen={isSaving} 
        title="Updating Programme" 
        description="Please wait while we regenerate all your workout plans..." 
      />
    </>
  );
};