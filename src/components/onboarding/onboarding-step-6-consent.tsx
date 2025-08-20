"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface OnboardingStep6Props {
  consentGiven: boolean;
  setConsentGiven: (checked: boolean) => void;
  handleSubmit: () => Promise<void>;
  handleBack: () => void;
  loading: boolean;
}

export const OnboardingStep6_Consent = ({
  consentGiven,
  setConsentGiven,
  handleSubmit,
  handleBack,
  loading,
}: OnboardingStep6Props) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
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
          disabled={!consentGiven || loading}
        >
          {loading ? "Completing Setup..." : "Complete Onboarding"}
        </Button>
      </div>
    </div>
  );
};