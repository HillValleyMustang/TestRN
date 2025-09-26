"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from '@/lib/utils';

interface OnboardingStep6Props {
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

const sessionLengthOptions = [
  { value: "15-30", label: "15-30 mins" },
  { value: "30-45", label: "30-45 mins" },
  { value: "45-60", label: "45-60 mins" },
  { value: "60-90", label: "60-90 mins" },
];

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
        className="grid grid-cols-2 gap-3"
      >
        {sessionLengthOptions.map(option => (
          <Label
            key={option.value}
            htmlFor={option.value}
            className={cn(
              "cursor-pointer transition-all border-2 rounded-lg flex items-center justify-center text-center p-3 font-semibold",
              sessionLength === option.value
                ? 'border-primary ring-2 ring-primary bg-primary/10'
                : 'border-input bg-card hover:border-primary/50'
            )}
          >
            <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
            {option.label}
          </Label>
        ))}
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