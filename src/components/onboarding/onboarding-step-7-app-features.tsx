"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Sparkles, BarChart3 } from 'lucide-react';

interface OnboardingStep7Props {
  handleNext: () => void;
  handleBack: () => void;
}

const features = [
  {
    icon: <Dumbbell className="h-6 w-6 text-primary" />,
    title: "Personalised T-Paths",
    description: "Structured workout plans that adapt to your goals and preferences."
  },
  {
    icon: <Sparkles className="h-6 w-6 text-primary" />,
    title: "AI Fitness Coach",
    description: "Get intelligent feedback and exercise suggestions based on your performance."
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    title: "Track Your Progress",
    description: "Visualize your gains with detailed charts, personal bests, and consistency tracking."
  }
];

export const OnboardingStep7_AppFeatures = ({
  handleNext,
  handleBack,
}: OnboardingStep7Props) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex-shrink-0">{feature.icon}</div>
            <div>
              <h4 className="font-semibold">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
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