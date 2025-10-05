"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/types/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Keep web-specific utils;
import { CalendarDays } from 'lucide-react';

type Profile = Tables<'profiles'>;
type WorkoutSession = Tables<'workout_sessions'>;
type TPath = Tables<'t_paths'>;

interface MonthlyMomentumBarsProps {
  profile: Profile | null;
}

// Helper to get the start of the week (Monday) in UTC
const getStartOfWeekUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight
  const day = d.getUTCDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday (UTC)
  d.setUTCDate(diff);
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

          if (tPathError) {
            console.error("Error fetching active T-Path settings:", tPathError);
            toast.error("Failed to load active workout plan settings."); // Added toast.error
          }
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
        console.log("Raw workoutSessions from DB:", workoutSessions); // Log raw data

        const newWeeklyWorkoutData = new Map<string, number>(); // Key: YYYY-MM-DD (start of week)
        (workoutSessions || []).forEach(sessionItem => {
          const sessionDate = new Date(sessionItem.session_date);
          const startOfWeek = getStartOfWeekUTC(sessionDate); // Use UTC version
          const weekKey = startOfWeek.toISOString().split('T')[0]; // e.g., "2023-01-02"

          newWeeklyWorkoutData.set(weekKey, (newWeeklyWorkoutData.get(weekKey) || 0) + 1);
        });
        setWeeklyWorkoutData(newWeeklyWorkoutData);
        console.log("Processed Weekly Workout Data Map (UTC keys):", newWeeklyWorkoutData); // Log the map

      } catch (err: any) {
        toast.error("Failed to load monthly workout data: " + err.message); // Changed to toast.error
        console.error("Error fetching monthly workout data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutData();
  }, [session, supabase, profile]);

  const renderYearMomentum = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = getStartOfWeekUTC(new Date()); // Use UTC version

    // Generate all weeks for the year up to today, and store them chronologically
    const allWeeksInYear: { date: Date; workoutCount: number; colorClass: string }[] = [];
    let currentWeekStart = getStartOfWeekUTC(new Date(currentYear, 0, 1)); // Always start from Jan 1st of current year (UTC)

    // If profileCreatedAt is for a future year, no data to show for current year
    if (profileCreatedAt && profileCreatedAt.getFullYear() > currentYear) {
      return null;
    }
    
    while (currentWeekStart.getTime() <= today.getTime()) { // Compare timestamps for Date objects
      const weekKey = currentWeekStart.toISOString().split('T')[0];
      const workoutCount = weeklyWorkoutData.get(weekKey) || 0;
      const colorClass = getColorClass(workoutCount);
      
      console.log(`[MomentumBars Render] Week: ${weekKey}, Workouts: ${workoutCount}, Color: ${colorClass}`);

      allWeeksInYear.push({ date: new Date(currentWeekStart), workoutCount, colorClass });
      currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7); // Move to next week (UTC)
    }

    // Group weeks by quarter
    const quarters: { [key: number]: typeof allWeeksInYear } = { 0: [], 1: [], 2: [], 3: [] }; // Q1, Q2, Q3, Q4
    allWeeksInYear.forEach(week => {
      const month = week.date.getUTCMonth(); // Use UTC month
      if (month >= 0 && month <= 2) quarters[0].push(week); // Jan-Mar
      else if (month >= 3 && month <= 5) quarters[1].push(week); // Apr-Jun
      else if (month >= 6 && month <= 8) quarters[2].push(week); // Jul-Sep
      else if (month >= 9 && month <= 11) quarters[3].push(week); // Oct-Dec
    });

    return (
      <div className="space-y-3"> {/* Reduced vertical spacing between quarters */}
        {Object.keys(quarters).map((quarterKey, quarterIndex) => {
          const weeksInQuarter = quarters[parseInt(quarterKey)];
          const startMonthIndex = quarterIndex * 3;
          const monthsInQuarter = monthNames.slice(startMonthIndex, startMonthIndex + 3);

          return (
            <div key={quarterKey} className="space-y-1"> {/* Reduced vertical spacing */}
              {/* Month labels for the quarter, evenly distributed */}
              <div className="flex justify-around px-1"> {/* Use justify-around for even spacing */}
                {monthsInQuarter.map(monthName => (
                  <span key={monthName} className="text-sm font-semibold text-muted-foreground flex-1 text-center">
                    {monthName}
                  </span>
                ))}
              </div>
              {/* Continuous bar for weeks */}
              <div className="flex h-12 w-full rounded-md overflow-hidden border border-gray-300">
                {weeksInQuarter.length === 0 ? (
                  <div className="flex-1 h-full bg-gray-100" /> // Empty gray bar for quarters with no data
                ) : (
                  weeksInQuarter.map((week, weekIndex) => (
                        <div
                          key={weekIndex}
                          className={cn("flex-1 h-full", week.colorClass)}
                          title={`${week.date.toLocaleDateString()} - Workouts: ${week.workoutCount}`}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
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