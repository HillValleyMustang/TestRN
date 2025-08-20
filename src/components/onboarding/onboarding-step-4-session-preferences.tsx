"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep4Props {
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep4_SessionPreferences = ({
  sessionLength,
  setSessionLength,
  handleNext,
  handleBack,
}: OnboardingStep4Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={sessionLength} 
        onValueChange={setSessionLength}
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="15-30" id="15-30" />
            <Label htmlFor="15-30">15-30 minutes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="30-45" id="30-45" />
            <Label htmlFor="30-45">30-45 minutes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="45-60" id="45-60" />
            <Label htmlFor="45-60">45-60 minutes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="60-90" id="60-90" />
            <Label htmlFor="60-90">60-90 minutes</Label>
          </div>
        </div>
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!sessionLength}
        >
          Next
        </Button>
      </div>
    </div>
  );
};