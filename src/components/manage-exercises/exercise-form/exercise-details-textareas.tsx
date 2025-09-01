"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input"; // Import Input component

interface ExerciseDetailsTextareasProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
}

export const ExerciseDetailsTextareas = ({ form }: ExerciseDetailsTextareasProps) => {
  return (
    <>
      <FormField 
        control={form.control} 
        name="description" 
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">Description (Optional)</FormLabel>
            <FormControl>
              {/* Temporarily replaced Textarea with Input for debugging */}
              <Input type="text" {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} 
      />
      
      {/* Temporarily commented out to diagnose React.Children.only error */}
      {/* <FormField 
        control={form.control} 
        name="pro_tip" 
        render={({ field }) => (
          <FormItem>
            <FormLabel className="font-bold">Pro Tip (Optional)</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} className="text-sm" rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} 
      /> */}
    </>
  );
};