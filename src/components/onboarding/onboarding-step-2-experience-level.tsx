"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep2Props {
  experience: "beginner" | "intermediate" | null;
  setExperience: (value: "beginner" | "intermediate") => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep2_ExperienceLevel = ({
  experience,
  setExperience,
  handleNext,
  handleBack,
}: OnboardingStep2Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={experience || undefined} 
        onValueChange={(value: "beginner" | "intermediate") => setExperience(value)}
      >
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="beginner" id="beginner" />
            <Label htmlFor="beginner">Beginner</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            New to structured training or returning after a long break
          </p>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="intermediate" id="intermediate" />
            <Label htmlFor="intermediate">Intermediate</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Some experience with structured training programs
          </p>
        </div>
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!experience}
        >
          Next
        </Button>
      </div>
    </div>
  );
};