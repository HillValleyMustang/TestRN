"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";

interface OnboardingStep4Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  handleSubmit: () => Promise<void>;
  gymName: string;
  setGymName: (value: string) => void;
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  loading: boolean;
}

export const OnboardingStep4_GymSetupAndConsent = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  handleSubmit,
  gymName,
  setGymName,
  consentGiven,
  setConsentGiven,
  loading,
}: OnboardingStep4Props) => {
  const isNextDisabled = !equipmentMethod || !gymName.trim() || !consentGiven;

  const handleFinalStep = () => {
    if (equipmentMethod === 'skip') {
      handleSubmit();
    } else { // equipmentMethod === 'photo'
      handleNext();
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 animate-in slide-in-from-bottom-4 duration-500">
        <Label htmlFor="gymName" className="text-sm font-medium">1. Your Gym's Name</Label>
        <Input
          id="gymName"
          placeholder="e.g., Home Gym, Fitness First"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          required
          className="mt-1 text-sm focus:border-workout-lower-body-b focus:bg-workout-lower-body-b/5"
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground mt-1">Give your primary gym a name.</p>
      </div>

      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
        <h3 className="font-semibold">2. Equipment Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn(
            "relative cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center border-2 overflow-hidden",
            "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-workout-lower-body-b before:scale-x-0 before:origin-left before:transition-transform before:duration-300",
            "hover:before:scale-x-100 hover:border-workout-lower-body-b/50",
            equipmentMethod === 'photo' ? 'border-workout-lower-body-b before:scale-x-100' : 'border-border'
          )} onClick={() => setEquipmentMethod('photo')}>
            <CardHeader className="pb-2">
              <Camera className={cn("h-8 w-8 mx-auto mb-2", equipmentMethod === 'photo' ? "text-workout-lower-body-b" : "text-primary")} />
              <CardTitle className="text-lg">Upload Gym Photos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Help us identify available equipment.</p>
            </CardContent>
          </Card>
          <Card className={cn(
            "relative cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center border-2 overflow-hidden",
            "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-workout-lower-body-b before:scale-x-0 before:origin-left before:transition-transform before:duration-300",
            "hover:before:scale-x-100 hover:border-workout-lower-body-b/50",
            equipmentMethod === 'skip' ? 'border-workout-lower-body-b before:scale-x-100' : 'border-border'
          )} onClick={() => setEquipmentMethod('skip')}>
            <CardHeader className="pb-2">
              <SkipForward className={cn("h-8 w-8 mx-auto mb-2", equipmentMethod === 'skip' ? "text-workout-lower-body-b" : "text-primary")} />
              <CardTitle className="text-lg">Skip for Now</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Use a default "Common Gym" set.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-start space-x-2 pt-4 animate-in slide-in-from-bottom-4 duration-1000">
        <Checkbox
          id="consent"
          checked={consentGiven}
          onCheckedChange={(checked) => setConsentGiven(!!checked)}
          className={cn(
            "h-5 w-5 rounded-md border-2 transition-all duration-300 mt-0.5 flex-shrink-0",
            consentGiven ? "bg-green-500 border-green-500 scale-110" : "border-muted-foreground"
          )}
          disabled={loading}
        />
        <Label htmlFor="consent" className="text-sm text-muted-foreground">
          I consent to storing my workout data and profile information to provide personalised training recommendations. I understand I can delete my data at any time.
        </Label>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={loading}>Back</Button>
        <Button
          onClick={handleFinalStep}
          disabled={isNextDisabled || loading}
          className={cn(
            "flex-1 h-12 text-base font-semibold relative overflow-hidden",
            isNextDisabled || loading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-gradient-to-r from-workout-lower-body-b to-workout-lower-body-b-light text-white hover:-translate-y-0.5 hover:shadow-lg'
          )}
        >
          {!isNextDisabled && !loading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
          )}
          <span className="relative">{loading ? "Setting up..." : (equipmentMethod === 'skip' ? "Complete Setup" : "Next")}</span>
        </Button>
      </div>
    </div>
  );
};