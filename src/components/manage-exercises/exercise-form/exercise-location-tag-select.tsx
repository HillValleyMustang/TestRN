"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { ChevronDown, X } from "lucide-react";
import { cn } from '@/lib/utils';

interface ExerciseLocationTagSelectProps {
  form: UseFormReturn<any>;
  availableLocationTags: string[];
}

export const ExerciseLocationTagSelect = ({ form, availableLocationTags }: ExerciseLocationTagSelectProps) => {
  const field = form.watch('location_tags');

  return (
    <FormField
      control={form.control}
      name="location_tags"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-bold">Active Gyms (Optional)</FormLabel>
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
                <span className="flex items-center justify-between w-full">
                  <div className="flex flex-wrap gap-1">
                    {field.value && field.value.length > 0 ? (
                      field.value.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X className="h-3 w-3 cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            const newSelection = field.value?.filter((t: string) => t !== tag);
                            field.onChange(newSelection);
                          }} />
                        </Badge>
                      ))
                    ) : (
                      <span>Select gyms...</span>
                    )}
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput placeholder="Search gyms..." />
                <CommandEmpty>No gyms found. Add one in your profile.</CommandEmpty>
                <CommandGroup>
                  {availableLocationTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => {
                        const currentSelection = new Set(field.value || []);
                        if (currentSelection.has(tag)) {
                          currentSelection.delete(tag);
                        } else {
                          currentSelection.add(tag);
                        }
                        field.onChange(Array.from(currentSelection));
                      }}
                    >
                      <Checkbox
                        checked={field.value?.includes(tag)}
                        className="mr-2"
                      />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};