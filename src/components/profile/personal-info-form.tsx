"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { User, ChevronDown, X, Info, Edit, Save, Loader2 } from 'lucide-react'; // Added Edit, Save, Loader2
import { cn } from '@/lib/utils';
import { useFormContext } from 'react-hook-form'; // Import useFormContext
import { BodyFatInfoModal } from '../onboarding/body-fat-info-modal';
import { toast } from 'sonner'; // Import toast
import { useSession } from '@/components/session-context-provider'; // Import useSession
import { ProfileUpdate } from '@/types/supabase'; // Import ProfileUpdate
import { useWorkoutDataFetcher } from '@/hooks/use-workout-data-fetcher'; // Import useWorkoutDataFetcher

interface PersonalInfoFormProps {
  mainMuscleGroups: string[];
  onDataChange: () => void;
  setIsSaving: (isSaving: boolean) => void;
}

export const PersonalInfoForm = ({ mainMuscleGroups, onDataChange, setIsSaving }: PersonalInfoFormProps) => {
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Local editing state
  const form = useFormContext(); // Use context
  const { session, supabase } = useSession();
  const { profile } = useWorkoutDataFetcher(); // Get profile to check active_t_path_id

  const handleSave = async () => {
    if (!session || !profile) {
      toast.error("Cannot save profile: session or profile data missing.");
      return;
    }

    setIsSaving(true); // Set global saving state
    try {
      const values = form.getValues(); // Get current form values

      const nameParts = values.full_name.split(' ');
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ');

      const updateData: ProfileUpdate = {
        full_name: values.full_name,
        first_name: firstName,
        last_name: lastName,
        height_cm: values.height_cm,
        weight_kg: values.weight_kg,
        body_fat_pct: values.body_fat_pct,
        preferred_muscles: values.preferred_muscles?.join(', ') || null,
        health_notes: values.health_notes,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('profiles').update(updateData).eq('id', session.user.id);
      if (error) {
        console.error("Failed to update personal info:", error);
        toast.error("Failed to update personal info.");
        return;
      }
      toast.success("Personal info updated successfully!");
      onDataChange(); // Refresh parent data
      setIsEditing(false); // Exit editing mode
    } catch (error: any) {
      console.error("Error saving personal info:", error);
      toast.error("Error saving personal info.");
    } finally {
      setIsSaving(false); // Clear global saving state
    }
  };

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between"> {/* Adjusted for buttons */}
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Info
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
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Preferred Name</FormLabel>
              <FormControl><Input {...field} disabled={!isEditing} className="text-sm" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex flex-row gap-4 sm:col-span-2">
            <FormField control={form.control} name="height_cm" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Height (cm)</FormLabel>
                <FormControl><Input type="number" inputMode="numeric" step="1" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="weight_kg" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="1" inputMode="numeric" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="body_fat_pct" render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 mb-1">
                <FormLabel>Body Fat (%)</FormLabel>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsBodyFatInfoModalOpen(true)}>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <FormControl><Input type="number" inputMode="numeric" step="1" min="0" max="100" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preferred_muscles" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Preferred Muscles to Train (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between text-sm",
                      !field.value?.length && "text-muted-foreground"
                    )}
                    disabled={!isEditing}
                  >
                    <span className="flex items-center justify-between w-full">
                      <div className="flex flex-wrap gap-1">
                        {field.value && field.value.length > 0 ? (
                          field.value.map((muscle: string) => (
                            <Badge key={muscle} variant="secondary" className="flex items-center gap-1 text-xs">
                              {muscle}
                              <X className="h-3 w-3 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (isEditing) {
                                  const newSelection = field.value?.filter((m: string) => m !== muscle);
                                  field.onChange(newSelection);
                                }
                              }} />
                            </Badge>
                          ))
                        ) : (
                          <span>Select muscles...</span>
                        )}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search muscles..." />
                    <CommandEmpty>No muscle found.</CommandEmpty>
                    <CommandGroup>
                      {mainMuscleGroups.map((muscle) => (
                        <CommandItem
                          key={muscle}
                          onSelect={() => {
                            if (!isEditing) return;
                            const currentSelection = new Set(field.value);
                            if (currentSelection.has(muscle)) {
                              currentSelection.delete(muscle);
                            } else {
                              currentSelection.add(muscle);
                            }
                            field.onChange(Array.from(currentSelection));
                          }}
                          className="text-sm"
                        >
                          <Checkbox
                            checked={field.value?.includes(muscle)}
                            onCheckedChange={(checked) => {
                              if (!isEditing) return;
                              const currentSelection = new Set(field.value);
                              if (checked) {
                                currentSelection.add(muscle);
                              } else {
                                currentSelection.delete(muscle);
                              }
                              field.onChange(Array.from(currentSelection));
                            }}
                            className="mr-2"
                          />
                          {muscle}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground mt-1">
                Select muscle groups you'd like the AI Coach to prioritise in your recommendations.
              </p>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="health_notes" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Health Notes / Constraints (Optional)</FormLabel>
              <FormControl><Textarea {...field} value={field.value ?? ''} disabled={!isEditing} placeholder="Any injuries, health conditions, or limitations..." className="text-sm" /></FormControl>
              <p className="text-sm text-muted-foreground mt-1">
                Share any relevant health information or limitations for the AI Coach to consider when generating advice.
              </p>
              <FormMessage />
            </FormItem>
          )} />
        </CardContent>
      </Card>

      <BodyFatInfoModal
        open={isBodyFatInfoModalOpen}
        onOpenChange={setIsBodyFatInfoModalOpen}
      />
    </>
  );
};