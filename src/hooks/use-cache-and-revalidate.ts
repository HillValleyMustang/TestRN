"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalUserAchievement, LocalGym } from '@/lib/db'; // Import specific local types

type CacheTableName = 'exercise_definitions_cache' | 't_paths_cache' | 'profiles_cache' | 't_path_exercises_cache' | 'user_achievements_cache' | 'gyms_cache';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRevalidatingRef = useRef(false); // Use ref for isRevalidating

  const data = useLiveQuery(
    () => {
      const table = db[cacheTable] as any;

      // If no user, return empty array immediately.
      // This prevents trying to read from a potentially closed/deleted DB.
      if (sessionUserId === undefined || sessionUserId === null) {
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
    if (isRevalidatingRef.current) return;

    // Crucial check: If no user, do not proceed with fetching from Supabase or writing to IndexedDB.
    // The `useLiveQuery` above already handles returning an empty array for the UI.
    if (sessionUserId === null || sessionUserId === undefined) {
      setLoading(false); // Ensure loading state is cleared if we bail out
      return;
    }

    isRevalidatingRef.current = true; // Set ref
    setError(null);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        // NEW LOGGING: Check what data is being received from Supabase for gyms_cache
        if (cacheTable === 'gyms_cache') {
          console.log(`[useCacheAndRevalidate] ${queryKey}: Remote data fetched for bulkPut:`, remoteData);
        }
        
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
      isRevalidatingRef.current = false; // Reset ref
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId]); // sessionUserId is a dependency here.

  useEffect(() => {
    // This useEffect will trigger fetchDataAndRevalidate when sessionUserId changes.
    // The fetchDataAndRevalidate itself now handles the null/undefined sessionUserId case.
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  const refresh = useCallback(() => {
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}