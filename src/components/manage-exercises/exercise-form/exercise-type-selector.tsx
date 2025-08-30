"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Dumbbell, Timer } from "lucide-react";
import { FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from '@/lib/utils';

interface ExerciseTypeSelectorProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
  selectedTypes: string[];
  handleTypeChange: (type: "weight" | "timed") => void;
}

export const ExerciseTypeSelector = ({
  form,
  selectedTypes,
  handleTypeChange,
}: ExerciseTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <FormLabel className="font-bold">Exercise Type</FormLabel>
      <div className="grid grid-cols-2 gap-3">
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("weight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("weight")}
        >
          <Dumbbell className={cn("h-8 w-8 mb-2", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-muted-foreground")} />
          <span className={cn("font-medium", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-foreground")}>Weight Training</span>
        </div>
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("timed") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("timed")}
        >
          <Timer className={cn("h-8 w-8 mb-2", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-muted-foreground")} />
          <span className={cn("font-medium", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-foreground")}>Timed (e.g. Plank)</span>
        </div>
      </div>
      <FormMessage />
    </div>
  );
};