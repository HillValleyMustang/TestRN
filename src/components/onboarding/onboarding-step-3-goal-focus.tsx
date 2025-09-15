"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface OnboardingStep3Props {
  goalFocus: string;
  setGoalFocus: (value: string) => void;
  preferredMuscles: string;
  setPreferredMuscles: (value: string) => void;
  constraints: string;
  setConstraints: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep3_GoalFocus = ({
  goalFocus,
  setGoalFocus,
  preferredMuscles,
  setPreferredMuscles,
  constraints,
  setConstraints,
  handleNext,
  handleBack,
}: OnboardingStep3Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={goalFocus} 
        onValueChange={setGoalFocus}
      >
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="muscle_gain" id="muscle_gain" />
            <Label htmlFor="muscle_gain">Build Muscle & Tone</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="general_fitness" id="general_fitness" />
            <Label htmlFor="general_fitness">Improve General Fitness</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="strength" id="strength" />
            <Label htmlFor="strength">Build Strength</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mobility" id="mobility" />
            <Label htmlFor="mobility">Increase Mobility</Label>
          </div>
        </div>
      </RadioGroup>
      
      <div>
        <Label htmlFor="preferredMuscles">Preferred Muscles to Train (Optional)</Label>
        <Input 
          id="preferredMuscles" 
          placeholder="e.g., Chest, Back, Legs..." 
          value={preferredMuscles}
          onChange={(e) => setPreferredMuscles(e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">
          Let us know if there are specific muscle groups you want to focus on
        </p>
      </div>
      
      <div>
        <Label htmlFor="constraints">Constraints (Optional)</Label>
        <Textarea 
          id="constraints" 
          placeholder="Any injuries, health conditions, or limitations..." 
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
        />
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!goalFocus}
        >
          Next
        </Button>
      </div>
    </div>
  );
};