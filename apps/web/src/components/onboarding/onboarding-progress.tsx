"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Keep web-specific utils;

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export const OnboardingProgress = ({ currentStep, totalSteps }: OnboardingProgressProps) => {
  const stepColors = [
    'bg-workout-upper-body-a',
    'bg-workout-lower-body-a',
    'bg-workout-upper-body-b',
    'bg-workout-lower-body-b',
    'bg-workout-push', // Fallback for step 5+
  ];

  return (
    <div className="mb-10">
      <div className="flex items-center justify-center">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1;
          const isCompleted = currentStep > step;
          const isActive = currentStep === step;
          const colorClass = stepColors[i % stepColors.length];

          return (
            <React.Fragment key={step}>
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ease-in-out",
                  isActive && "w-9 h-9 ring-4 ring-primary/20",
                  isCompleted || isActive ? `${colorClass} text-primary-foreground` : "bg-muted text-muted-foreground"
                )}
              >
                {step}
              </div>
              {step < totalSteps && (
                <div className={cn("flex-grow h-1 transition-colors duration-300", isCompleted ? colorClass : "bg-muted")} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};