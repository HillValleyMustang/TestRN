"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Info } from 'lucide-react';
import { BodyFatInfoModal } from './body-fat-info-modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components
import { cn } from '@/lib/utils'; // Import cn for conditional classes

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

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 to-background shadow-lg p-6"> {/* Added Card wrapper with gradient */}
        <CardHeader className="text-center mb-6">
          <CardTitle className="text-3xl font-bold text-primary">Almost There!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Just a few more details to unlock your personalised fitness journey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium">Preferred Name</Label>
              <Input 
                id="fullName" 
                placeholder="e.g., John Doe" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4"> {/* Changed to flex-col on small screens */}
              <div className="flex-1">
                <Label htmlFor="heightCm" className="text-sm font-medium">Height (cm)</Label>
                <Input 
                  id="heightCm" 
                  type="number" 
                  inputMode="numeric" 
                  step="1" 
                  placeholder="e.g., 175" 
                  value={heightCm ?? ''}
                  onChange={(e) => setHeightCm(parseInt(e.target.value) || null)}
                  required
                  className="mt-1 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="weightKg" className="text-sm font-medium">Weight (kg)</Label>
                <Input 
                  id="weightKg" 
                  type="number" 
                  inputMode="numeric" 
                  step="1" 
                  placeholder="e.g., 70" 
                  value={weightKg ?? ''}
                  onChange={(e) => setWeightKg(parseInt(e.target.value) || null)}
                  required
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="bodyFatPct" className="text-sm font-medium">Body Fat (%) (Optional)</Label>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsBodyFatInfoModalOpen(true)}>
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

            <div className="flex items-start space-x-2 pt-4">
              <Checkbox 
                id="consent" 
                checked={consentGiven}
                onCheckedChange={(checked) => setConsentGiven(!!checked)}
              />
              <Label htmlFor="consent" className="text-sm">
                I consent to storing my workout data and profile information to provide 
                personalised training recommendations. I understand I can delete my data 
                at any time through my profile settings.
              </Label>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4"> {/* Responsive buttons */}
            <Button variant="outline" onClick={handleBack} size="sm" className="flex-1">
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!consentGiven || loading || !fullName || heightCm === null || weightKg === null}
              size="lg" // Made larger
              variant="default" // Use default variant for primary action color
              className="flex-1"
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