"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';

interface OnboardingStep3Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  handleNext: () => void;
  handleBack: () => void;
  tPathDescriptions: {
    ulul: { title: string; pros: string[]; cons: string[]; research: string[] };
    ppl: { title: string; pros: string[]; cons: string[]; research: string[] };
  };
}

export const OnboardingStep3_TPathSelection = ({
  tPathType,
  setTPathType,
  handleNext,
  handleBack,
  tPathDescriptions,
}: OnboardingStep3Props) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={cn(
            'cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105',
            tPathType === 'ulul' 
              ? 'border-workout-upper-body-a ring-2 ring-workout-upper-body-a shadow-lg' 
              : 'hover:border-workout-upper-body-a/50'
          )}
          onClick={() => setTPathType('ulul')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg text-workout-upper-body-a">{tPathDescriptions.ulul.title}</CardTitle>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
              <PopoverContent className="w-80 max-w-[90vw]"><ScrollArea className="h-48 pr-4"><div className="space-y-2"><p className="font-semibold text-sm">Benefits of Upper/Lower Split:</p><ul className="list-disc list-inside text-xs space-y-1">{tPathDescriptions.ulul.research.map((point, i) => (<li key={i}>{point}</li>))}</ul></div></ScrollArea></PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 text-sm">Pros:</h4>
              <ul className="text-xs space-y-1">{tPathDescriptions.ulul.pros.map((pro, i) => (<li key={i} className="flex items-start"><span className="text-green-500 mr-2">✓</span>{pro}</li>))}</ul>
              <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4>
              <ul className="text-xs space-y-1">{tPathDescriptions.ulul.cons.map((con, i) => (<li key={i} className="flex items-start"><span className="text-red-500 mr-2">✗</span>{con}</li>))}</ul>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            'cursor-pointer transition-all duration-300 ease-in-out transform hover:scale-105',
            tPathType === 'ppl' 
              ? 'border-workout-push ring-2 ring-workout-push shadow-lg' 
              : 'hover:border-workout-push/50'
          )}
          onClick={() => setTPathType('ppl')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-lg text-workout-push">{tPathDescriptions.ppl.title}</CardTitle>
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
              <PopoverContent className="w-80 max-w-[90vw]"><ScrollArea className="h-48 pr-4"><div className="space-y-2"><p className="font-semibold text-sm">Benefits of Push/Pull/Legs Split:</p><ul className="list-disc list-inside text-xs space-y-1">{tPathDescriptions.ppl.research.map((point, i) => (<li key={i}>{point}</li>))}</ul></div></ScrollArea></PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 text-sm">Pros:</h4>
              <ul className="text-xs space-y-1">{tPathDescriptions.ppl.pros.map((pro, i) => (<li key={i} className="flex items-start"><span className="text-green-500 mr-2">✓</span>{pro}</li>))}</ul>
              <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4>
              <ul className="text-xs space-y-1">{tPathDescriptions.ppl.cons.map((con, i) => (<li key={i} className="flex items-start"><span className="text-red-500 mr-2">✗</span>{con}</li>))}</ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button onClick={handleNext} disabled={!tPathType}>Next</Button>
      </div>
    </div>
  );
};