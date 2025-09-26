"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Bot } from "lucide-react";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface OnboardingStep4Props {
  preferredMuscles: string;
  setPreferredMuscles: (value: string) => void;
  constraints: string;
  setConstraints: (value: string) => void;
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  handleNext: () => void;
  handleBack: () => void;
}

const mainMuscleGroups = [
  "Pectorals", "Deltoids", "Lats", "Traps", "Biceps", 
  "Triceps", "Quadriceps", "Hamstrings", "Glutes", "Calves", 
  "Abdominals", "Core", "Full Body"
];

export const OnboardingStep4_AiCoach = ({
  preferredMuscles,
  setPreferredMuscles,
  constraints,
  setConstraints,
  consentGiven,
  setConsentGiven,
  handleNext,
  handleBack,
}: OnboardingStep4Props) => {
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
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">
          Preferred Muscles to Train <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                "w-full justify-between mt-1 h-auto min-h-[40px] py-2",
                selectedMuscles.length === 0 && "text-muted-foreground"
              )}
            >
              <span className="flex items-center justify-between w-full">
                <div className="flex flex-wrap gap-1">
                  {selectedMuscles.length > 0 ? (
                    selectedMuscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="flex items-center gap-1 text-xs">
                        {muscle}
                        <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleMuscleToggle(muscle); }} />
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm">Select muscles...</span>
                  )}
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
            <div className="grid grid-cols-2 gap-2 p-2">
              {mainMuscleGroups.map((muscle) => (
                <Button
                  key={muscle}
                  type="button"
                  variant={selectedMuscles.includes(muscle) ? "default" : "outline"}
                  onClick={() => handleMuscleToggle(muscle)}
                  className={cn("flex-1 text-sm", selectedMuscles.includes(muscle) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent")}
                >
                  {muscle}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Bot className="h-3 w-3 flex-shrink-0" />
          This helps our AI tailor exercise suggestions and coaching feedback.
        </p>
      </div>
      
      <div>
        <Label htmlFor="constraints" className="text-base font-semibold">
          Constraints <span className="text-sm font-normal text-muted-foreground">(Optional)</span>
        </Label>
        <Textarea 
          id="constraints" 
          placeholder="Any injuries, health conditions, or limitations..." 
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          className="mt-1 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <Bot className="h-3 w-3 flex-shrink-0" />
          Our AI will consider these when generating workout plans and advice.
        </p>
      </div>

      <div className="flex items-start space-x-3 pt-4">
        <Checkbox 
          id="consent" 
          checked={consentGiven}
          onCheckedChange={(checked) => setConsentGiven(!!checked)}
          className="mt-1"
        />
        <Label htmlFor="consent" className="text-sm text-muted-foreground">
          I consent to storing my workout data and profile information to provide 
          personalised training recommendations. I understand I can delete my data 
          at any time through my profile settings.
        </Label>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!consentGiven}
          size="lg"
        >
          Next
        </Button>
      </div>
    </div>
  );
};