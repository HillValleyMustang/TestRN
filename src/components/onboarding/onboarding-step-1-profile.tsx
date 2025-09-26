"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from 'lucide-react';
import { BodyFatInfoModal } from './body-fat-info-modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from '@/components/ui/label';
import { ValueSlider } from './value-slider';
import { convertWeight, cmToFeetAndInches } from '@/lib/unit-conversions';

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

export const OnboardingStep1_Profile = ({
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

  const heightInFtIn = useMemo(() => cmToFeetAndInches(heightCm), [heightCm]);
  const weightInLbs = useMemo(() => convertWeight(weightKg, 'kg', 'lbs')?.toFixed(0), [weightKg]);

  return (
    <>
      <div className="space-y-8">
        <div>
          <Label htmlFor="fullName" className="text-sm font-medium">What should we call you?</Label>
          <Input 
            id="fullName" 
            placeholder="e.g., Alex Smith" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 text-sm"
          />
        </div>

        <ValueSlider
          label="Height"
          value={heightCm}
          onValueChange={(val) => setHeightCm(val)}
          min={120}
          max={220}
          step={1}
          unit="cm"
          secondaryValue={heightInFtIn}
          secondaryUnit="ft in"
        />

        <ValueSlider
          label="Weight"
          value={weightKg}
          onValueChange={(val) => setWeightKg(val)}
          min={40}
          max={150}
          step={1}
          unit="kg"
          secondaryValue={weightInLbs}
          secondaryUnit="lbs"
        />

        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="bodyFatPct" className="text-sm font-medium">Body Fat (%) (Optional)</Label>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsBodyFatInfoModalOpen(true)}>
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <Input 
            id="bodyFatPct" 
            type="number" 
            inputMode="numeric" 
            step="1" 
            min="0"
            max="100"
            placeholder="e.g., 15" 
            value={bodyFatPct ?? ''}
            onChange={(e) => setBodyFatPct(e.target.value === '' ? null : parseInt(e.target.value))}
            className="max-w-[120px] mt-1 text-sm"
          />
        </div>
      </div>
      
      <div className="flex justify-end mt-8">
        <Button 
          onClick={handleNext} 
          disabled={!fullName || heightCm === null || weightKg === null}
        >
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