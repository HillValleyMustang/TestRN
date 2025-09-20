"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Dumbbell, List, Sparkles } from 'lucide-react';
import { OnboardingSummaryData } from '@/hooks/use-onboarding-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn, getWorkoutColorClass } from '@/lib/utils';

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
        Your personalized workout plan has been generated. Here's a summary of what we've set up for you.
      </p>

      <Card className="text-left">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Dumbbell className="h-5 w-5" /> Your Transformation Path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold">{summaryData.mainTPath.template_name}</h3>
            <p className="text-sm text-muted-foreground">
              Based on your goal of "{summaryData.profile.primary_goal}" and {summaryData.profile.preferred_session_length} min sessions.
            </p>
          </div>
          <ScrollArea className="h-64 w-full pr-4">
            <div className="space-y-3">
              {summaryData.childWorkoutsWithExercises.map(workout => (
                <Card key={workout.id} className={cn("border-2", getWorkoutColorClass(workout.template_name, 'border'))}>
                  <CardHeader className="p-3">
                    <CardTitle className="text-base">{workout.template_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ul className="space-y-1">
                      {workout.exercises.map(exercise => (
                        <li key={exercise.id} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{exercise.name}</span>
                          {exercise.is_bonus_exercise && <Badge variant="outline">Bonus</Badge>}
                          {summaryData.confirmedExerciseNames.has(exercise.name) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              <Sparkles className="h-3 w-3 mr-1" /> AI Identified
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button onClick={handleFinish} size="lg" className="w-full">
        Go to Dashboard
      </Button>
    </div>
  );
};