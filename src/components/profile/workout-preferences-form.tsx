"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dumbbell } from 'lucide-react';
import { useFormContext } from 'react-hook-form'; // Import useFormContext

interface WorkoutPreferencesFormProps {
  isEditing: boolean;
}

export const WorkoutPreferencesForm = ({ isEditing }: WorkoutPreferencesFormProps) => {
  const form = useFormContext(); // Use context

  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" /> Workout Preferences
        </CardTitle>
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
            <Select onValueChange={field.onChange} value={field.value || ''} disabled={!isEditing}>
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