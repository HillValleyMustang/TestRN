"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import * as z from "zod";

interface ExerciseNameInputProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
}

export const ExerciseNameInput = ({ form }: ExerciseNameInputProps) => {
  return (
    <FormField 
      control={form.control} 
      name="name" 
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold">Exercise Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} 
    />
  );
};