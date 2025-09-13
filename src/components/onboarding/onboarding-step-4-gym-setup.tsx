"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

interface OnboardingStep4Props {
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep4_GymSetup = ({
  handleNext,
  handleBack,
}: OnboardingStep4Props) => {
  return (
    <div className="space-y-6 text-center">
      <p className="text-muted-foreground">
        This is where you will set up your gym by uploading photos for our AI to analyze.
        This feature is coming in the next step. For now, please proceed.
      </p>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleNext}>
          Next (Skip for now)
        </Button>
      </div>
    </div>
  );
};