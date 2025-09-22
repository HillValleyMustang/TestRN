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
            "flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all", // Reduced p-4 to p-3
            selectedTypes.includes("weight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("weight")}
        >
          <Dumbbell className={cn("h-6 w-6 mb-1", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-muted-foreground")} /> {/* Reduced icon size and mb */}
          <span className={cn("font-medium text-sm", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-foreground")}>Weight Training</span> {/* Reduced text size */}
        </div>
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all", // Reduced p-4 to p-3
            selectedTypes.includes("timed") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("timed")}
        >
          <Timer className={cn("h-6 w-6 mb-1", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-muted-foreground")} /> {/* Reduced icon size and mb */}
          <span className={cn("font-medium text-sm", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-foreground")}>Timed (e.g. Plank)</span> {/* Reduced text size */}
        </div>
      </div>
      <FormMessage />
    </div>
  );
};