"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Dumbbell, List } from 'lucide-react';
import { OnboardingSummaryData } from '@/hooks/use-onboarding-form';

interface OnboardingStep9Props {
  summaryData: OnboardingSummaryData | null;
  handleFinish: () => void;
}

export const OnboardingStep9_Summary = ({ summaryData, handleFinish }: OnboardingStep9Props) => {
  if (!summaryData) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Generating your summary...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
      <h2 className="text-2xl font-bold">Setup Complete!</h2>
      <p className="text-muted-foreground">
        Your personalized workout plan is now being generated in the background. Here's a summary of what we've set up for you.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Dumbbell className="h-5 w-5" /> Your Transformation Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">{summaryData.mainTPath.template_name}</h3>
            <p className="text-sm text-muted-foreground">
              Based on your goal of "{summaryData.profile.primary_goal}" and {summaryData.profile.preferred_session_length} min sessions.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Workouts Included:</h4>
            <ul className="space-y-1">
              {summaryData.childWorkouts.map(workout => (
                <li key={workout.id} className="text-sm text-muted-foreground">{workout.template_name}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {summaryData.confirmedExerciseNames.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <List className="h-5 w-5" /> Your Gym Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We've associated {summaryData.confirmedExerciseNames.size} exercise(s) with your new gym based on your photo analysis.
            </p>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleFinish} size="lg" className="w-full">
        Go to Dashboard
      </Button>
    </div>
  );
};