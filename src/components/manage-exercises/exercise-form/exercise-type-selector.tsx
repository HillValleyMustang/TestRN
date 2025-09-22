"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Dumbbell, Timer, Footprints } from "lucide-react"; // Import Footprints for Bodyweight
import { FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from '@/lib/utils';

interface ExerciseTypeSelectorProps {
  form: UseFormReturn<any>; // Use any for now, schema is in parent
  selectedTypes: string[];
  handleTypeChange: (type: "weight" | "timed" | "bodyweight") => void; // Updated type
}

export const ExerciseTypeSelector = ({
  form,
  selectedTypes,
  handleTypeChange,
}: ExerciseTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <FormLabel className="font-bold">Exercise Type</FormLabel>
      <div className="grid grid-cols-3 gap-3"> {/* Changed to grid-cols-3 */}
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("weight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("weight")}
        >
          <Dumbbell className={cn("h-6 w-6 mb-1", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-primary")} /> {/* Added text-primary for unselected color */}
          <span className={cn("font-medium text-sm", selectedTypes.includes("weight") ? "text-primary-foreground" : "text-foreground")}>Weight Training</span>
        </div>
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("timed") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("timed")}
        >
          <Timer className={cn("h-6 w-6 mb-1", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-primary")} /> {/* Added text-primary for unselected color */}
          <span className={cn("font-medium text-sm", selectedTypes.includes("timed") ? "text-primary-foreground" : "text-foreground")}>Timed (e.g. Plank)</span>
        </div>
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all",
            selectedTypes.includes("bodyweight") ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-input bg-card hover:border-primary/50"
          )}
          onClick={() => handleTypeChange("bodyweight")}
        >
          <Footprints className={cn("h-6 w-6 mb-1", selectedTypes.includes("bodyweight") ? "text-primary-foreground" : "text-primary")} /> {/* Added text-primary for unselected color */}
          <span className={cn("font-medium text-sm", selectedTypes.includes("bodyweight") ? "text-primary-foreground" : "text-foreground")}>Bodyweight (Sets)</span> {/* New text */}
        </div>
      </div>
      <FormMessage />
    </div>
  );
};