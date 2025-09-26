"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep2Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
  tPathDescriptions: {
    ulul: { title: string; pros: string[]; cons: string[]; research: string[] };
    ppl: { title: string; pros: string[]; cons: string[]; research: string[] };
  };
}

const sessionLengthOptions = [
  { value: "15-30", label: "15-30 mins" },
  { value: "30-45", label: "30-45 mins" },
  { value: "45-60", label: "45-60 mins" },
  { value: "60-90", label: "60-90 mins" },
];

export const OnboardingStep2_TrainingPlan = ({
  tPathType,
  setTPathType,
  sessionLength,
  setSessionLength,
  handleNext,
  handleBack,
  tPathDescriptions,
}: OnboardingStep2Props) => {
  return (
    <div className="space-y-8">
      {/* Workout Split Selection */}
      <div>
        <Label className="text-base font-semibold">Choose Your Workout Split</Label>
        <p className="text-sm text-muted-foreground mb-3">This determines how your workouts are structured throughout the week.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ULUL Card */}
          <div
            className={cn(
              "cursor-pointer transition-all duration-200 rounded-lg p-0.5",
              tPathType === 'ulul' ? 'bg-gradient-primary' : 'bg-border'
            )}
            onClick={() => setTPathType('ulul')}
          >
            <Card className="bg-background rounded-[5px] h-full w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">{tPathDescriptions.ulul.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {tPathDescriptions.ulul.pros.map((pro, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-teal mr-2">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
          
          {/* PPL Card */}
          <div
            className={cn(
              "cursor-pointer transition-all duration-200 rounded-lg p-0.5",
              tPathType === 'ppl' ? 'bg-gradient-primary' : 'bg-border'
            )}
            onClick={() => setTPathType('ppl')}
          >
            <Card className="bg-background rounded-[5px] h-full w-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">{tPathDescriptions.ppl.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {tPathDescriptions.ppl.pros.map((pro, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-teal mr-2">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Session Length Selection */}
      <div>
        <Label className="text-base font-semibold">How long are your typical sessions?</Label>
        <p className="text-sm text-muted-foreground mb-3">This helps us select the right number of exercises for your workouts.</p>
        <RadioGroup 
          value={sessionLength} 
          onValueChange={setSessionLength}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {sessionLengthOptions.map(option => (
            <div key={option.value}>
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
              <Label
                htmlFor={option.value}
                className={cn(
                  "cursor-pointer transition-all border-2 rounded-lg flex items-center justify-center text-center p-3 font-semibold h-16",
                  sessionLength === option.value
                    ? 'border-teal ring-2 ring-teal bg-teal/10'
                    : 'border-input bg-secondary hover:border-teal/50'
                )}
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!tPathType || !sessionLength}
          size="lg"
          className="bg-gradient-primary text-primary-foreground font-bold"
        >
          Next
        </Button>
      </div>
    </div>
  );
};