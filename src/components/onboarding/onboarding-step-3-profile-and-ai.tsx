"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X, Bot } from "lucide-react";
import { cn } from '@/lib/utils';

interface OnboardingStep3Props {
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
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

export const OnboardingStep3_ProfileAndAi = ({
  fullName,
  setFullName,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  preferredMuscles,
  setPreferredMuscles,
  constraints,
  setConstraints,
  consentGiven,
  setConsentGiven,
  handleNext,
  handleBack,
}: OnboardingStep3Props) => {

  const bmi = useMemo(() => {
    if (!weightKg || !heightCm) return null;
    const heightInMeters = heightCm / 100;
    if (heightInMeters === 0) return null;
    return (weightKg / (heightInMeters * heightInMeters)).toFixed(1);
  }, [weightKg, heightCm]);

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

  const isNextDisabled = !fullName || !heightCm || !weightKg || !consentGiven;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-base font-semibold">First, what should we call you?</Label>
        <Input 
          id="fullName" 
          placeholder="e.g., Alex Doe" 
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="text-base"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heightCm" className="text-base font-semibold">Height (cm)</Label>
            <Input type="number" inputMode="numeric" id="heightCm" value={heightCm || ''} onChange={(e) => setHeightCm(e.target.value ? parseInt(e.target.value) : null)} className="text-base" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weightKg" className="text-base font-semibold">Weight (kg)</Label>
            <Input type="number" inputMode="numeric" id="weightKg" value={weightKg || ''} onChange={(e) => setWeightKg(e.target.value ? parseInt(e.target.value) : null)} className="text-base" />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 h-full">
          <p className="text-sm text-muted-foreground">Estimated BMI</p>
          <p className="text-4xl font-extrabold">{bmi || '...'}</p>
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Any specifics for your AI Coach?</Label>
        <p className="text-sm text-muted-foreground mb-3">This helps us fine-tune your plan and coaching feedback.</p>
        <div className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between h-auto min-h-[40px] py-2",
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
                      <span className="text-sm">Preferred Muscles to Train (Optional)</span>
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
          <Textarea 
            id="constraints" 
            placeholder="Any injuries or limitations? (Optional)" 
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            className="text-sm"
          />
        </div>
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
          disabled={isNextDisabled}
          size="lg"
        >
          Next
        </Button>
      </div>
    </div>
  );
};