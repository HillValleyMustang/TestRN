"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Sparkles, BarChart3 } from 'lucide-react';
import { cn, getWorkoutColorClass } from '@/lib/utils';

interface OnboardingStep6Props {
  handleNext: () => void;
  handleBack: () => void;
}

const features = [
  {
    icon: <Dumbbell />,
    title: "Personalised T-Paths",
    description: "Structured workout plans that adapt to your goals and preferences.",
    colorKey: "upper-body-a"
  },
  {
    icon: <Sparkles />,
    title: "AI Fitness Coach",
    description: "Get intelligent feedback and exercise suggestions based on your performance.",
    colorKey: "lower-body-a"
  },
  {
    icon: <BarChart3 />,
    title: "Track Your Progress",
    description: "Visualize your gains with detailed charts, personal bests, and consistency tracking.",
    colorKey: "upper-body-b"
  }
];

export const OnboardingStep6_AppFeatures = ({
  handleNext,
  handleBack,
}: OnboardingStep6Props) => {
  return (
    <div className="space-y-6">
      <div className="h-80 overflow-y-auto snap-y snap-mandatory rounded-lg border">
        {features.map((feature, index) => (
          <div
            key={index}
            className="h-80 snap-start flex flex-col items-center justify-center text-center p-6"
          >
            <div className={cn("flex-shrink-0 p-3 rounded-full mb-4", getWorkoutColorClass(feature.colorKey, 'bg'))}>
              {React.cloneElement(feature.icon, { className: "h-8 w-8 text-white" })}
            </div>
            <h4 className="font-semibold text-xl mb-2">{feature.title}</h4>
            <p className="text-sm text-muted-foreground max-w-xs">{feature.description}</p>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
};