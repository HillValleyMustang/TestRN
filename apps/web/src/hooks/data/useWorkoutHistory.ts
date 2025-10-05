"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/components/session-context-provider';
import { Tables, WorkoutSessionWithAggregatedDetails } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalWorkoutSession, LocalSetLog, LocalExerciseDefinition } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner'; // Import toast

/**
 * A centralized hook to fetch and process the user's entire workout history.
 * It encapsulates all logic for fetching sessions, set logs, and exercise definitions,
 * aggregates the data, and provides a clean interface for UI components.
 * It handles its own loading and error states according to our new architectural principles.
 */
export const useWorkoutHistory = () => {
  const { session, supabase, memoizedSessionUserId } = useSession(); // Destructure memoizedSessionUserId
  const [sessions, setSessions] = useState<WorkoutSessionWithAggregatedDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch all necessary data sources using our caching hook
  const { data: cachedSessions, loading: loadingSessions, error: sessionsError, refresh: refreshSessions } = useCacheAndRevalidate<LocalWorkoutSession>({
    cacheTable: 'workout_sessions',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('workout_sessions').select('*').eq('user_id', memoizedSessionUserId).not('completed_at', 'is', null).order('session_date', { ascending: false }); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'workout_history_sessions',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedSetLogs, loading: loadingSetLogs, error: setLogsError, refresh: refreshSetLogs } = useCacheAndRevalidate<LocalSetLog>({
    cacheTable: 'set_logs',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data: sessionIds, error: sessionIdsError } = await client.from('workout_sessions').select('id').eq('user_id', memoizedSessionUserId); // Use memoized ID
      if (sessionIdsError) return { data: [], error: sessionIdsError };
      if (!sessionIds || sessionIds.length === 0) return { data: [], error: null };
      
      return client.from('set_logs').select('*').in('session_id', sessionIds.map(s => s.id));
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'workout_history_set_logs',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedExerciseDefs, loading: loadingExerciseDefs, error: exerciseDefsError, refresh: refreshExerciseDefs } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client.from('exercise_definitions').select('*');
    }, []),
    queryKey: 'all_exercises_for_history',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  // 2. Process and aggregate the data once all sources are loaded
  useEffect(() => {
    const overallLoading = loadingSessions || loadingSetLogs || loadingExerciseDefs;
    setIsLoading(overallLoading);

    const anyError = sessionsError || setLogsError || exerciseDefsError;
    if (anyError) {
      setError(anyError);
      setSessions([]);
      console.error("Error loading workout history data:", anyError); // Added console.error
      toast.error("Failed to load workout history."); // Added toast.error
      return;
    }

    if (!overallLoading && cachedSessions) {
      const exerciseDefMap = new Map((cachedExerciseDefs || []).map(def => [def.id, def]));

      const sessionsWithDetails: WorkoutSessionWithAggregatedDetails[] = (cachedSessions || []).map(sessionItem => {
        let exerciseCount = new Set<string>();
        let totalVolume = 0;
        let hasPRs = false;

        (cachedSetLogs || [])
          .filter(log => log.session_id === sessionItem.id)
          .forEach(log => {
            if (log.exercise_id) {
              exerciseCount.add(log.exercise_id);
              const exerciseDef = exerciseDefMap.get(log.exercise_id);
              if (exerciseDef?.type === 'weight' && log.weight_kg && log.reps) {
                totalVolume += (log.weight_kg * log.reps);
              }
            }
            if (log.is_pb) {
              hasPRs = true;
            }
          });

        return {
          ...sessionItem,
          exercise_count: exerciseCount.size,
          total_volume_kg: totalVolume,
          has_prs: hasPRs,
        };
      });
      
      setSessions(sessionsWithDetails);
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
    sessions,
    isLoading,
    error,
    refresh,
  };
};