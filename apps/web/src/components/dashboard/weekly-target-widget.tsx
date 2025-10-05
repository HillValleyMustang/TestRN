"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, CheckCircle, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Keep web-specific utils;
import { useSession } from '@/components/session-context-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ConsistencyCalendarModal } from '@/components/dashboard/consistency-calendar-modal';
import { WeeklyActivitySummaryDialog } from './weekly-activity-summary-dialog';
import { Tables } from '@/types/supabase';

interface Activity {
  id: string;
  type: string;
  distance: string | null;
  time: string | null;
  date: string;
}

interface WeeklySummary {
  completed_workouts: { id: string; name: string }[];
  goal_total: number;
  programme_type: 'ulul' | 'ppl';
  completed_activities: Activity[];
}

interface WeeklyTargetWidgetProps {
  onViewSummary: (sessionId: string) => void;
  summary: WeeklySummary | null;
  loading: boolean;
  error: string | null;
  profile: Tables<'profiles'> | null;
}

export const WeeklyTargetWidget = ({ onViewSummary, summary, loading, error, profile }: WeeklyTargetWidgetProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isActivitySummaryOpen, setIsActivitySummaryOpen] = useState(false);

  const programmeType = profile?.programme_type;

  const { displayItems, completedCount, goalTotal, completedActivities } = useMemo(() => {
    if (!summary || !programmeType) {
      return { displayItems: [], completedCount: 0, goalTotal: programmeType === 'ulul' ? 4 : 3, completedActivities: [] };
    }

    const goalWorkouts = programmeType === 'ulul'
      ? ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B']
      : ['Push', 'Pull', 'Legs'];

    const completed = summary.completed_workouts;
    const completedCount = completed.length;
    const goalTotal = summary.goal_total;
    const displayCount = Math.max(goalTotal, completedCount);

    const items = [];
    for (let i = 0; i < displayCount; i++) {
      const isCompleted = i < completedCount;
      const workoutName = isCompleted ? completed[i].name : goalWorkouts[i];
      const sessionId = isCompleted ? completed[i].id : null;
      items.push({
        id: sessionId,
        name: workoutName,
        isCompleted: isCompleted,
      });
    }
    return { displayItems: items, completedCount, goalTotal, completedActivities: summary.completed_activities || [] };
  }, [summary, programmeType]);

  if (loading) {
    return (
      <Card className="animate-fade-in-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-20">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="animate-fade-in-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-20 text-destructive">
          <AlertCircle className="h-5 w-5 mr-2" /> Failed to load weekly target.
        </CardContent>
      </Card>
    );
  }

  if (!programmeType) {
    return (
      <Card className="animate-fade-in-slide-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-20 text-muted-foreground text-center">
          No programme type set. Complete onboarding or set one in your profile.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in-slide-up">
        <CardHeader className="pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsCalendarOpen(true)}>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-2 pt-1">
          <div className="flex space-x-2">
            <TooltipProvider>
              {displayItems.map((item, index) => {
                const label = item.name.includes('Upper') ? 'U' : item.name.includes('Lower') ? 'L' : item.name[0];
                const colorClass = getWorkoutColorClass(item.name, 'bg');
                const borderColorClass = getWorkoutColorClass(item.name, 'border');
                const textColorClass = getWorkoutColorClass(item.name, 'text');
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                          item.isCompleted
                            ? `${colorClass} text-white`
                            : `bg-card border ${borderColorClass} ${textColorClass}`,
                          item.isCompleted && item.id && 'cursor-pointer hover:scale-110'
                        )}
                        onClick={() => item.isCompleted && item.id && onViewSummary(item.id)}
                      >
                        {item.isCompleted ? <CheckCircle className="h-5 w-5" /> : label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name} - {item.isCompleted ? 'Completed (Click to view)' : 'Pending'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} / {goalTotal} Workouts Completed This Week
          </p>
          {completedActivities.length > 0 && (
            <Button
              variant="link"
              className="text-sm text-muted-foreground h-auto p-0"
              onClick={() => setIsActivitySummaryOpen(true)}
            >
              {completedActivities.length} Activit{completedActivities.length > 1 ? 'ies' : 'y'} Completed This Week
            </Button>
          )}
        </CardContent>
      </Card>
      <ConsistencyCalendarModal open={isCalendarOpen} onOpenChange={setIsCalendarOpen} />
      <WeeklyActivitySummaryDialog
        open={isActivitySummaryOpen}
        onOpenChange={setIsActivitySummaryOpen}
        activities={completedActivities}
      />
    </>
  );
};