"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalWorkoutSession, LocalSetLog, LocalExerciseDefinition } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';

// Helper function to get the start of the week (Monday)
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

// Define a type for SetLog with joined ExerciseDefinition and WorkoutSession
type SetLogWithJoins = Pick<LocalSetLog, 'id' | 'weight_kg' | 'reps'> & {
  exercise_definitions: Pick<LocalExerciseDefinition, 'type'> | null;
  workout_sessions: Pick<LocalWorkoutSession, 'session_date'> | null;
};

interface ChartData {
  date: string;
  volume: number;
}

export const useWeeklyVolumeData = () => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch necessary data using caching hooks
  const { data: cachedSessions, loading: loadingSessions, error: sessionsError } = useCacheAndRevalidate<LocalWorkoutSession>({
    cacheTable: 'workout_sessions',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('workout_sessions').select('*').eq('user_id', memoizedSessionUserId).not('completed_at', 'is', null); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'volume_chart_sessions',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedSetLogs, loading: loadingSetLogs, error: setLogsError } = useCacheAndRevalidate<LocalSetLog>({
    cacheTable: 'set_logs',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data: sessionIds, error: sessionIdsError } = await client.from('workout_sessions').select('id').eq('user_id', memoizedSessionUserId); // Use memoized ID
      if (sessionIdsError) return { data: [], error: sessionIdsError };
      if (!sessionIds || sessionIds.length === 0) return { data: [], error: null };
      
      return client.from('set_logs').select('*').in('session_id', sessionIds.map(s => s.id));
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'volume_chart_set_logs',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedExerciseDefs, loading: loadingExerciseDefs, error: exerciseDefsError } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client.from('exercise_definitions').select('*');
    }, []),
    queryKey: 'all_exercises_for_volume_chart',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  useEffect(() => {
    const overallLoading = loadingSessions || loadingSetLogs || loadingExerciseDefs;
    setIsLoading(overallLoading);

    const anyError = sessionsError || setLogsError || exerciseDefsError;
    if (anyError) {
      setError(anyError);
      setChartData([]);
      return;
    }

    if (!overallLoading && cachedSessions && cachedSetLogs && cachedExerciseDefs) {
      const exerciseDefMap = new Map(cachedExerciseDefs.map(def => [def.id, def]));
      const sessionDateMap = new Map(cachedSessions.map(s => [s.id, s.session_date]));
      
      const weeklyVolumeMap = new Map<string, number>();

      (cachedSetLogs || []).forEach(log => {
        const exerciseDef = log.exercise_id ? exerciseDefMap.get(log.exercise_id) : null;
        const sessionDate = log.session_id ? sessionDateMap.get(log.session_id) : null;

        if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps && sessionDate) {
          const date = new Date(sessionDate);
          const startOfWeek = getStartOfWeek(date);
          const weekKey = startOfWeek.toISOString().split('T')[0];
          const volume = (log.weight_kg || 0) * (log.reps || 0);
          weeklyVolumeMap.set(weekKey, (weeklyVolumeMap.get(weekKey) || 0) + volume);
        }
      });

      const sortedChartData = Array.from(weeklyVolumeMap.entries())
        .map(([date, volume]) => ({ date, volume }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setChartData(sortedChartData);
    }
  }, [
    cachedSessions, loadingSessions, sessionsError,
    cachedSetLogs, loadingSetLogs, setLogsError,
    cachedExerciseDefs, loadingExerciseDefs, exerciseDefsError
  ]);

  return { chartData, isLoading, error };
};