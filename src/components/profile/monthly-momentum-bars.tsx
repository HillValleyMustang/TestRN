"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

type Profile = Tables<'profiles'>;
type WorkoutSession = Tables<'workout_sessions'>;
type TPath = Tables<'t_paths'>;

interface MonthlyMomentumBarsProps {
  profile: Profile | null;
}

// Helper to get the start of the week (Monday)
const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(0, 0, 0);
  d.setSeconds(0);
  d.setMilliseconds(0);
  return d;
};

export const MonthlyMomentumBars = ({ profile }: MonthlyMomentumBarsProps) => {
  const { session, supabase } = useSession();
  const [loading, setLoading] = useState(true);
  const [weeklyWorkoutData, setWeeklyWorkoutData] = useState<Map<string, number>>(new Map()); // Map<weekKey, workoutCount>
  const [requiredWorkoutsPerWeek, setRequiredWorkoutsPerWeek] = useState<number>(3); // Default to PPL (3)

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const profileCreatedAt = useMemo(() => profile?.created_at ? new Date(profile.created_at) : null, [profile]);

  const getColorClass = useCallback((workoutCount: number): string => {
    // Note: requiredWorkoutsPerWeek is based on the *currently active* T-Path,
    // and this logic is applied to all historical weekly data.
    const darkGreen = 'bg-green-600';
    const mediumGreen = 'bg-green-400';
    const lightGreen = 'bg-green-200';
    const gray = 'bg-gray-200'; // For 0 workouts

    if (requiredWorkoutsPerWeek === 4) { // ULUL
      if (workoutCount >= 4) return darkGreen;
      if (workoutCount >= 2) return mediumGreen; // 2-3 workouts
      if (workoutCount >= 1) return lightGreen;
    } else { // PPL or default (3)
      if (workoutCount >= 3) return darkGreen;
      if (workoutCount >= 2) return mediumGreen;
      if (workoutCount >= 1) return lightGreen;
    }
    return gray;
  }, [requiredWorkoutsPerWeek]);

  useEffect(() => {
    const fetchWorkoutData = async () => {
      if (!session || !profile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Determine required workouts per week based on active T-Path
        if (profile.active_t_path_id) {
          const { data: activeTPath, error: tPathError } = await supabase
            .from('t_paths')
            .select('settings')
            .eq('id', profile.active_t_path_id)
            .single();

          if (tPathError) console.error("Error fetching active T-Path settings:", tPathError);
          else if (activeTPath?.settings && typeof activeTPath.settings === 'object' && 'tPathType' in activeTPath.settings) {
            const tPathType = (activeTPath.settings as { tPathType: string }).tPathType;
            setRequiredWorkoutsPerWeek(tPathType === 'ulul' ? 4 : 3);
          }
        } else {
          // If no active T-Path, default to PPL requirements
          setRequiredWorkoutsPerWeek(3);
        }

        // 2. Fetch all workout sessions for the user
        const { data: workoutSessions, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('session_date') // Only need session_date for counting
          .eq('user_id', session.user.id)
          .order('session_date', { ascending: true });

        if (sessionsError) throw sessionsError;

        const newWeeklyWorkoutData = new Map<string, number>(); // Key: YYYY-MM-DD (start of week)
        (workoutSessions || []).forEach(sessionItem => {
          const sessionDate = new Date(sessionItem.session_date);
          const startOfWeek = getStartOfWeek(sessionDate);
          const weekKey = startOfWeek.toISOString().split('T')[0]; // e.g., "2023-01-02"

          newWeeklyWorkoutData.set(weekKey, (newWeeklyWorkoutData.get(weekKey) || 0) + 1);
        });
        setWeeklyWorkoutData(newWeeklyWorkoutData);

      } catch (err: any) {
        toast.error("Failed to load monthly workout data: " + err.message);
        console.error("Error fetching monthly workout data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [session, supabase, profile]);

  const renderYearMomentum = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = getStartOfWeek(new Date()); // Current week's Monday

    const yearWeeksGroupedByMonth: { [month: number]: { date: Date; colorClass: string }[] } = {};

    let currentWeekStart = getStartOfWeek(new Date(currentYear, 0, 1)); // Start from Jan 1st of current year

    // Adjust start date if profile was created in the current year, starting from that week
    if (profileCreatedAt && profileCreatedAt.getFullYear() === currentYear) {
      const profileWeekStart = getStartOfWeek(profileCreatedAt);
      if (profileWeekStart > currentWeekStart) {
        currentWeekStart = profileWeekStart;
      }
    } else if (profileCreatedAt && profileCreatedAt.getFullYear() > currentYear) {
      // If profile is for a future year, no data to show for current year
      return null;
    }
    // If profileCreatedAt is from a previous year, currentWeekStart remains Jan 1st of currentYear

    while (currentWeekStart <= today) {
      const monthIndex = currentWeekStart.getMonth();
      if (!yearWeeksGroupedByMonth[monthIndex]) {
        yearWeeksGroupedByMonth[monthIndex] = [];
      }

      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const workoutCount = weeklyWorkoutData.get(weekKey) || 0;
      const colorClass = getColorClass(workoutCount);

      // For debugging coloring issue:
      // console.log(`Week: ${weekKey}, Workouts: ${workoutCount}, Color: ${colorClass}`);

      yearWeeksGroupedByMonth[monthIndex].push({ date: new Date(currentWeekStart), colorClass });

      currentWeekStart.setDate(currentWeekStart.getDate() + 7); // Move to next week
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 4 }).map((_, rowIndex) => ( // 4 rows for quarters
          <div key={rowIndex} className="grid grid-cols-3 gap-4"> {/* 3 months per row */}
            {Array.from({ length: 3 }).map((_, colIndex) => {
              const monthIndex = rowIndex * 3 + colIndex; // Calculate month index for 3 months per row
              if (monthIndex > 11) return null; // Ensure we don't go beyond December

              const monthName = monthNames[monthIndex];
              const monthWeeks = yearWeeksGroupedByMonth[monthIndex] || [];

              return (
                <Card key={monthName} className="p-2">
                  <CardTitle className="text-sm font-semibold mb-2 text-center">{monthName}</CardTitle>
                  <div className="flex h-12 w-full rounded-md overflow-hidden border border-gray-300">
                    {monthWeeks.length === 0 ? (
                      <div className="flex-1 h-full bg-gray-100" /> // Empty gray bar for months with no data
                    ) : (
                      monthWeeks.map((week, weekIndex) => (
                        <div
                          key={weekIndex}
                          className={cn("flex-1 h-full", week.colorClass)}
                          title={`${week.date.toLocaleDateString()} - Workouts: ${weeklyWorkoutData.get(week.date.toISOString().split('T')[0]) || 0}`}
                        />
                      ))
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Monthly Momentum
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading monthly momentum...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" /> Monthly Momentum
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Workout consistency for {currentYear} based on your active T-Path.
        </p>
      </CardHeader>
      <CardContent>
        {renderYearMomentum()}
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Green shades indicate workout consistency. Darker green means more workouts completed relative to your active T-Path.
        </p>
      </CardContent>
    </Card>
  );
};