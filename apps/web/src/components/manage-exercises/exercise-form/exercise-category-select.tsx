"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Info } from "lucide-react";

interface ExerciseCategorySelectProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
  categoryOptions: { value: string; label: string; description: string }[];
}

export const ExerciseCategorySelect = ({ form, categoryOptions }: ExerciseCategorySelectProps) => {
  return (
    <FormField 
      control={form.control} 
      name="category" 
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel className="font-bold">Category</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-w-[90vw]">
                <div className="space-y-2">
                  <p className="font-semibold">Category Information</p>
                  <ul className="text-sm space-y-1">
                    <li><span className="font-medium">Unilateral:</span> Movement performed with one arm or leg at a time</li>
                    <li><span className="font-medium">Bilateral:</span> Both arms or legs move together</li>
                  </ul>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Select onValueChange={field.onChange} value={field.value || ''}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} 
    />
  );
};