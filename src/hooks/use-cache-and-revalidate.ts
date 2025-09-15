"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalUserAchievement } from '@/lib/db'; // Import specific local types
import { useSession } from '@/components/session-context-provider'; // Import useSession to get access_token

type CacheTableName = 'exercise_definitions_cache' | 't_paths_cache' | 'profiles_cache' | 't_path_exercises_cache' | 'user_achievements_cache';

interface UseCacheAndRevalidateProps<T> {
  cacheTable: CacheTableName;
  supabaseQuery: (supabase: SupabaseClient) => Promise<{ data: T[] | null; error: any }>;
  queryKey: string;
  supabase: SupabaseClient;
  sessionUserId: string | null | undefined;
}

export function useCacheAndRevalidate<T extends { id: string; user_id?: string | null; template_id?: string; exercise_id?: string; created_at?: string | null }>( // Updated generic constraint
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId }: UseCacheAndRevalidateProps<T>
) {
  const { session } = useSession(); // Get the session from context
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  const data = useLiveQuery(
    () => {
      const table = db[cacheTable] as any;

      if (sessionUserId === undefined) {
        return [];
      }

      // If the table is one that doesn't have a user_id, just return everything.
      // The consuming hook will be responsible for further filtering.
      if (cacheTable === 't_path_exercises_cache') {
        return table.toArray();
      }

      const filteredData = table.filter((item: T) => {
        if (cacheTable === 'profiles_cache') {
          return item.id === sessionUserId;
        }
        // This is correct for exercises and t_paths
        return item.user_id === null || item.user_id === sessionUserId;
      }).toArray();
      return filteredData;
    },
    [cacheTable, sessionUserId],
    []
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    // isRevalidating is used here to prevent re-entry, but should not be a dependency of useCallback
    if (!supabase || isRevalidating) return; 

    setIsRevalidating(true);
    setError(null);

    try {
      console.log(`[useCacheAndRevalidate] Fetching for ${queryKey}. User ID: ${sessionUserId}, Access Token present: ${!!session?.access_token}`); // ADDED LOG
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        await db.transaction('rw', table, async () => {
          if (cacheTable === 'profiles_cache') {
            await table.clear();
            if (remoteData.length > 0) {
              await table.put(remoteData[0]);
            }
          } else {
            await table.clear();
            await table.bulkPut(remoteData);
          }
        });
      }
    } catch (err: any) {
      console.error(`Error during ${queryKey} revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
      toast.info(`Failed to refresh data for ${queryKey}.`); // Replaced toast.error
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId, session?.access_token]); // Added session?.access_token to dependencies

  useEffect(() => {
    if (sessionUserId !== undefined) {
      fetchDataAndRevalidate();
    } else {
      setLoading(false);
    }
  }, [fetchDataAndRevalidate, sessionUserId]);

  const refresh = useCallback(() => {
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}