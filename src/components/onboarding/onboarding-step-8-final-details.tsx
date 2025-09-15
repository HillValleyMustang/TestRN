"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info, ChevronDown, ChevronUp } from 'lucide-react'; // Added ChevronDown, ChevronUp
import { BodyFatInfoModal } from './body-fat-info-modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { NumericInputWithSlider } from './numeric-input-with-slider'; // Import the new component

interface OnboardingStep8Props {
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleBack: () => void;
  loading: boolean;
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
  bodyFatPct: number | null;
  setBodyFatPct: (value: number | null) => void;
}

export const OnboardingStep8_FinalDetails = ({
  consentGiven,
  setConsentGiven,
  handleSubmit,
  handleBack,
  loading,
  fullName,
  setFullName,
  heightCm,
  setHeightCm,
  weightKg,
  setWeightKg,
  bodyFatPct,
  setBodyFatPct,
}: OnboardingStep8Props) => {
  const [isBodyFatInfoModalOpen, setIsBodyFatInfoModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFocusChange = useCallback((id: string, focused: boolean) => {
    setFocusedField(focused ? id : null);
  }, []);

  const handleNextField = useCallback((currentId: string) => {
    if (currentId === 'heightCm') {
      setFocusedField('weightKg');
    } else if (currentId === 'weightKg') {
      setFocusedField('bodyFatPct');
    } else if (currentId === 'bodyFatPct') {
      setFocusedField(null); // All fields processed, unfocus
    }
  }, []);

  // Auto-focus the next field when focusedField changes
  useEffect(() => {
    if (focusedField) {
      const element = document.getElementById(focusedField);
      if (element) {
        element.focus();
      }
    }
  }, [focusedField]);

  const isFormValid = consentGiven && fullName && heightCm !== null && weightKg !== null;

  return (
    <>
      <Card className="bg-white shadow-lg p-6 border-onboarding-border-light-gray rounded-[var(--radius)]">
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-3xl font-bold text-onboarding-primary">Almost There!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Just a few more details to unlock your personalised fitness journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="input-focus-glow rounded-lg border-2 border-onboarding-border-light-gray bg-onboarding-background-light-gray transition-all duration-300 ease-in-out">
              <Label htmlFor="fullName" className="sr-only">Preferred Name</Label>
              <Input 
                id="fullName" 
                placeholder="Preferred Name (e.g., John Doe)" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 text-base border-none bg-transparent focus:ring-0 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumericInputWithSlider
                id="heightCm"
                label="Height (cm)"
                value={heightCm}
                onChange={setHeightCm}
                unit="cm"
                conversionUnit="ft/in"
                min={100}
                max={250}
                step={1}
                isFocused={focusedField === 'heightCm'}
                onFocusChange={handleFocusChange}
                onNext={handleNextField}
                isLastField={false}
                errorMessage={heightCm === null || heightCm < 100 || heightCm > 250 ? "Height must be between 100-250 cm" : undefined}
              />
              <NumericInputWithSlider
                id="weightKg"
                label="Weight (kg)"
                value={weightKg}
                onChange={setWeightKg}
                unit="kg"
                conversionUnit="lbs"
                min={30}
                max={200}
                step={1}
                isFocused={focusedField === 'weightKg'}
                onFocusChange={handleFocusChange}
                onNext={handleNextField}
                isLastField={false}
                errorMessage={weightKg === null || weightKg < 30 || weightKg > 200 ? "Weight must be between 30-200 kg" : undefined}
              />
              <div className={cn(
                "relative rounded-lg border-2 transition-all duration-300 ease-in-out",
                focusedField === 'bodyFatPct' ? "border-onboarding-primary ring-2 ring-onboarding-primary/30 shadow-md" : "border-onboarding-border-light-gray hover:border-onboarding-primary/50",
                bodyFatPct !== null && (bodyFatPct < 0 || bodyFatPct > 100) ? "border-destructive ring-2 ring-destructive/30" : ""
              )}>
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => {
                    if (focusedField !== 'bodyFatPct') {
                      handleFocusChange('bodyFatPct', true);
                    }
                  }}
                >
                  <Label htmlFor="bodyFatPct" className="font-medium text-base">Body Fat (%)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-onboarding-primary">
                      {bodyFatPct ?? '-'}%
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setIsBodyFatInfoModalOpen(true); }}>
                      <Info className="h-5 w-5 text-onboarding-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleFocusChange('bodyFatPct', focusedField !== 'bodyFatPct'); }}
                      className="h-8 w-8"
                    >
                      {focusedField === 'bodyFatPct' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
                {focusedField === 'bodyFatPct' && (
                  <div className="p-4 border-t border-onboarding-border-light-gray space-y-4 animate-fade-in-slide-up">
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
                      className="w-full bg-onboarding-background-light-gray border-onboarding-border-light-gray text-base input-focus-glow"
                      onFocus={() => handleFocusChange('bodyFatPct', true)}
                      onBlur={() => handleFocusChange('bodyFatPct', false)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      *Body fat percentage is optional
                    </p>
                    {bodyFatPct !== null && (bodyFatPct < 0 || bodyFatPct > 100) && (
                      <p className="text-destructive text-sm mt-1">Body Fat % must be between 0-100.</p>
                    )}
                    <Button 
                      onClick={() => handleNextField('bodyFatPct')} 
                      className="w-full onboarding-button-gradient"
                      disabled={bodyFatPct !== null && (bodyFatPct < 0 || bodyFatPct > 100)}
                    >
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-4">
              <Checkbox 
                id="consent" 
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(!!checked)}
                className="h-5 w-5 border-onboarding-primary data-[state=checked]:bg-onboarding-primary data-[state=checked]:text-white"
                style={{
                  background: consentGiven ? 'var(--onboarding-checkbox-gradient)' : 'transparent',
                  borderColor: 'hsl(var(--onboarding-primary))',
                }}
              />
              <Label htmlFor="consent" className="text-sm">
                I consent to storing my workout data and profile information to provide 
                personalised training recommendations. I understand I can delete my data 
                at any time through my profile settings.
              </Label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button variant="outline" onClick={handleBack} size="lg" className="flex-1 text-base">
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isFormValid || loading}
              size="lg"
              className="flex-1 text-base onboarding-button-gradient"
            >
              {loading ? "Completing Setup..." : "Complete Onboarding"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <BodyFatInfoModal
        open={isBodyFatInfoModalOpen}
        onOpenChange={setIsBodyFatInfoModalOpen}
      />
    </>
  );
};