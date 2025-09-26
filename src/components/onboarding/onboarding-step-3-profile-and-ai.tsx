"use client";

import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { BodyFatInfoModal } from './body-fat-info-modal';
import { Info } from 'lucide-react';

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
  const [activeInput, setActiveInput] = useState<'height' | 'weight' | 'bodyfat'>('height');
  const [bodyFat, setBodyFat] = useState<number | null>(15);
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false);

  const isNextDisabled = !fullName || !heightCm || !weightKg || !consentGiven;

  const heightInFeetInches = useMemo(() => {
    if (!heightCm) return '';
    const inches = heightCm / 2.54;
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    return `${feet} ft ${remainingInches} in`;
  }, [heightCm]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Preferred Name</Label>
        <Input 
          id="fullName" 
          placeholder="John Doe" 
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="bg-secondary border-border h-12 text-base"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Height Button */}
        <div
          className={cn(
            "rounded-lg p-2 border-2 transition-all cursor-pointer",
            activeInput === 'height' ? 'border-teal' : 'border-border'
          )}
          onClick={() => setActiveInput('height')}
        >
          <Label className="text-xs text-muted-foreground">Height (cm)</Label>
          <p className="text-lg font-bold">{heightCm || '...'}</p>
          {activeInput === 'height' && <div className="text-xs font-bold text-teal">ACTIVE</div>}
        </div>
        {/* Weight Button */}
        <div
          className={cn(
            "rounded-lg p-2 border-2 transition-all cursor-pointer",
            activeInput === 'weight' ? 'border-teal' : 'border-border'
          )}
          onClick={() => setActiveInput('weight')}
        >
          <Label className="text-xs text-muted-foreground">Weight (kg)</Label>
          <p className="text-lg font-bold">{weightKg || '...'}</p>
          {activeInput === 'weight' && <div className="text-xs font-bold text-teal">ACTIVE</div>}
        </div>
        {/* Body Fat Button */}
        <div
          className={cn(
            "rounded-lg p-2 border-2 transition-all cursor-pointer",
            activeInput === 'bodyfat' ? 'border-teal' : 'border-border'
          )}
          onClick={() => setActiveInput('bodyfat')}
        >
          <Label className="text-xs text-muted-foreground flex items-center">
            Body Fat (%)
            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={(e) => { e.stopPropagation(); setIsBodyFatInfoModalOpen(true); }}>
              <Info className="h-3 w-3" />
            </Button>
          </Label>
          <p className="text-lg font-bold">{bodyFat || '...'}</p>
          {activeInput === 'bodyfat' && <div className="text-xs font-bold text-teal">ACTIVE</div>}
        </div>
      </div>

      <div className="p-4 rounded-lg border-2 border-teal bg-secondary/50 min-h-[120px] flex flex-col justify-center items-center">
        {activeInput === 'height' && (
          <>
            <p className="text-3xl font-bold">{heightCm} cm</p>
            <p className="text-muted-foreground">{heightInFeetInches}</p>
            <Slider
              value={[heightCm || 175]}
              onValueChange={(value) => setHeightCm(value[0])}
              min={100}
              max={250}
              step={1}
              className="w-full mt-4"
            />
          </>
        )}
        {activeInput === 'weight' && (
          <>
            <p className="text-3xl font-bold">{weightKg} kg</p>
            <p className="text-muted-foreground">{((weightKg || 0) * 2.20462).toFixed(1)} lbs</p>
            <Slider
              value={[weightKg || 75]}
              onValueChange={(value) => setWeightKg(value[0])}
              min={30}
              max={200}
              step={1}
              className="w-full mt-4"
            />
          </>
        )}
        {activeInput === 'bodyfat' && (
          <>
            <p className="text-3xl font-bold">{bodyFat}%</p>
            <p className="text-muted-foreground">Body Fat Percentage</p>
            <Slider
              value={[bodyFat || 15]}
              onValueChange={(value) => setBodyFat(value[0])}
              min={3}
              max={50}
              step={1}
              className="w-full mt-4"
            />
          </>
        )}
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
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={isNextDisabled}
          size="lg"
          className="bg-gradient-primary text-primary-foreground font-bold"
        >
          Next
        </Button>
      </div>
      <BodyFatInfoModal open={isBodyFatInfoModalOpen} onOpenChange={setIsBodyFatInfoModalOpen} />
    </div>
  );
};