"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ChevronDown, XCircle } from "lucide-react";
import { cn } from '@/lib/utils';

interface MainMuscleSelectProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
  mainMuscleGroups: string[];
  selectedMuscles: string[];
  handleMuscleToggle: (muscle: string) => void;
}

export const MainMuscleSelect = ({
  form,
  mainMuscleGroups,
  selectedMuscles,
  handleMuscleToggle,
}: MainMuscleSelectProps) => {
  return (
    <FormField control={form.control} name="main_muscles" render={({ field }) => (
      <FormItem>
        <FormLabel className="font-bold">Main Muscle Group(s)</FormLabel> {/* Removed (Optional) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between",
                !field.value?.length && "text-muted-foreground"
              )}
            >
              {/* This span now correctly wraps all children of the Button */}
              <span className="flex items-center justify-between w-full">
                <div className="flex flex-wrap gap-1">
                  {field.value && field.value.length > 0 ? (
                    field.value.map((muscle: string) => (
                      <Badge key={muscle} variant="secondary" className="flex items-center gap-1">
                        {muscle}
                        <XCircle className="h-3 w-3 cursor-pointer" onClick={(e) => {
                          e.stopPropagation();
                          const newSelection = field.value?.filter((m: string) => m !== muscle);
                          field.onChange(newSelection);
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
            <div className="grid grid-cols-2 gap-2 p-2">
              {mainMuscleGroups.map((muscle) => (
                <Button
                  key={muscle}
                  type="button"
                  variant={selectedMuscles.includes(muscle) ? "default" : "outline"}
                  onClick={() => handleMuscleToggle(muscle)}
                  className={cn(
                    "flex-1",
                    selectedMuscles.includes(muscle) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
                  )}
                >
                  {muscle}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    )} />
  );
};