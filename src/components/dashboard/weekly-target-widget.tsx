"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn, getWorkoutColorClass } from '@/lib/utils';
import { useSession } from '@/components/session-context-provider';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalProfile } from '@/lib/db';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WeeklySummary {
  completed_count: number;
  goal: {
    total: number;
    labels: string[];
  };
}

export const WeeklyTargetWidget = () => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Determine the workout names for tooltips
  const getFullWorkoutName = (label: string): string => {
    switch (label) {
      case 'U': return 'Upper Body';
      case 'L': return 'Lower Body';
      case 'P': return 'Push';
      case 'O': return 'Pull'; // Assuming 'O' for Pull based on PPL
      case 'E': return 'Legs'; // Assuming 'E' for Legs based on PPL
      default: return 'Workout';
    }
  };

  // Determine the color class for each circle
  const getCircleColorClass = (label: string, isCompleted: boolean): string => {
    let baseColorKey: string;
    switch (label) {
      case 'U': baseColorKey = 'upper-body-a'; break; // Using 'a' variant for simplicity
      case 'L': baseColorKey = 'lower-body-a'; break;
      case 'P': baseColorKey = 'push'; break;
      case 'O': baseColorKey = 'pull'; break;
      case 'E': baseColorKey = 'legs'; break;
      default: baseColorKey = 'ad-hoc'; break; // Fallback
    }
    return isCompleted ? `bg-workout-${baseColorKey} text-white` : 'bg-muted text-muted-foreground';
  };

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

  const goalLabels = summary?.goal.labels || (programmeType === 'ulul' ? ['U', 'L', 'U', 'L'] : ['P', 'P', 'L']);
  const completedCount = summary?.completed_count || 0;

  return (
    <Card className="animate-fade-in-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" /> Weekly Target
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-3 pt-4">
        <div className="flex space-x-2">
          <TooltipProvider>
            {goalLabels.map((label, index) => {
              const isCompleted = index < completedCount;
              const fullWorkoutName = getFullWorkoutName(label);
              const colorClass = getCircleColorClass(label, isCompleted);
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200",
                        colorClass
                      )}
                    >
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : label}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{fullWorkoutName} - {isCompleted ? 'Completed' : 'Pending'}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground">
          {completedCount} / {goalLabels.length} Workouts Completed This Week
        </p>
      </CardContent>
    </Card>
  );
};