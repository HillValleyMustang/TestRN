"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Keep RadioGroup for functionality
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { Clock } from 'lucide-react'; // Icon for session length

interface OnboardingStep6Props {
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

const sessionLengthOptions = [
  { value: "15-30", label: "15-30 minutes" },
  { value: "30-45", label: "30-45 minutes" },
  { value: "45-60", label: "45-60 minutes" },
  { value: "60-90", label: "60-90 minutes" },
];

export const OnboardingStep6_SessionPreferences = ({
  sessionLength,
  setSessionLength,
  handleNext,
  handleBack,
}: OnboardingStep6Props) => {
  return (
    <div className="space-y-6">
      <RadioGroup 
        value={sessionLength} 
        onValueChange={setSessionLength}
        className="grid grid-cols-1 md:grid-cols-2 gap-4" // Use grid for cards
      >
        {sessionLengthOptions.map(option => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-all min-h-[80px] flex flex-col justify-center text-center p-3", // Reduced min-height and adjusted padding
              sessionLength === option.value
                ? 'border-primary ring-2 ring-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => setSessionLength(option.value)}
          >
            <CardHeader className="pb-1"> {/* Adjusted padding */}
              <Clock className="h-6 w-6 mx-auto mb-1 text-primary" /> {/* Smaller icon */}
              <CardTitle className="text-base">{option.label}</CardTitle> {/* Reduced font size */}
            </CardHeader>
            <CardContent className="pt-0">
              {/* Hidden RadioGroupItem for actual form value */}
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
            </CardContent>
          </Card>
        ))}
      </RadioGroup>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!sessionLength}
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
};