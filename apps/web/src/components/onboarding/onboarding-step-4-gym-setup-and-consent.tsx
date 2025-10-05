"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils'; // Keep web-specific utils;
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
      {/* Section 1: Gym Name */}
      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold bg-workout-lower-body-b">1</div>
          <h2 className="text-lg font-bold text-slate-900">Your Gym's Name</h2>
        </div>
        <Input
          id="gymName"
          placeholder="e.g., Home Gym, Fitness First"
          value={gymName}
          onChange={(e) => setGymName(e.target.value)}
          required
          className="w-full border-2 border-slate-200 rounded-xl p-4 text-base text-slate-600 transition-all duration-200 outline-none focus:bg-purple-50 focus:border-workout-lower-body-b"
          disabled={loading}
        />
        <p className="text-xs text-slate-500 italic mt-2 ml-1">Give your primary gym a name</p>
      </div>

      {/* Section 2: Equipment Setup */}
      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold bg-workout-lower-body-b">2</div>
          <h2 className="text-lg font-bold text-slate-900">Equipment Setup</h2>
        </div>
        <div className="space-y-4">
          <div
            onClick={() => setEquipmentMethod('photo')}
            className={cn(
              "relative bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-md",
              equipmentMethod === 'photo' ? '-translate-y-1 border-workout-lower-body-b border-[3px]' : 'hover:-translate-y-0.5 border-slate-200'
            )}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-workout-lower-body-b transition-transform duration-400" style={{ transform: equipmentMethod === 'photo' ? 'translateX(0)' : 'translateX(-100%)' }} />
            <div className="flex items-center gap-4 mb-3">
              <div className={cn("w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl transition-all duration-300", equipmentMethod === 'photo' && 'scale-110 bg-purple-50')}>📸</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">Upload Gym Photos</span>
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide">AI Powered</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">Smart equipment detection</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-1">Our AI will automatically identify your available equipment from photos</p>
          </div>
          <div
            onClick={() => setEquipmentMethod('skip')}
            className={cn(
              "relative bg-white border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-md",
              equipmentMethod === 'skip' ? '-translate-y-1 border-workout-lower-body-b border-[3px]' : 'hover:-translate-y-0.5 border-slate-200'
            )}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-workout-lower-body-b transition-transform duration-400" style={{ transform: equipmentMethod === 'skip' ? 'translateX(0)' : 'translateX(-100%)' }} />
            <div className="flex items-center gap-4 mb-3">
              <div className={cn("w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl transition-all duration-300", equipmentMethod === 'skip' && 'scale-110 bg-purple-50')}>⚡</div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Skip for Now</h3>
                <p className="text-sm text-slate-500 font-medium">Use standard equipment set</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed mb-1">Start with a common gym setup - customise later in your profile</p>
          </div>
        </div>
      </div>

      {/* Section 3: Consent */}
      <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold bg-workout-lower-body-b">3</div>
          <h2 className="text-lg font-bold text-slate-900">Data Consent</h2>
        </div>
        <div className={cn("relative bg-slate-50 border-2 rounded-2xl p-5 overflow-hidden", consentGiven ? 'border-green-200' : 'border-slate-200')}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600 transition-transform duration-400" style={{ transform: consentGiven ? 'translateX(0)' : 'translateX(-100%)' }} />
          <div onClick={() => setConsentGiven(!consentGiven)} className="flex items-start gap-3 cursor-pointer">
            <div className={cn("w-5 h-5 border-2 rounded-md bg-white flex items-center justify-center transition-all duration-300 mt-0.5 flex-shrink-0", consentGiven && 'scale-110 bg-green-500 border-green-500')}>
              {consentGiven && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">I consent to storing my workout data and profile information to provide personalised training recommendations. I understand I can delete my data at any time.</p>
              <div className="mt-3 p-3 bg-white rounded-lg border-l-4 border-green-500">
                <p className="text-xs text-slate-500 leading-relaxed">💡 Your data helps create better workouts tailored specifically for you</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack} disabled={loading} className="flex-1 h-12 text-base font-semibold border-2">Back</Button>
        <Button
          onClick={handleFinalStep}
          disabled={isNextDisabled || loading}
          className={cn(
            "flex-1 h-12 text-base font-semibold relative overflow-hidden transition-all duration-200",
            isNextDisabled || loading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'text-white bg-gradient-to-r from-workout-lower-body-b to-purple-800 hover:-translate-y-0.5 hover:shadow-lg'
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