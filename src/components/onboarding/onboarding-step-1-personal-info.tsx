"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from 'lucide-react';
import { BodyFatInfoModal } from './body-fat-info-modal';
import { InteractiveSliderInput } from './interactive-slider-input';
import { cmToFeetAndInches, convertWeight } from '@/lib/unit-conversions';

interface OnboardingStep1Props {
  handleNext: () => void;
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
  bodyFatPct: number | null;
  setBodyFatPct: (value: number | null) => void;
}

export const OnboardingStep1_PersonalInfo = ({
  handleNext,
  fullName,
  setFullName,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  bodyFatPct,
  setBodyFatPct,
}: OnboardingStep1Props) => {
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false);

  const heightSubtitle = useMemo(() => cmToFeetAndInches(heightCm), [heightCm]);
  const weightSubtitle = useMemo(() => {
    const lbs = convertWeight(weightKg, 'kg', 'lbs');
    return lbs ? `${lbs.toFixed(0)} lbs` : '';
  }, [weightKg]);

  const getBodyFatLabel = (percentage: number | null): string => {
    if (percentage === null) return '';
    if (percentage <= 12) return 'Athletic';
    if (percentage <= 20) return 'Fit';
    if (percentage <= 28) return 'Average';
    return 'Average+';
  };
  const bodyFatSubtitle = getBodyFatLabel(bodyFatPct);

  const isNextDisabled = !fullName || heightCm === null || weightKg === null;

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-sm font-medium">What should we call you?</Label>
          <Input 
            id="fullName" 
            placeholder="Enter your name" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 text-sm"
          />
        </div>
        
        <InteractiveSliderInput
          id="heightCm"
          label="How tall are you?"
          value={heightCm}
          onValueChange={setHeightCm}
          unit="cm"
          subtitle={heightSubtitle}
          min={120}
          max={220}
          step={1}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InteractiveSliderInput
            id="weightKg"
            label="Current weight?"
            value={weightKg}
            onValueChange={setWeightKg}
            unit="kg"
            subtitle={weightSubtitle}
            min={40}
            max={150}
            step={1}
          />

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Label htmlFor="bodyFatPct" className="text-sm font-medium">Body Fat % <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsBodyFatInfoModalOpen(true)}>
                <Info className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <InteractiveSliderInput
              id="bodyFatPct"
              value={bodyFatPct}
              onValueChange={setBodyFatPct}
              unit="%"
              subtitle={bodyFatSubtitle}
              min={5}
              max={50}
              step={1}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <Button onClick={handleNext} disabled={isNextDisabled}>
          Next
        </Button>
      </div>

      <BodyFatInfoModal
        open={isBodyFatInfoModalOpen}
        onOpenChange={setIsBodyFatInfoModalOpen}
      />
    </>
  );
};