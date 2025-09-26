"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface OnboardingStep1Props {
  goalFocus: string;
  setGoalFocus: (value: string) => void;
  handleNext: () => void;
}

const goals = [
  { id: "muscle_gain", title: "Build Muscle & Tone" },
  { id: "general_fitness", title: "Improve General Fitness" },
  { id: "strength", title: "Build Strength" },
  { id: "mobility", title: "Increase Mobility" },
];

export const OnboardingStep1_GoalFocus = ({
  goalFocus,
  setGoalFocus,
  handleNext,
}: OnboardingStep1Props) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {goals.map(goal => (
          <div
            key={goal.id}
            className={cn(
              "cursor-pointer transition-all duration-200 rounded-lg p-0.5",
              goalFocus === goal.id ? 'bg-gradient-primary' : 'bg-border'
            )}
            onClick={() => setGoalFocus(goal.id)}
          >
            <div className="bg-background rounded-[5px] h-full w-full flex items-center justify-center p-4 min-h-[80px]">
              <h3 className="text-base text-center font-semibold text-foreground">{goal.title}</h3>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleNext} 
          disabled={!goalFocus}
          size="lg"
          className="bg-gradient-primary text-primary-foreground font-bold"
        >
          Next
        </Button>
      </div>
    </div>
  );
};