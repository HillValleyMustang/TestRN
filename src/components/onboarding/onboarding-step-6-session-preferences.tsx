"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep6Props {
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep6_SessionPreferences = ({
  sessionLength,
  setSessionLength,
  handleNext,
  handleBack,
}: OnboardingStep6Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={sessionLength} 
        onValueChange={setSessionLength}
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="15-30" id="15-30" className="h-4 w-4" /> {/* Smaller radio item */}
            <Label htmlFor="15-30" className="text-sm">15-30 minutes</Label> {/* Smaller label */}
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="30-45" id="30-45" className="h-4 w-4" /> {/* Smaller radio item */}
            <Label htmlFor="30-45" className="text-sm">30-45 minutes</Label> {/* Smaller label */}
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="45-60" id="45-60" className="h-4 w-4" /> {/* Smaller radio item */}
            <Label htmlFor="45-60" className="text-sm">45-60 minutes</Label> {/* Smaller label */}
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="60-90" id="60-90" className="h-4 w-4" /> {/* Smaller radio item */}
            <Label htmlFor="60-90" className="text-sm">60-90 minutes</Label> {/* Smaller label */}
          </div>
        </div>
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} size="sm"> {/* Smaller button */}
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!sessionLength}
          size="sm" // Smaller button
        >
          Next
        </Button>
      </div>
    </div>
  );
};