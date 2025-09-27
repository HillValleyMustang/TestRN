"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Bot, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep3Props {
  goalFocus: string;
  setGoalFocus: (value: string) => void;
  preferredMuscles: string;
  setPreferredMuscles: (value: string) => void;
  constraints: string;
  setConstraints: (value: string) => void;
  sessionLength: string;
  setSessionLength: (value: string) => void;
  handleNext: () => void;
  handleBack: () => void;
}

const mainMuscleGroups = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

const goals = [
  { id: "muscle_gain", title: "Build Muscle & Tone" },
  { id: "general_fitness", title: "Improve General Fitness" },
  { id: "strength", title: "Build Strength" },
  { id: "mobility", title: "Increase Mobility" },
];

const sessionLengthOptions = [
  { value: "15-30", label: "15-30 minutes" },
  { value: "30-45", label: "30-45 minutes" },
  { value: "45-60", label: "45-60 minutes" },
  { value: "60-90", label: "60-90 minutes" },
];

export const OnboardingStep3_GoalsAndPreferences = ({
  goalFocus,
  setGoalFocus,
  preferredMuscles,
  setPreferredMuscles,
  constraints,
  setConstraints,
  sessionLength,
  setSessionLength,
  handleNext,
  handleBack,
}: OnboardingStep3Props) => {
  const selectedMuscles = preferredMuscles ? preferredMuscles.split(',').map(m => m.trim()) : [];

  const handleMuscleToggle = (muscle: string) => {
    const currentSelection = new Set(selectedMuscles);
    if (currentSelection.has(muscle)) {
      currentSelection.delete(muscle);
    } else {
      currentSelection.add(muscle);
    }
    setPreferredMuscles(Array.from(currentSelection).join(', '));
  };

  return (
    <div className="space-y-8">
      {/* Goal Focus */}
      <div className="space-y-4">
        <h3 className="font-semibold">1. What are you primarily trying to achieve?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => (
            <Card key={goal.id} className={cn("cursor-pointer transition-all min-h-[100px] flex flex-col justify-center", goalFocus === goal.id ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setGoalFocus(goal.id)}>
              <CardHeader className="pb-2"><CardTitle className="text-base text-center">{goal.title}</CardTitle></CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Preferred Muscles */}
      <div className="space-y-2">
        <label className="text-sm font-medium">2. Preferred Muscles to Train (Optional)</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className={cn("w-full justify-between mt-1 h-auto min-h-[40px] py-2", selectedMuscles.length === 0 && "text-muted-foreground")}>
              <span className="flex items-center justify-between w-full">
                <div className="flex flex-wrap gap-1">{selectedMuscles.length > 0 ? (selectedMuscles.map((muscle) => (<Badge key={muscle} variant="secondary" className="flex items-center gap-1 text-xs">{muscle}<X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleMuscleToggle(muscle); }} /></Badge>))) : (<span className="text-sm">Select muscles...</span>)}</div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0"><div className="grid grid-cols-2 gap-2 p-2">{mainMuscleGroups.map((muscle) => (<Button key={muscle} type="button" variant={selectedMuscles.includes(muscle) ? "default" : "outline"} onClick={() => handleMuscleToggle(muscle)} className={cn("flex-1 text-sm", selectedMuscles.includes(muscle) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent")}>{muscle}</Button>))}</div></PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Bot className="h-3 w-3 flex-shrink-0" />This helps our AI tailor exercise suggestions.</p>
      </div>

      {/* Session Length */}
      <div className="space-y-4">
        <h3 className="font-semibold">3. How long do you prefer your workout sessions to be?</h3>
        <RadioGroup value={sessionLength} onValueChange={setSessionLength} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessionLengthOptions.map(option => (
            <Card key={option.value} className={cn("cursor-pointer transition-all min-h-[60px] flex flex-col justify-center text-center p-2", sessionLength === option.value ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setSessionLength(option.value)}>
              <CardHeader className="pb-0"><Clock className="h-5 w-5 mx-auto mb-1 text-primary" /><CardTitle className="text-sm">{option.label}</CardTitle></CardHeader>
              <CardContent className="pt-0"><RadioGroupItem value={option.value} id={option.value} className="sr-only" /></CardContent>
            </Card>
          ))}
        </RadioGroup>
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <label htmlFor="constraints" className="text-sm font-medium">4. Constraints (Optional)</label>
        <Textarea id="constraints" placeholder="Any injuries, health conditions, or limitations..." value={constraints} onChange={(e) => setConstraints(e.target.value)} className="mt-1 text-sm" />
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Bot className="h-3 w-3 flex-shrink-0" />Our AI will consider these when generating plans.</p>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleNext} disabled={!goalFocus || !sessionLength}>Next</Button>
      </div>
    </div>
  );
};