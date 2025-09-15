"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingStep1Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  handleNext: () => void;
  tPathDescriptions: {
    ulul: { title: string; pros: string[]; cons: string[] };
    ppl: { title: string; pros: string[]; cons: string[] };
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
          <CardHeader>
            <CardTitle>{tPathDescriptions.ulul.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Pros:</h4>
              <ul className="text-sm space-y-1">
                {tPathDescriptions.ulul.pros.map((pro, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {pro}
                  </li>
                ))}
              </ul>
              <h4 className="font-semibold text-red-600 mt-3">Cons:</h4>
              <ul className="text-sm space-y-1">
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
          <CardHeader>
            <CardTitle>{tPathDescriptions.ppl.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Pros:</h4>
              <ul className="text-sm space-y-1">
                {tPathDescriptions.ppl.pros.map((pro, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {pro}
                  </li>
                ))}
              </ul>
              <h4 className="font-semibold text-red-600 mt-3">Cons:</h4>
              <ul className="text-sm space-y-1">
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