"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Bot } from 'lucide-react';

interface AICoachUsageSectionProps {
  aiCoachUsageToday: number;
  AI_COACH_DAILY_LIMIT: number;
}

export const AICoachUsageSection = ({ aiCoachUsageToday, AI_COACH_DAILY_LIMIT }: AICoachUsageSectionProps) => {
  return (
    <Card className="bg-card">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" /> AI Coach Usage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-6">
        <div className="flex justify-between items-center text-sm mb-2">
          <p>Daily Uses</p>
          <p className="font-semibold">{aiCoachUsageToday} / {AI_COACH_DAILY_LIMIT}</p>
        </div>
        <Progress value={(aiCoachUsageToday / AI_COACH_DAILY_LIMIT) * 100} />
        <p className="text-xs text-muted-foreground pt-1">
          The AI Coach needs at least 3 workouts in the last 30 days to provide advice.
        </p>
      </CardContent>
    </Card>
  );
};