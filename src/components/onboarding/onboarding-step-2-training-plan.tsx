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
          <Card 
            className={`cursor-pointer transition-all ${
              tPathType === 'ulul' 
                ? 'border-primary ring-2 ring-primary' 
                : 'hover:border-primary'
            }`}
            onClick={() => setTPathType('ulul')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">{tPathDescriptions.ulul.title}</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-w-[90vw]">
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Benefits of Upper/Lower Split:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {tPathDescriptions.ulul.research.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600 text-sm">Pros:</h4>
                <ul className="text-xs space-y-1">
                  {tPathDescriptions.ulul.pros.map((pro, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
                <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4>
                <ul className="text-xs space-y-1">
                  {tPathDescriptions.ulul.cons.map((con, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
          
          {/* PPL Card */}
          <Card 
            className={`cursor-pointer transition-all ${
              tPathType === 'ppl' 
                ? 'border-primary ring-2 ring-primary' 
                : 'hover:border-primary'
            }`}
            onClick={() => setTPathType('ppl')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">{tPathDescriptions.ppl.title}</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-w-[90vw]">
                  <ScrollArea className="h-48 pr-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Benefits of Push/Pull/Legs Split:</p>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        {tPathDescriptions.ppl.research.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600 text-sm">Pros:</h4>
                <ul className="text-xs space-y-1">
                  {tPathDescriptions.ppl.pros.map((pro, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      {pro}
                    </li>
                  ))}
                </ul>
                <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4>
                <ul className="text-xs space-y-1">
                  {tPathDescriptions.ppl.cons.map((con, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
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
            <Label
              key={option.value}
              htmlFor={option.value}
              className={cn(
                "cursor-pointer transition-all border-2 rounded-lg flex items-center justify-center text-center p-3 font-semibold h-16",
                sessionLength === option.value
                  ? 'border-primary ring-2 ring-primary bg-primary/10'
                  : 'border-input bg-card hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!tPathType || !sessionLength}
          size="lg"
        >
          Next
        </Button>
      </div>
    </div>
  );
};