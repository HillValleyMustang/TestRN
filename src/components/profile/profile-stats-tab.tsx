"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import { Tables } from '@/types/supabase'; // Import Tables for Profile type

type Profile = Tables<'profiles'>; // Define Profile type

interface ProfileStatsTabProps {
  fitnessLevel: {
    level: string;
    color: string;
    progress: number;
    icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
    nextLevelPoints: number;
  };
  profile: Profile | null; // Add profile prop
}

export const ProfileStatsTab = ({ fitnessLevel, profile }: ProfileStatsTabProps) => {
  return (
    <div className="mt-6 space-y-6 border-none p-0">
      <Card className={cn("relative overflow-hidden p-6 text-center text-primary-foreground shadow-lg group", fitnessLevel.color, "transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-xl")}>
        <div className="absolute inset-0 opacity-20" style={{
          background: `linear-gradient(45deg, ${fitnessLevel.color.replace('bg-', 'var(--')} / 0.8), transparent)`,
          filter: 'blur(50px)',
          transform: 'scale(1.5)'
        }}></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="mb-4 text-white transition-transform duration-300 ease-in-out group-hover:scale-110">
            {React.cloneElement(fitnessLevel.icon, { className: "h-12 w-12" })}
          </div>
          <CardTitle className="text-4xl font-extrabold tracking-tight text-white mb-2">
            {fitnessLevel.level}
          </CardTitle>
          <CardDescription className="text-base text-white/90 mb-4">
            {fitnessLevel.level === 'Legend' ? "You've reached the pinnacle of fitness!" : `Keep pushing to reach ${fitnessLevel.nextLevelPoints / 10} workouts for the next level!`}
          </CardDescription>
          <Progress value={fitnessLevel.progress} className="w-full h-3 bg-white/30" indicatorClassName={cn(fitnessLevel.color.replace('bg-', 'bg-'))} />
          <p className="text-sm text-white/80 mt-2">{Math.round(fitnessLevel.progress)}% to next level</p>
        </div>
      </Card>
      
      {/* Removed MonthlyMomentumBars from here */}
    </div>
  );
};