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
  const isNextDisabled = !equipmentMethod || !gymName || !consentGiven;

  const handleFinalStep = () => {
    if (equipmentMethod === 'skip') {
      handleSubmit();
    } else {
      handleNext();
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="gymName" className="text-sm font-medium">1. Your Gym's Name</Label>
        <Input
          id="gymName"
          placeholder="e.g., Home Gym, Fitness First"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          required
          className="mt-1 text-sm"
        />
        <p className="text-sm text-muted-foreground mt-1">Give your primary gym a name.</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">2. Equipment Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className={cn("cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center", equipmentMethod === 'photo' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setEquipmentMethod('photo')}>
            <CardHeader className="pb-2"><Camera className="h-8 w-8 mx-auto mb-2 text-primary" /><CardTitle className="text-lg">Upload Gym Photos</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-sm text-muted-foreground">Help us identify available equipment.</p></CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center", equipmentMethod === 'skip' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setEquipmentMethod('skip')}>
            <CardHeader className="pb-2"><SkipForward className="h-8 w-8 mx-auto mb-2 text-primary" /><CardTitle className="text-lg">Skip for Now</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-sm text-muted-foreground">Use a default "Common Gym" set.</p></CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-start space-x-2 pt-4">
        <Checkbox id="consent" checked={consentGiven} onCheckedChange={(checked) => setConsentGiven(!!checked)} />
        <Label htmlFor="consent" className="text-sm">
          I consent to storing my workout data and profile information to provide personalised training recommendations. I understand I can delete my data at any time.
        </Label>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleFinalStep} disabled={isNextDisabled || loading}>
          {loading ? "Setting up..." : (equipmentMethod === 'skip' ? "Complete Setup" : "Next")}
        </Button>
      </div>
    </div>
  );
};