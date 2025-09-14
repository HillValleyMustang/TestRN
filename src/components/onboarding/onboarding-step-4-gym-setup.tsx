"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Camera, SkipForward } from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils'; // Import cn for conditional classes

interface OnboardingStep4Props {
  equipmentMethod: "photo" | "skip" | null;
  setEquipmentMethod: (value: "photo" | "skip") => void;
  handleNext: () => void;
  handleBack: () => void;
  gymName: string;
  setGymName: (value: string) => void;
}

export const OnboardingStep4_GymSetup = ({
  equipmentMethod,
  setEquipmentMethod,
  handleNext,
  handleBack,
  gymName,
  setGymName,
}: OnboardingStep4Props) => {
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
          className="mt-1 text-sm" // Reduced text size
        />
        <p className="text-sm text-muted-foreground mt-1">
          Give your primary gym a name.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Use grid for cards */}
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center",
            equipmentMethod === 'photo' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setEquipmentMethod('photo')}
        >
          <CardHeader className="pb-2">
            <Camera className="h-8 w-8 mx-auto mb-2 text-primary" /> {/* Icon */}
            <CardTitle className="text-lg">Upload Gym Photos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Take photos of your gym to help us identify available equipment.
            </p>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "cursor-pointer transition-all min-h-[120px] flex flex-col justify-center text-center",
            equipmentMethod === 'skip' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary/50'
          )}
          onClick={() => setEquipmentMethod('skip')}
        >
          <CardHeader className="pb-2">
            <SkipForward className="h-8 w-8 mx-auto mb-2 text-primary" /> {/* Icon */}
            <CardTitle className="text-lg">Skip for Now</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
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