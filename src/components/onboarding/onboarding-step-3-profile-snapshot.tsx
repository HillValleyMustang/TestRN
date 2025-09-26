"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from '@/lib/utils';
import { MetricSlider } from './metric-slider';
import { BodyFatInfoModal } from './body-fat-info-modal';
import { Info } from 'lucide-react';

interface OnboardingStep3Props {
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
  bodyFatPct: number | null;
  setBodyFatPct: (value: number | null) => void;
  handleNext: () => void;
  handleBack: () => void;
}

type ActiveMetric = 'height' | 'weight' | 'bodyfat';

export const OnboardingStep3_ProfileSnapshot = ({
  fullName,
  setFullName,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  bodyFatPct,
  setBodyFatPct,
  handleNext,
  handleBack,
}: OnboardingStep3Props) => {
  const [activeMetric, setActiveMetric] = useState<ActiveMetric>('height');
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false);

  const cmToFeetAndInches = (cm: number) => {
    const inches = cm / 2.54;
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    return `${feet} ft ${remainingInches} in`;
  };

  const isNextDisabled = !fullName || !heightCm || !weightKg;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-base font-semibold">Your Preferred Name</Label>
          <Input 
            id="fullName" 
            placeholder="e.g., Alex Doe" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="text-base"
          />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={activeMetric === 'height' ? 'default' : 'outline'}
              onClick={() => setActiveMetric('height')}
              className="flex-1"
            >
              Height (cm)
            </Button>
            <Button
              type="button"
              variant={activeMetric === 'weight' ? 'default' : 'outline'}
              onClick={() => setActiveMetric('weight')}
              className="flex-1"
            >
              Weight (kg)
            </Button>
            <Button
              type="button"
              variant={activeMetric === 'bodyfat' ? 'default' : 'outline'}
              onClick={() => setActiveMetric('bodyfat')}
              className="flex-1"
            >
              Body Fat (%)
              <Info className="h-3 w-3 ml-1.5 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsBodyFatInfoModalOpen(true); }} />
            </Button>
          </div>

          {activeMetric === 'height' && (
            <MetricSlider
              value={heightCm || 175}
              onValueChange={(val) => setHeightCm(val)}
              min={100}
              max={250}
              step={1}
              unit="cm"
              conversionFn={cmToFeetAndInches}
            />
          )}
          {activeMetric === 'weight' && (
            <MetricSlider
              value={weightKg || 75}
              onValueChange={(val) => setWeightKg(val)}
              min={30}
              max={200}
              step={1}
              unit="kg"
            />
          )}
          {activeMetric === 'bodyfat' && (
            <MetricSlider
              value={bodyFatPct || 15}
              onValueChange={(val) => setBodyFatPct(val)}
              min={3}
              max={50}
              step={1}
              unit="%"
            />
          )}
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
      <BodyFatInfoModal
        open={isBodyFatInfoModalOpen}
        onOpenChange={setIsBodyFatInfoModalOpen}
      />
    </>
  );
};