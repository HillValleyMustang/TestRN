"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { cn } from '@/lib/utils';

interface OnboardingStep1Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  handleNext: () => void;
  tPathDescriptions: {
    ulul: { title: string; pros: string[]; cons: string[]; research: string[] }; // Added research
    ppl: { title: string; pros: string[]; cons: string[]; research: string[] }; // Added research
  };
}

export const OnboardingStep1_TPathSelection = ({
  tPathType,
  setTPathType,
  handleNext,
  tPathDescriptions,
}: OnboardingStep1Props) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            tPathType === 'ulul' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary'
          }`}
          onClick={() => setTPathType('ulul')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3"> {/* Increased spacing */}
            <CardTitle className="text-lg">{tPathDescriptions.ulul.title}</CardTitle> {/* Reduced font size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"> {/* Smaller button */}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-w-[90vw]">
                <ScrollArea className="h-48 pr-4"> {/* Added ScrollArea */}
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Benefits of Upper/Lower Split:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {tPathDescriptions.ulul.research.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 text-sm">Pros:</h4> {/* Reduced font size */}
              <ul className="text-xs space-y-1"> {/* Reduced font size */}
                {tPathDescriptions.ulul.pros.map((pro, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {pro}
                  </li>
                ))}
              </ul>
              <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4> {/* Reduced font size */}
              <ul className="text-xs space-y-1"> {/* Reduced font size */}
                {tPathDescriptions.ulul.cons.map((con, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all ${
            tPathType === 'ppl' 
              ? 'border-primary ring-2 ring-primary' 
              : 'hover:border-primary'
          }`}
          onClick={() => setTPathType('ppl')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3"> {/* Increased spacing */}
            <CardTitle className="text-lg">{tPathDescriptions.ppl.title}</CardTitle> {/* Reduced font size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"> {/* Smaller button */}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-w-[90vw]">
                <ScrollArea className="h-48 pr-4"> {/* Added ScrollArea */}
                  <div className="space-y-2">
                    <p className="font-semibold text-sm">Benefits of Push/Pull/Legs Split:</p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {tPathDescriptions.ppl.research.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600 text-sm">Pros:</h4> {/* Reduced font size */}
              <ul className="text-xs space-y-1"> {/* Reduced font size */}
                {tPathDescriptions.ppl.pros.map((pro, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {pro}
                  </li>
                ))}
              </ul>
              <h4 className="font-semibold text-red-600 mt-3 text-sm">Cons:</h4> {/* Reduced font size */}
              <ul className="text-xs space-y-1"> {/* Reduced font size */}
                {tPathDescriptions.ppl.cons.map((con, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-red-500 mr-2">✗</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <div></div>
        <Button 
          onClick={handleNext} 
          disabled={!tPathType}
        >
          Next
        </Button>
      </div>
    </div>
  );
};