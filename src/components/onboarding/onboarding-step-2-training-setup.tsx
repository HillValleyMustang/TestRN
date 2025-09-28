'use client'

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from '@/lib/utils';

interface OnboardingStep2Props {
  tPathType: "ulul" | "ppl" | null;
  setTPathType: (type: "ulul" | "ppl") => void;
  experience: "beginner" | "intermediate" | null;
  setExperience: (value: "beginner" | "intermediate") => void;
  handleNext: () => void;
  handleBack: () => void;
}

export const OnboardingStep2_TrainingSetup = ({
  tPathType,
  setTPathType,
  experience,
  setExperience,
  handleNext,
  handleBack,
}: OnboardingStep2Props) => {
  const isValid = tPathType && experience;

  const pathOptions = [
    {
      id: 'ulul' as const,
      title: '4-Day Upper/Lower',
      subtitle: '(ULUL)',
      frequency: '4 days per week',
      pros: [
        'Higher training frequency',
        'Excellent for muscle growth', 
        'Flexible scheduling'
      ],
      cons: [
        'Longer sessions',
        'More time commitment',
        'Can cause fatigue'
      ]
    },
    {
      id: 'ppl' as const,
      title: '3-Day Push/Pull/Legs',
      subtitle: '(PPL)',
      frequency: '3 days per week',
      pros: [
        'Time efficient',
        'Better recovery',
        'Logical grouping'
      ],
      cons: [
        'Lower frequency',
        'Less overall volume',
        'Needs consistency'
      ]
    }
  ];

  const experienceOptions = [
    {
      id: 'beginner' as const,
      title: 'Beginner',
      description: 'New to structured training or returning after a long break.'
    },
    {
      id: 'intermediate' as const,
      title: 'Intermediate', 
      description: 'Some experience with structured training programs.'
    }
  ];

  return (
    <div className={cn("space-y-8")}>
      {/* Section Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Training Setup</h2>
        <p className="text-muted-foreground">
          Select the workout structure and your experience level.
        </p>
      </div>

      {/* Transformation Path */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground">
          1. Choose Your Transformation Path
        </h3>
        
        <div className="space-y-4">
          {pathOptions.map((option) => (
            <Card
              key={option.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                tPathType === option.id
                  ? "border-onboarding-primary shadow-lg"
                  : "border-border hover:border-onboarding-primary/50"
              )}
              onClick={() => setTPathType(option.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      {option.title}
                    </h4>
                    <p className="text-sm text-onboarding-primary font-semibold uppercase tracking-wide">
                      {option.subtitle}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      tPathType === option.id
                        ? "border-onboarding-primary bg-onboarding-primary"
                        : "border-gray-300 bg-card"
                    )}
                  >
                    {tPathType === option.id && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <Badge 
                  variant="secondary" 
                  className="bg-onboarding-primary-faint text-onboarding-primary hover:bg-onboarding-primary-faint"
                >
                  {option.frequency}
                </Badge>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-success flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Pros
                    </h5>
                    <ul className="space-y-1">
                      {option.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-destructive flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Cons
                    </h5>
                    <ul className="space-y-1">
                      {option.cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-foreground">
          2. Your Experience Level
        </h3>
        
        <div className="space-y-4">
          {experienceOptions.map((option) => (
            <Card
              key={option.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                experience === option.id
                  ? "border-onboarding-primary shadow-lg"
                  : "border-border hover:border-onboarding-primary/50"
              )}
              onClick={() => setExperience(option.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-foreground">
                    {option.title}
                  </h4>
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      experience === option.id
                        ? "border-onboarding-primary bg-onboarding-primary"
                        : "border-gray-300 bg-card"
                    )}
                  >
                    {experience === option.id && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {option.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-8 pb-8">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex-1 h-12 text-base font-semibold border-2"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className={cn(
            "flex-1 h-12 text-base font-semibold",
            "bg-gradient-to-r from-onboarding-primary to-onboarding-primary-light hover:from-onboarding-primary-light hover:to-onboarding-primary",
            "disabled:bg-gray-300 disabled:text-gray-500"
          )}
        >
          Next
        </Button>
      </div>
    </div>
  );
};