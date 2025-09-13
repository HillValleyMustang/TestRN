"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Dumbbell, Timer, User } from "lucide-react"; // Import User icon
import { FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from '@/lib/utils';

interface ExerciseTypeSelectorProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
  selectedTypes: string[];
  handleTypeChange: (type: "weight" | "timed" | "body_weight") => void; // Updated type
}

export const ExerciseTypeSelector = ({
  form,
  selectedTypes,
  handleTypeChange,
}: ExerciseTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <FormLabel className="font-bold">Exercise Type</FormLabel>
      <div className="grid grid-cols-3 gap-3"> {/* Changed to 3 columns */}
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
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("body_weight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("body_weight")}
        >
          <User className={cn("h-8 w-8 mb-2", selectedTypes.includes("body_weight") ? "text-primary-foreground" : "text-muted-foreground")} />
          <span className={cn("font-medium", selectedTypes.includes("body_weight") ? "text-primary-foreground" : "text-foreground")}>Body Weight</span>
        </div>
      </div>
      <FormMessage />
    </div>
  );
};