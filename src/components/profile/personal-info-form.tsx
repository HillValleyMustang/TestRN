"use client";

import React, { useState } from 'react'; // Import useState
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { User, ChevronDown, X, Info } from 'lucide-react'; // Import Info
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import * as z from 'zod';
import { BodyFatInfoModal } from '../onboarding/body-fat-info-modal'; // Import BodyFatInfoModal

const profileSchema = z.object({
  full_name: z.string().min(1, "Your name is required."),
  height_cm: z.coerce.number().int("Height must be a whole number.").positive("Height must be positive.").optional().nullable(),
  weight_kg: z.coerce.number().int("Weight must be a whole number.").positive("Weight must be positive.").optional().nullable(),
  body_fat_pct: z.coerce.number().int("Body Fat % must be a whole number.").min(0, "Cannot be negative.").max(100, "Cannot exceed 100.").optional().nullable(),
  primary_goal: z.string().optional().nullable(),
  health_notes: z.string().optional().nullable(),
  preferred_session_length: z.string().optional().nullable(),
  preferred_muscles: z.array(z.string()).optional().nullable(),
});

interface PersonalInfoFormProps {
  form: UseFormReturn<z.infer<typeof profileSchema>>;
  isEditing: boolean;
  mainMuscleGroups: string[];
}

export const PersonalInfoForm = ({ form, isEditing, mainMuscleGroups }: PersonalInfoFormProps) => {
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false); // State for modal

  return (
    <>
      <Card className="bg-card">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Info
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <FormField control={form.control} name="full_name" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Preferred Name</FormLabel> {/* Changed label */}
              <FormControl><Input {...field} disabled={!isEditing} className="text-sm" /></FormControl> {/* Added text-sm */}
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex flex-row gap-4 sm:col-span-2">
            <FormField control={form.control} name="height_cm" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Height (cm)</FormLabel>
                <FormControl><Input type="number" inputMode="numeric" step="1" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl> {/* Added text-sm */}
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="weight_kg" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl><Input type="number" step="1" inputMode="numeric" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl> {/* Added text-sm */}
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
              <FormControl><Input type="number" inputMode="numeric" step="1" {...field} value={field.value ?? ''} disabled={!isEditing} className="max-w-[120px] text-sm" /></FormControl> {/* Added text-sm */}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="preferred_muscles" render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Preferred Muscles to Train (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  {/* Removed FormControl wrapper here */}
                  <Button
                    type="button" // Ensure this button doesn't submit the form
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between text-sm", // Added text-sm
                      !field.value?.length && "text-muted-foreground"
                    )}
                    disabled={!isEditing}
                  >
                    <span className="flex items-center justify-between w-full"> {/* Wrapped content in a single span */}
                      <div className="flex flex-wrap gap-1">
                        {field.value && field.value.length > 0 ? (
                          field.value.map((muscle) => (
                            <Badge key={muscle} variant="secondary" className="flex items-center gap-1 text-xs"> {/* Added text-xs */}
                              {muscle}
                              <X className="h-3 w-3 cursor-pointer" onClick={(e) => {
                                e.stopPropagation();
                                if (isEditing) {
                                  const newSelection = field.value?.filter((m) => m !== muscle);
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
                          className="text-sm" // Added text-sm
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
              <FormControl><Textarea {...field} value={field.value ?? ''} disabled={!isEditing} placeholder="Any injuries, health conditions, or limitations..." className="text-sm" /></FormControl> {/* Added text-sm */}
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