"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"; // Import Input
import { Textarea } from "@/components/ui/textarea"; // Import Textarea

interface OnboardingStep6Props {
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleBack: () => void;
  loading: boolean;
  // New props for personal details
  fullName: string;
  setFullName: (value: string) => void;
  heightCm: number | null;
  setHeightCm: (value: number | null) => void;
  weightKg: number | null;
  setWeightKg: (value: number | null) => void;
  bodyFatPct: number | null;
  setBodyFatPct: (value: number | null) => void;
}

export const OnboardingStep6_Consent = ({
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
}: OnboardingStep6Props) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Personal Details Inputs */}
        <div>
          <Label htmlFor="fullName">Your Name</Label>
          <Input 
            id="fullName" 
            placeholder="e.g., John Doe" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="heightCm">Height (cm) (Optional)</Label>
            <Input 
              id="heightCm" 
              type="number" 
              inputMode="numeric" 
              step="1" 
              placeholder="e.g., 175" 
              value={heightCm ?? ''}
              onChange={(e) => setHeightCm(e.target.value === '' ? null : parseInt(e.target.value))}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="weightKg">Weight (kg) (Optional)</Label>
            <Input 
              id="weightKg" 
              type="number" 
              inputMode="numeric" 
              step="1" 
              placeholder="e.g., 70" 
              value={weightKg ?? ''}
              onChange={(e) => setWeightKg(e.target.value === '' ? null : parseInt(e.target.value))}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="bodyFatPct">Body Fat (%) (Optional)</Label>
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
          />
        </div>

        {/* Consent Section */}
        <div className="flex items-start space-x-2">
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
        
        <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Data Privacy Information:</h4>
          <ul className="space-y-1">
            <li>• Photos are processed for equipment detection only</li>
            <li>• Not used for identity or shared publicly</li>
            <li>• Stored until you delete or replace them</li>
            <li>• You can export or delete your data anytime</li>
          </ul>
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!consentGiven || loading || !fullName} // Disable if full name is empty
        >
          {loading ? "Completing Setup..." : "Complete Onboarding"}
        </Button>
      </div>
    </div>
  );
};