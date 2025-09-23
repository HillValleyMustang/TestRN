"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LayoutTemplate, Edit, Save, Loader2 } from 'lucide-react'; // Added Edit, Save, Loader2
import { Tables, Profile } from '@/types/supabase';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { LoadingOverlay } from '../loading-overlay';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFormContext } from 'react-hook-form'; // Import useFormContext
import { Button } from '@/components/ui/button'; // Import Button

interface ProgrammeTypeSectionProps {
  profile: Profile | null;
  onDataChange: () => void;
  setIsSaving: (isSaving: boolean) => void;
}

export const ProgrammeTypeSection = ({ profile, onDataChange, setIsSaving }: ProgrammeTypeSectionProps) => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [isEditing, setIsEditing] = useState(false); // Local editing state
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [pendingProgrammeType, setPendingProgrammeType] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false); // Local state for regeneration loading
  const form = useFormContext(); // Use context

  const currentProgrammeType = profile?.programme_type || '';

  const handleValueChange = (newType: string) => {
    // Only trigger the warning if the value actually changes
    if (newType !== currentProgrammeType) {
      setPendingProgrammeType(newType);
      setIsWarningOpen(true);
    }
  };

  const confirmChange = async () => {
    if (!memoizedSessionUserId || !pendingProgrammeType) { // Use memoized ID
      console.error("Error: Session or pending programme type missing for confirmation.");
      toast.error("Cannot confirm change: session or programme type missing.");
      return;
    }
    setIsWarningOpen(false);
    setIsRegenerating(true); // Set local regenerating state
    setIsSaving(true); // Set global saving state

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ programme_type: pendingProgrammeType })
        .eq('id', memoizedSessionUserId); // Use memoized ID
      if (profileError) throw profileError;

      // Call the new API route to regenerate all plans
      const response = await fetch('/api/regenerate-all-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`, // Use session?.access_token
        },
        body: JSON.stringify({}), // No body needed
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start plan regeneration.");
      }

      toast.success("Programme type updated! Your workout plans are regenerating in the background.");
      onDataChange();
      setIsEditing(false); // Exit editing mode
    } catch (err: any) {
      console.error("Failed to update programme type and regenerate plans:", err);
      toast.error("Failed to update programme type.");
    } finally {
      setIsRegenerating(false); // Clear local regenerating state
      setIsSaving(false); // Clear global saving state
      setPendingProgrammeType(null);
    }
  };

  const cancelChange = () => {
    setIsWarningOpen(false);
    setPendingProgrammeType(null);
    form.setValue('programme_type', currentProgrammeType); // Revert form value
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between"> {/* Adjusted for buttons */}
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Core Programme Type
          </CardTitle>
          {isEditing ? (
            <Button onClick={form.handleSubmit(() => handleValueChange(form.getValues().programme_type))} size="sm" disabled={form.formState.isSubmitting || isRegenerating}>
              {form.formState.isSubmitting || isRegenerating ? (
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
        <CardDescription className="px-6 pb-4 text-sm text-muted-foreground">
          Changing your programme type (or T-Path as we call it) will delete and regenerate the workout plans for ALL of your gyms to match the new structure. You can add in your saved exercises and those associated to your gym in the Management page.
        </CardDescription>
        <CardContent className="pt-6">
          <FormField
            control={form.control}
            name="programme_type"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // The actual save/warning logic is now tied to the Save button
                  }}
                  value={field.value || ''}
                  disabled={!isEditing || isRegenerating}
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
        isOpen={isRegenerating} // Use local state for this overlay
        title="Updating Programme" 
        description="Please wait while we regenerate all your workout plans..." 
      />
    </>
  );
};