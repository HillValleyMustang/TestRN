"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep5Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep5_EquipmentSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
}: OnboardingStep5Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={equipmentMethod || undefined} 
        onValueChange={(value: "photo" | "skip") => setEquipmentMethod(value)} 
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="photo" id="photo" />
            <Label htmlFor="photo">Upload Gym Photo</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Take a photo of your gym to help us identify available equipment
          </p>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="skip" id="skip" />
            <Label htmlFor="skip">Skip for Now</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Use default "Common Gym" equipment set
          </p>
        </div>
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!equipmentMethod}
        >
          Next
        </Button>
      </div>
    </div>
  );
};