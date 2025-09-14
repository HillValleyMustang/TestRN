"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input"; // NEW: Import Input

interface OnboardingStep4Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  gymName: string; // NEW: Add gymName prop
  setGymName: (value: string) => void; // NEW: Add setGymName prop
}

export const OnboardingStep4_GymSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  gymName, // NEW: Destructure gymName
  setGymName, // NEW: Destructure setGymName
}: OnboardingStep4Props) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="gymName" className="text-sm font-medium">Your Gym's Name</Label>
        <Input
          id="gymName"
          placeholder="e.g., Home Gym, Fitness First"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          required
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Give your primary gym a name.
        </p>
      </div>

      <RadioGroup 
        value={equipmentMethod || undefined} 
        onValueChange={(value: "photo" | "skip") => setEquipmentMethod(value)} 
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="photo" id="photo" />
            <Label htmlFor="photo">Upload Gym Photos</Label> {/* UPDATED TEXT */}
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Take photos of your gym to help us identify available equipment (multiple photos recommended).
          </p>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip">Skip for Now</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Use a default "Common Gym" equipment set.
          </p>
        </div>
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!equipmentMethod || !gymName} // NEW: Disable if gymName is empty
        >
          Next
        </Button>
      </div>
    </div>
  );
};