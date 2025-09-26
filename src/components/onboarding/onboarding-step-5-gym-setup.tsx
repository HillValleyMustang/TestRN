"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep5Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  gymName: string;
  setGymName: (value: string) => void;
}

export const OnboardingStep5_GymSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  gymName,
  setGymName,
}: OnboardingStep5Props) => {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="gymName" className="text-sm font-medium">Your Gym's Name</Label>
        <Input
          id="gymName"
          placeholder="e.g., Home Gym, Fitness First"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          required
          className="mt-1 text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Give your primary gym a name. You can add more later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[100px] flex flex-col justify-center text-center p-4",
            equipmentMethod === 'photo' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setEquipmentMethod('photo')}
        >
          <CardHeader className="p-0 pb-2">
            <Camera className="h-6 w-6 mx-auto mb-1 text-primary" />
            <CardTitle className="text-base font-semibold">Upload Gym Photos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-xs text-muted-foreground">
              Our AI will identify available equipment.
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[100px] flex flex-col justify-center text-center p-4",
            equipmentMethod === 'skip' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setEquipmentMethod('skip')}
        >
          <CardHeader className="p-0 pb-2">
            <SkipForward className="h-6 w-6 mx-auto mb-1 text-primary" />
            <CardTitle className="text-base font-semibold">Skip for Now</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-xs text-muted-foreground">
              Use a default "Common Gym" equipment set.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!equipmentMethod || !gymName}
        >
          Next
        </Button>
      </div>
    </div>
  );
};