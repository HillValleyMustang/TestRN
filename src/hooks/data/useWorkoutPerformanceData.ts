"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalWorkoutSession, LocalSetLog, LocalExerciseDefinition } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';

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

// Muscle group categorization
const UPPER_BODY_MUSCLES = new Set([
  'Pectorals', 'Deltoids', 'Lats', 'Traps', 'Biceps', 'Triceps', 'Forearms'
]);
const LOWER_BODY_MUSCLES = new Set([
  'Quadriceps', 'Hamstrings', 'Glutes', 'Calves', 'Abdominals', 'Core'
]);

const categorizeMuscle = (muscle: string): 'upper' | 'lower' | 'other' => {
  const cleanedMuscle = muscle.trim();
  if (UPPER_BODY_MUSCLES.has(cleanedMuscle)) return 'upper';
  if (LOWER_BODY_MUSCLES.has(cleanedMuscle)) return 'lower';
  return 'other';
};

export const useWorkoutPerformanceData = () => {
  const { session, supabase } = useSession();
  const [weeklyVolumeData, setWeeklyVolumeData] = useState<{ upper: any[]; lower: any[] }>({ upper: [], lower: [] });
  const [weeklyMuscleBreakdown, setWeeklyMuscleBreakdown] = useState<{ upper: any[]; lower: any[] }>({ upper: [], lower: [] });
  const [recentSessions, setRecentSessions] = useState<Tables<'workout_sessions'>[]>([]);
  const [totalUpperVolume, setTotalUpperVolume] = useState(0);
  const [totalLowerVolume, setTotalLowerVolume] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all necessary data sources using our caching hook
  const { data: cachedSessions, loading: loadingSessions, error: sessionsError, refresh: refreshSessions } = useCacheAndRevalidate<LocalWorkoutSession>({
    cacheTable: 'workout_sessions',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('workout_sessions').select('*').eq('user_id', session.user.id).not('completed_at', 'is', null).order('session_date', { ascending: false });
    }, [session?.user.id]),
    queryKey: 'workout_performance_sessions',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedSetLogs, loading: loadingSetLogs, error: setLogsError, refresh: refreshSetLogs } = useCacheAndRevalidate<LocalSetLog>({
    cacheTable: 'set_logs',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data: sessionIds, error: sessionIdsError } = await client.from('workout_sessions').select('id').eq('user_id', session.user.id);
      if (sessionIdsError) return { data: [], error: sessionIdsError };
      if (!sessionIds || sessionIds.length === 0) return { data: [], error: null };
      
      return client.from('set_logs').select('*').in('session_id', sessionIds.map(s => s.id));
    }, [session?.user.id]),
    queryKey: 'workout_performance_set_logs',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedExerciseDefs, loading: loadingExerciseDefs, error: exerciseDefsError, refresh: refreshExerciseDefs } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client.from('exercise_definitions').select('*');
    }, []),
    queryKey: 'all_exercises_for_performance',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // Process and aggregate the data once all sources are loaded
  useEffect(() => {
    const overallLoading = loadingSessions || loadingSetLogs || loadingExerciseDefs;
    setIsLoading(overallLoading);

    const anyError = sessionsError || setLogsError || exerciseDefsError;
    if (anyError) {
      setError(anyError);
      return;
    }

    if (!overallLoading && cachedSessions && cachedSetLogs && cachedExerciseDefs) {
      const exerciseDefMap = new Map(cachedExerciseDefs.map(def => [def.id, def]));
      
      setRecentSessions(cachedSessions.slice(0, 5));

      const today = new Date();
      const currentWeekStart = getStartOfWeek(today);
      
      const upperVolumeMap = new Map<string, number>();
      const lowerVolumeMap = new Map<string, number>();
      const upperMuscleSetsMap = new Map<string, number>();
      const lowerMuscleSetsMap = new Map<string, number>();

      let currentUpperVolume = 0;
      let currentLowerVolume = 0;

      (cachedSetLogs || []).forEach(log => {
        const sessionForLog = cachedSessions.find(s => s.id === log.session_id);
        const exerciseDef = log.exercise_id ? exerciseDefMap.get(log.exercise_id) : null;

        if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps && sessionForLog?.session_date) {
          const date = new Date(sessionForLog.session_date);
          const weekStart = getStartOfWeek(date);
          const weekKey = weekStart.toISOString().split('T')[0];
          const volume = (log.weight_kg || 0) * (log.reps || 0);

          const mainMuscles = (exerciseDef.main_muscle || '').split(',').map(m => m.trim());
          let isUpper = false;
          let isLower = false;

          mainMuscles.forEach(muscle => {
            const category = categorizeMuscle(muscle);
            if (category === 'upper') isUpper = true;
            if (category === 'lower') isLower = true;
          });

          if (isUpper) {
            upperVolumeMap.set(weekKey, (upperVolumeMap.get(weekKey) || 0) + volume);
            if (weekStart.getTime() === currentWeekStart.getTime()) {
              currentUpperVolume += volume;
              mainMuscles.forEach(muscle => {
                if (categorizeMuscle(muscle) === 'upper') {
                  upperMuscleSetsMap.set(muscle, (upperMuscleSetsMap.get(muscle) || 0) + 1);
                }
              });
            }
          }
          if (isLower) {
            lowerVolumeMap.set(weekKey, (lowerVolumeMap.get(weekKey) || 0) + volume);
            if (weekStart.getTime() === currentWeekStart.getTime()) {
              currentLowerVolume += volume;
              mainMuscles.forEach(muscle => {
                if (categorizeMuscle(muscle) === 'lower') {
                  lowerMuscleSetsMap.set(muscle, (lowerMuscleSetsMap.get(muscle) || 0) + 1);
                }
              });
            }
          }
        }
      });

      setTotalUpperVolume(currentUpperVolume);
      setTotalLowerVolume(currentLowerVolume);

      const volumeChartDataUpper = [];
      const volumeChartDataLower = [];
      for (let i = 3; i >= 0; i--) {
        const weekDate = new Date(currentWeekStart);
        weekDate.setDate(currentWeekStart.getDate() - i * 7);
        const weekKey = weekDate.toISOString().split('T')[0];
        volumeChartDataUpper.push({
          date: weekKey,
          volume: upperVolumeMap.get(weekKey) || 0,
          isCurrentWeek: weekDate.getTime() === currentWeekStart.getTime(),
        });
        volumeChartDataLower.push({
          date: weekKey,
          volume: lowerVolumeMap.get(weekKey) || 0,
          isCurrentWeek: weekDate.getTime() === currentWeekStart.getTime(),
        });
      }

      setWeeklyVolumeData({ upper: volumeChartDataUpper, lower: volumeChartDataLower });
      setWeeklyMuscleBreakdown({
        upper: Array.from(upperMuscleSetsMap.entries()).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
        lower: Array.from(lowerMuscleSetsMap.entries()).map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets),
      });
    }
  }, [
    cachedSessions, loadingSessions, sessionsError,
    cachedSetLogs, loadingSetLogs, setLogsError,
    cachedExerciseDefs, loadingExerciseDefs, exerciseDefsError
  ]);

  // 3. Expose a single refresh function to re-fetch all data for this hook
  const refresh = useCallback(async () => {
    await Promise.all([
      refreshSessions(),
      refreshSetLogs(),
      refreshExerciseDefs(),
    ]);
  }, [refreshSessions, refreshSetLogs, refreshExerciseDefs]);

  return {
    weeklyVolumeData,
    weeklyMuscleBreakdown,
    recentSessions,
    totalUpperVolume,
    totalLowerVolume,
    loading: isLoading,
    error,
    refresh,
  };
};