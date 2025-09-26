"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface OnboardingStep4Props {
  sessionLength: string;
  setSessionLength: (value: string) => void;
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  gymName: string;
  setGymName: (value: string) => void;
}

const sessionLengthOptions = [
  { value: "15-30", label: "15-30 mins" },
  { value: "30-45", label: "30-45 mins" },
  { value: "45-60", label: "45-60 mins" },
  { value: "60-90", label: "60-90 mins" },
];

export const OnboardingStep4_ScheduleAndTools = ({
  sessionLength,
  setSessionLength,
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  gymName,
  setGymName,
}: OnboardingStep4Props) => {
  return (
    <div className="space-y-8">
      <div>
        <Label className="text-base font-semibold">How long are your typical sessions?</Label>
        <RadioGroup 
          value={sessionLength} 
          onValueChange={setSessionLength}
          className="grid grid-cols-2 gap-3 mt-2"
        >
          {sessionLengthOptions.map(option => (
            <Label
              key={option.value}
              htmlFor={option.value}
              className={cn(
                "cursor-pointer transition-all border-2 rounded-lg flex items-center justify-center text-center p-3 font-semibold",
                sessionLength === option.value
                  ? 'border-primary ring-2 ring-primary bg-primary/10'
                  : 'border-input bg-card hover:border-primary/50'
              )}
            >
              <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
              {option.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-base font-semibold">How should we set up your equipment?</Label>
        <div className="mt-2">
          <Label htmlFor="gymName" className="text-sm font-medium">Your Gym's Name</Label>
          <Input id="gymName" placeholder="e.g., Home Gym, Fitness First" value={gymName} onChange={(e) => setGymName(e.target.value)} required className="mt-1 text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <Card className={cn("cursor-pointer transition-all min-h-[100px] flex flex-col justify-center text-center p-4", equipmentMethod === 'photo' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setEquipmentMethod('photo')}>
            <CardHeader className="p-0 pb-2"><Camera className="h-6 w-6 mx-auto mb-1 text-primary" /><CardTitle className="text-base font-semibold">Analyse My Gym</CardTitle></CardHeader>
            <CardContent className="p-0"><p className="text-xs text-muted-foreground">Use AI to identify equipment from photos.</p></CardContent>
          </Card>
          <Card className={cn("cursor-pointer transition-all min-h-[100px] flex flex-col justify-center text-center p-4", equipmentMethod === 'skip' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')} onClick={() => setEquipmentMethod('skip')}>
            <CardHeader className="p-0 pb-2"><SkipForward className="h-6 w-6 mx-auto mb-1 text-primary" /><CardTitle className="text-base font-semibold">Use Defaults</CardTitle></CardHeader>
            <CardContent className="p-0"><p className="text-xs text-muted-foreground">Start with a common set of gym exercises.</p></CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleNext} disabled={!equipmentMethod || !gymName || !sessionLength}>Next</Button>
      </div>
    </div>
  );
};