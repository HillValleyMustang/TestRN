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
      <div className="grid grid-cols-2 gap-3">
        {goals.map(goal => (
          <Card 
            key={goal.id}
            className={cn(
              "cursor-pointer transition-all min-h-[80px] flex flex-col justify-center p-4",
              goalFocus === goal.id 
                ? 'border-primary ring-2 ring-primary' 
                : 'hover:border-primary/50'
            )}
            onClick={() => setGoalFocus(goal.id)}
          >
            <CardTitle className="text-base text-center font-semibold">{goal.title}</CardTitle>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleNext} 
          disabled={!goalFocus}
          size="lg"
        >
          Next
        </Button>
      </div>
    </div>
  );
};