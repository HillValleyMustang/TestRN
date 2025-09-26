"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, CheckCircle, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { cn, getWorkoutColorClass } from '@/lib/utils';
import { useSession } from '@/components/session-context-provider';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalProfile } from '@/lib/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ConsistencyCalendarModal } from '@/components/dashboard/consistency-calendar-modal';

interface WeeklySummary {
  completed_workouts: { name: string }[];
  goal_total: number;
  programme_type: 'ulul' | 'ppl';
}

export const WeeklyTargetWidget = () => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: cachedProfile, loading: loadingProfile, error: profileError } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('profiles').select('*').eq('id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 'weekly_target_profile',
    supabase: supabase!,
    sessionUserId: memoizedSessionUserId,
  });

  const fetchWeeklySummary = useCallback(async () => {
    if (!memoizedSessionUserId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get-weekly-workout-summary', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weekly workout summary.');
      }
      setSummary(data);
    } catch (err: any) {
      console.error("Error fetching weekly workout summary:", err);
      setError(err.message || "Failed to load weekly target.");
    } finally {
      setIsLoading(false);
    }
  }, [memoizedSessionUserId, session?.access_token]);

  useEffect(() => {
    if (memoizedSessionUserId) {
      fetchWeeklySummary();
    }
  }, [memoizedSessionUserId, fetchWeeklySummary]);

  const programmeType = cachedProfile?.[0]?.programme_type;

  const { displayItems, completedCount, goalTotal } = useMemo(() => {
    if (!summary || !programmeType) {
      return { displayItems: [], completedCount: 0, goalTotal: programmeType === 'ulul' ? 4 : 3 };
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
      items.push({
        name: workoutName,
        isCompleted: isCompleted,
      });
    }
    return { displayItems: items, completedCount, goalTotal };
  }, [summary, programmeType]);

  if (isLoading || loadingProfile) {
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

  if (error || profileError) {
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
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsCalendarOpen(true)}>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3 pt-4">
          <div className="flex space-x-2">
            <TooltipProvider>
              {displayItems.map((item, index) => {
                const label = item.name.includes('Upper') ? 'U' : item.name.includes('Lower') ? 'L' : item.name[0];
                const colorClass = getWorkoutColorClass(item.name, 'bg');
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200",
                          item.isCompleted ? `${colorClass} text-white` : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {item.isCompleted ? <CheckCircle className="h-5 w-5" /> : label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.name} - {item.isCompleted ? 'Completed' : 'Pending'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} / {goalTotal} Workouts Completed This Week
          </p>
        </CardContent>
      </Card>
      <ConsistencyCalendarModal open={isCalendarOpen} onOpenChange={setIsCalendarOpen} />
    </>
  );
};