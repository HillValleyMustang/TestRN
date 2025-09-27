"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

interface OnboardingStep2Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  experience: "beginner" | "intermediate" | null;
  setExperience: (value: "beginner" | "intermediate") => void;
  handleNext: () => void;
  handleBack: () => void;
  tPathDescriptions: {
    ulul: { title: string; pros: string[]; cons: string[]; research: string[] };
    ppl: { title: string; pros: string[]; cons: string[]; research: string[] };
  };
}

export const OnboardingStep2_TrainingSetup = ({
  tPathType,
  setTPathType,
  experience,
  setExperience,
  handleNext,
  handleBack,
  tPathDescriptions,
}: OnboardingStep2Props) => {
  return (
    <div className="space-y-8">
      {/* T-Path Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold">1. Choose Your Transformation Path</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${tPathType === 'ulul' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'}`}
            onClick={() => setTPathType('ulul')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">{tPathDescriptions.ulul.title}</CardTitle>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
                <PopoverContent className="w-80 max-w-[90vw]"><ScrollArea className="h-48 pr-4"><div className="space-y-2"><p className="font-semibold text-sm">Benefits of Upper/Lower Split:</p><ul className="list-disc list-inside text-xs space-y-1">{tPathDescriptions.ulul.research.map((point, i) => (<li key={i}>{point}</li>))}</ul></div></ScrollArea></PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">Best for 4 training days per week.</p></CardContent>
          </Card>
          <Card 
            className={`cursor-pointer transition-all ${tPathType === 'ppl' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary'}`}
            onClick={() => setTPathType('ppl')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg">{tPathDescriptions.ppl.title}</CardTitle>
              <Popover>
                <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
                <PopoverContent className="w-80 max-w-[90vw]"><ScrollArea className="h-48 pr-4"><div className="space-y-2"><p className="font-semibold text-sm">Benefits of Push/Pull/Legs Split:</p><ul className="list-disc list-inside text-xs space-y-1">{tPathDescriptions.ppl.research.map((point, i) => (<li key={i}>{point}</li>))}</ul></div></ScrollArea></PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent><p className="text-xs text-muted-foreground">Best for 3 training days per week.</p></CardContent>
          </Card>
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-4">
        <h3 className="font-semibold">2. Your Experience Level</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={cn("cursor-pointer transition-all min-h-[120px] flex flex-col justify-center", experience === 'beginner' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')}
            onClick={() => setExperience('beginner')}
          >
            <CardHeader className="pb-2"><CardTitle className="text-lg text-center">Beginner</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-sm text-muted-foreground text-center">New to structured training or returning after a long break.</p></CardContent>
          </Card>
          <Card 
            className={cn("cursor-pointer transition-all min-h-[120px] flex flex-col justify-center", experience === 'intermediate' ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50')}
            onClick={() => setExperience('intermediate')}
          >
            <CardHeader className="pb-2"><CardTitle className="text-lg text-center">Intermediate</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-sm text-muted-foreground text-center">Some experience with structured training programs.</p></CardContent>
          </Card>
        </div>
      </div>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleNext} disabled={!tPathType || !experience}>Next</Button>
      </div>
    </div>
  );
};