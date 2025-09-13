"use client";

import { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalUserAchievement, LocalUserAlert } from '@/lib/db'; // Import specific local types

type CacheTableName = 'exercise_definitions_cache' | 't_paths_cache' | 'profiles_cache' | 't_path_exercises_cache' | 'user_achievements_cache' | 'user_alerts'; // Added user_alerts

interface UseCacheAndRevalidateProps<T> {
  cacheTable: CacheTableName;
  supabaseQuery: (supabase: SupabaseClient) => Promise<{ data: T[] | null; error: any }>;
  queryKey: string;
  supabase: SupabaseClient;
  sessionUserId: string | null | undefined;
  refetchTrigger?: number; // New prop for explicit refetching
}

export function useCacheAndRevalidate<T extends { id: string; user_id?: string | null; template_id?: string; exercise_id?: string; created_at?: string | null }>( // Updated generic constraint
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId, refetchTrigger }: UseCacheAndRevalidateProps<T>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const initialFetchCompleted = useRef(false); // To track if initial fetch has run

  const data = useLiveQuery(
    () => {
      const table = db[cacheTable] as any;

      if (sessionUserId === undefined) {
        return [];
      }

      // If the table is one that doesn't have a user_id, just return everything.
      // The consuming hook will be responsible for further filtering.
      if (cacheTable === 't_path_exercises_cache' || cacheTable === 'exercise_definitions_cache') {
        return table.toArray();
      }

      const filteredData = table.filter((item: T) => {
        if (cacheTable === 'profiles_cache') {
          return item.id === sessionUserId;
        }
        // This is correct for t_paths, user_achievements, user_alerts
        return item.user_id === sessionUserId;
      }).toArray();
      return filteredData;
    },
    [cacheTable, sessionUserId],
    []
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    if (!supabase || isRevalidating || sessionUserId === undefined) return; 

    setIsRevalidating(true);
    setError(null);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        await db.transaction('rw', table, async () => {
          // Clear only relevant data for the current user or specific table
          if (cacheTable === 'profiles_cache' && sessionUserId) {
            await table.where('id').equals(sessionUserId).delete();
            if (remoteData.length > 0) {
              await table.put(remoteData[0]);
            }
          } else if (cacheTable === 'user_achievements_cache' && sessionUserId) {
            await table.where('user_id').equals(sessionUserId).delete();
            await table.bulkPut(remoteData);
          } else if (cacheTable === 'user_alerts' && sessionUserId) { // NEW: Handle user_alerts
            await table.where('user_id').equals(sessionUserId).delete();
            await table.bulkPut(remoteData);
          } else if (cacheTable === 't_paths_cache' && sessionUserId) {
            // For t_paths, clear user-owned ones and re-insert. Global ones remain.
            await table.filter((item: LocalTPath) => item.user_id === sessionUserId).delete();
            await table.bulkPut(remoteData); // remoteData will contain both global and user-owned
          } else if (cacheTable === 't_path_exercises_cache') {
            // For t_path_exercises, clear all and re-insert, as they are linked to t_paths
            // This assumes t_path_exercises are always re-generated with t_paths
            await table.clear();
            await table.bulkPut(remoteData);
          } else if (cacheTable === 'exercise_definitions_cache') {
            // For exercise_definitions, clear user-owned ones and re-insert. Global ones remain.
            await table.filter((item: LocalExerciseDefinition) => item.user_id === sessionUserId).delete();
            await table.bulkPut(remoteData); // remoteData will contain both global and user-owned
          } else {
            // Fallback for other tables or if no specific user filtering is needed
            await table.clear();
            await table.bulkPut(remoteData);
          }
        });
      }
    } catch (err: any) {
      console.error(`Error during ${queryKey} revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId]);

  useEffect(() => {
    if (sessionUserId !== undefined) {
      if (!initialFetchCompleted.current || refetchTrigger !== undefined) {
        fetchDataAndRevalidate();
        initialFetchCompleted.current = true;
      }
    } else {
      setLoading(false);
    }
  }, [fetchDataAndRevalidate, sessionUserId, refetchTrigger]); // Added refetchTrigger to dependencies

  const refresh = useCallback(async () => {
    await fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}