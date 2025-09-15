"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dumbbell, Sparkles, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Import getWorkoutColorClass

interface OnboardingStep7Props {
  handleNext: () => void;
  handleBack: () => void;
}

const features = [
  {
    icon: <Dumbbell className="h-5 w-5" />,
    title: "Personalised T-Paths",
    description: "Structured workout plans that adapt to your goals and preferences.",
    colorKey: "upper-body-a" // Use color key for styling
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "AI Fitness Coach",
    description: "Get intelligent feedback and exercise suggestions based on your performance.",
    colorKey: "lower-body-a" // Use color key for styling
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Track Your Progress",
    description: "Visualize your gains with detailed charts, personal bests, and consistency tracking.",
    colorKey: "upper-body-b" // Use color key for styling
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
          <Card 
            key={index} 
            className={cn(
              "flex items-start gap-4 p-3 border-2", // Use border-2 for more prominence
              getWorkoutColorClass(feature.colorKey, 'border') // Apply border color
            )}
          >
            <div className={cn("flex-shrink-0", getWorkoutColorClass(feature.colorKey, 'text'))}> {/* Apply text color to icon */}
              {feature.icon}
            </div>
            <div>
              <h4 className="font-semibold">{feature.title}</h4>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button onClick={handleNext} size="sm">
          Next
        </Button>
      </div>
    </div>
  );
};