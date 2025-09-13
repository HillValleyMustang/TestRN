"use client";

import React from 'react';
import { Button } from "@/components/ui/button";

interface OnboardingStep5Props {
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep5_ExerciseReview = ({
  handleNext,
  handleBack,
}: OnboardingStep5Props) => {
  return (
    <div className="space-y-6 text-center">
      <p className="text-muted-foreground">
        After the AI analyzes your gym photos, you will review and confirm the suggested exercises here.
        This feature is coming soon. For now, please proceed.
      </p>
      
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