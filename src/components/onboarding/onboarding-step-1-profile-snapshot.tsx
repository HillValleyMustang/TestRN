"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';

interface OnboardingStep1Props {
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  handleNext: () => void;
}

export const OnboardingStep1_ProfileSnapshot = ({
  fullName,
  setFullName,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  consentGiven,
  setConsentGiven,
  handleNext,
}: OnboardingStep1Props) => {

  const bmi = useMemo(() => {
    if (!weightKg || !heightCm) return null;
    const heightInMeters = heightCm / 100;
    if (heightInMeters === 0) return null;
    return (weightKg / (heightInMeters * heightInMeters)).toFixed(1);
  }, [weightKg, heightCm]);

  const isNextDisabled = !fullName || !heightCm || !weightKg || !consentGiven;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-base font-semibold">What should we call you?</Label>
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
            <div className="flex justify-between items-baseline">
              <Label htmlFor="height-slider" className="text-base font-semibold">Height</Label>
              <span className="text-2xl font-bold text-primary">{heightCm || '-'} cm</span>
            </div>
            <Slider
              id="height-slider"
              value={[heightCm || 175]}
              onValueChange={(value) => setHeightCm(value[0])}
              min={120}
              max={220}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <Label htmlFor="weight-slider" className="text-base font-semibold">Weight</Label>
              <span className="text-2xl font-bold text-primary">{weightKg || '-'} kg</span>
            </div>
            <Slider
              id="weight-slider"
              value={[weightKg || 75]}
              onValueChange={(value) => setWeightKg(value[0])}
              min={40}
              max={150}
              step={1}
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center bg-muted/50 rounded-lg p-4 h-full">
          <p className="text-sm text-muted-foreground">Estimated BMI</p>
          <p className="text-4xl font-extrabold">{bmi || '...'}</p>
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
      
      <div className="flex justify-end">
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