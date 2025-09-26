"use client";

import React from 'react';
import { cn, getWorkoutColorClass } from '@/lib/utils';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  tPathType: 'ulul' | 'ppl' | null;
}

export const OnboardingProgressBar = ({ currentStep, totalSteps, tPathType }: OnboardingProgressBarProps) => {
  const progressPercentage = (currentStep / totalSteps) * 100;

  const colorKey = tPathType === 'ulul' ? 'upper-body-a' : tPathType === 'ppl' ? 'push' : 'primary';
  const colorClass = colorKey === 'primary' ? 'bg-primary' : getWorkoutColorClass(colorKey, 'bg');

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-primary">AI CALIBRATION</span>
        <span className="text-sm text-muted-foreground">STEP {currentStep} OF {totalSteps}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5 relative overflow-hidden">
        <div
          className={cn("h-2.5 rounded-full transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${progressPercentage}%` }}
        >
          <div className={cn("absolute inset-0 opacity-30", colorClass)} style={{ filter: 'blur(5px)' }}></div>
        </div>
      </div>
    </div>
  );
};