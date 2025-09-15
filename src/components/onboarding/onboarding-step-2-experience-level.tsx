"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface OnboardingStep2Props {
  experience: "beginner" | "intermediate" | null;
  setExperience: (value: "beginner" | "intermediate") => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep2_ExperienceLevel = ({
  experience,
  setExperience,
  handleNext,
  handleBack,
}: OnboardingStep2Props) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[120px] flex flex-col justify-center", // Reduced min-height and added flex for centering
            experience === 'beginner' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setExperience('beginner')}
        >
          <CardHeader className="pb-2"> {/* Adjusted padding */}
            <CardTitle className="text-lg text-center">Beginner</CardTitle> {/* Reduced font size and centered */}
          </CardHeader>
          <CardContent className="pt-0"> {/* Adjusted padding */}
            <p className="text-sm text-muted-foreground text-center"> {/* Centered text */}
              New to structured training or returning after a long break.
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[120px] flex flex-col justify-center", // Reduced min-height and added flex for centering
            experience === 'intermediate' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setExperience('intermediate')}
        >
          <CardHeader className="pb-2"> {/* Adjusted padding */}
            <CardTitle className="text-lg text-center">Intermediate</CardTitle> {/* Reduced font size and centered */}
          </CardHeader>
          <CardContent className="pt-0"> {/* Adjusted padding */}
            <p className="text-sm text-muted-foreground text-center"> {/* Centered text */}
              Some experience with structured training programs.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!experience}
        >
          Next
        </Button>
      </div>
    </div>
  );
};