"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables, Profile } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalProfile, LocalActivityLog } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { convertDistance } from '@data/utils/unit-conversions';

type ActivityLog = Tables<'activity_logs'>;

interface ChartData {
  date: string;
  cyclingDistance: number;
  swimmingLengths: number;
  tennisDuration: number; // in minutes
}

export const useActivityChartData = () => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [preferredDistanceUnit, setPreferredDistanceUnit] = useState<Profile['preferred_distance_unit']>('km');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile for distance unit
  const { data: cachedProfile, loading: loadingProfile, error: profileError } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('profiles').select('*').eq('id', memoizedSessionUserId); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'activity_chart_profile',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  // Fetch activity logs
  const { data: cachedActivityLogs, loading: loadingLogs, error: logsError } = useCacheAndRevalidate<LocalActivityLog>({
    cacheTable: 'activity_logs',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('activity_logs').select('*').eq('user_id', memoizedSessionUserId).order('log_date', { ascending: true }); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'activity_chart_logs',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  useEffect(() => {
    const overallLoading = loadingProfile || loadingLogs;
    setIsLoading(overallLoading);

    const anyError = profileError || logsError;
    if (anyError) {
      setError(anyError);
      setChartData([]);
      return;
    }

    if (!overallLoading && cachedProfile && cachedActivityLogs) {
      const profile = cachedProfile[0];
      const unit = profile?.preferred_distance_unit || 'km';
      setPreferredDistanceUnit(unit);

      const weeklyActivityMap = new Map<string, { cyclingDistance: number, swimmingLengths: number, tennisDuration: number }>();

      (cachedActivityLogs || []).forEach(log => {
        const date = new Date(log.log_date);
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - (date.getDay() + 6) % 7); // Adjust to Monday
        startOfWeek.setHours(0, 0, 0, 0);
        const weekKey = startOfWeek.toISOString().split('T')[0];

        let currentWeekData = weeklyActivityMap.get(weekKey) || { cyclingDistance: 0, swimmingLengths: 0, tennisDuration: 0 };

        if (log.activity_type === 'Cycling' && log.distance) {
          const distanceMatch = log.distance.match(/^(\d+(\.\d+)?) km$/);
          if (distanceMatch) {
            const distanceInKm = parseFloat(distanceMatch[1]);
            currentWeekData.cyclingDistance += convertDistance(distanceInKm, 'km', unit as 'km' | 'miles') || 0;
          }
        } else if (log.activity_type === 'Swimming' && log.distance) {
          const lengthsMatch = log.distance.match(/^(\d+) lengths/);
          if (lengthsMatch) {
            currentWeekData.swimmingLengths += parseInt(lengthsMatch[1]);
          }
        } else if (log.activity_type === 'Tennis' && log.time) {
          let totalMinutes = 0;
          const hoursMatch = log.time.match(/(\d+)h/);
          const minutesMatch = log.time.match(/(\d+)m/);
          if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
          if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
          currentWeekData.tennisDuration += totalMinutes;
        }
        weeklyActivityMap.set(weekKey, currentWeekData);
      });

      const sortedChartData = Array.from(weeklyActivityMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setChartData(sortedChartData);
    }
  }, [
    cachedProfile, loadingProfile, profileError,
    cachedActivityLogs, loadingLogs, logsError
  ]);

  return { chartData, isLoading, error, preferredDistanceUnit };
};