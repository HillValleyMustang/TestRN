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
  completed_count: number;
  goal: {
    total: number;
    workouts: { name: string }[];
  };
}

export const WeeklyTargetWidget = () => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch profile to get programme_type for initial goal setup if needed
  const { data: cachedProfile, loading: loadingProfile, error: profileError } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('profiles').select('*').eq('id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 'weekly_target_profile',
    supabase: supabase!, // Use supabase from useSession directly
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

  const programmeType = cachedProfile?.[0]?.programme_type;
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

  const goalWorkouts = summary?.goal.workouts || (programmeType === 'ulul' ? [{name: 'Upper Body A'}, {name: 'Lower Body A'}, {name: 'Upper Body B'}, {name: 'Lower Body B'}] : [{name: 'Push'}, {name: 'Pull'}, {name: 'Legs'}]);
  const completedCount = summary?.completed_count || 0;

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
              {goalWorkouts.map((workout, index) => {
                const isCompleted = index < completedCount;
                const label = workout.name.includes('Upper') ? 'U' : workout.name.includes('Lower') ? 'L' : workout.name[0];
                const colorClass = getWorkoutColorClass(workout.name, 'bg');
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200",
                          isCompleted ? `${colorClass} text-white` : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : label}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{workout.name} - {isCompleted ? 'Completed' : 'Pending'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            {completedCount} / {summary?.goal.total || (programmeType === 'ulul' ? 4 : 3)} Workouts Completed This Week
          </p>
        </CardContent>
      </Card>
      <ConsistencyCalendarModal open={isCalendarOpen} onOpenChange={setIsCalendarOpen} />
    </>
  );
};