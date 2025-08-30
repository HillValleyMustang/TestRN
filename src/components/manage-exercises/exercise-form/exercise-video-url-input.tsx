"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

interface ExerciseVideoUrlInputProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
}

export const ExerciseVideoUrlInput = ({ form }: ExerciseVideoUrlInputProps) => {
  return (
    <FormField 
      control={form.control} 
      name="video_url" 
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold">Video URL (Optional)</FormLabel>
          <FormControl>
            <Input {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} 
    />
  );
};