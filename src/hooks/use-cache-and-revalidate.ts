"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalUserAchievement, LocalGym, LocalActivityLog, LocalGymExercise } from '@/lib/db'; // Import specific local types

type CacheTableName = 'exercise_definitions_cache' | 't_paths_cache' | 'profiles_cache' | 't_path_exercises_cache' | 'user_achievements_cache' | 'gyms_cache' | 'workout_sessions' | 'set_logs' | 'activity_logs' | 'gym_exercises_cache';

// Updated generic constraint to be more flexible for tables without a single 'id'
type CacheItem = { 
  id?: string | null; 
  user_id?: string | null; 
  template_id?: string | null; 
  exercise_id?: string | null; 
  gym_id?: string | null; 
  created_at?: string | null; 
};

interface UseCacheAndRevalidateProps<T extends CacheItem> {
  cacheTable: CacheTableName;
  supabaseQuery: (supabase: SupabaseClient) => Promise<{ data: T[] | null; error: any }>;
  queryKey: string;
  supabase: SupabaseClient;
  sessionUserId: string | null | undefined;
}

export function useCacheAndRevalidate<T extends CacheItem>( // Updated generic constraint
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
        console.log(`[useCacheAndRevalidate] ${queryKey}: No sessionUserId, returning empty array from IndexedDB.`);
        return [];
      }

      // Special handling for tables with composite keys or no user_id filter
      if (cacheTable === 't_path_exercises_cache' || cacheTable === 'gym_exercises_cache') {
        console.log(`[useCacheAndRevalidate] ${queryKey}: Fetching all from IndexedDB (no user_id filter).`);
        return table.toArray();
      }

      const filteredData = table.filter((item: T) => {
        if (cacheTable === 'profiles_cache') {
          return item.id === sessionUserId;
        }
        // This is correct for exercises and t_paths
        return item.user_id === null || item.user_id === sessionUserId;
      }).toArray();
      console.log(`[useCacheAndRevalidate] ${queryKey}: Fetched ${filteredData.length} items from IndexedDB for user ${sessionUserId}.`);
      return filteredData;
    },
    [cacheTable, sessionUserId],
    []
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    console.log(`[useCacheAndRevalidate] ${queryKey}: fetchDataAndRevalidate called.`);
    if (isRevalidatingRef.current) {
      console.log(`[useCacheAndRevalidate] ${queryKey}: Already revalidating, skipping.`);
      return;
    }

    // Crucial check: If no user, do not proceed with fetching from Supabase or writing to IndexedDB.
    // The `useLiveQuery` above already handles returning an empty array for the UI.
    if (sessionUserId === null || sessionUserId === undefined) {
      console.log(`[useCacheAndRevalidate] ${queryKey}: No sessionUserId, skipping Supabase fetch and IndexedDB write.`);
      setLoading(false); // Ensure loading state is cleared if we bail out
      return;
    }

    isRevalidatingRef.current = true; // Set ref
    setError(null);
    setLoading(true); // Ensure loading is true when starting revalidation

    try {
      console.log(`[useCacheAndRevalidate] ${queryKey}: Fetching remote data from Supabase.`);
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        // NEW LOGGING: Check what data is being received from Supabase for gyms_cache
        if (cacheTable === 'gyms_cache' || cacheTable === 'gym_exercises_cache') {
          console.log(`[useCacheAndRevalidate] ${queryKey}: Remote data fetched for bulkPut:`, remoteData);
        }
        
        await db.transaction('rw', table, async () => {
          console.log(`[useCacheAndRevalidate] ${queryKey}: Starting transaction for bulkPut.`);
          await table.clear();
          console.log(`[useCacheAndRevalidate] ${queryKey}: Table cleared.`);
          if (cacheTable === 'profiles_cache') {
            if (remoteData.length > 0) {
              await table.put(remoteData[0]);
              console.log(`[useCacheAndRevalidate] ${queryKey}: Profile put.`);
            } else {
              console.log(`[useCacheAndRevalidate] ${queryKey}: No profile data to put.`);
            }
          } else {
            await table.bulkPut(remoteData);
            console.log(`[useCacheAndRevalidate] ${queryKey}: Bulk put ${remoteData.length} items.`);
          }
          console.log(`[useCacheAndRevalidate] ${queryKey}: Transaction completed.`);
          // NEW: Log table contents immediately after transaction
          if (cacheTable === 'gyms_cache' || cacheTable === 't_paths_cache' || cacheTable === 't_path_exercises_cache' || cacheTable === 'gym_exercises_cache') {
            const currentTableContents = await table.toArray();
            console.log(`[useCacheAndRevalidate] ${queryKey}: Current ${cacheTable} contents after transaction:`, currentTableContents);
          }
        });
      }
    } catch (err: any) {
      console.error(`[useCacheAndRevalidate] Error during ${queryKey} revalidation:`, err);
      // More robust error message extraction
      const errorMessage = (err && typeof err === 'object' && 'message' in err && err.message) 
                           ? err.message 
                           : (JSON.stringify(err) !== '{}' ? JSON.stringify(err) : `An unknown error occurred during ${queryKey} revalidation.`);
      setError(errorMessage);
      toast.error(`Failed to refresh data for ${queryKey}: ${errorMessage}`);
    } finally {
      setLoading(false);
      isRevalidatingRef.current = false; // Reset ref
      console.log(`[useCacheAndRevalidate] ${queryKey}: fetchDataAndRevalidate finished. Loading: ${false}, Error: ${error}`);
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId]); // sessionUserId is a dependency here.

  useEffect(() => {
    // This useEffect will trigger fetchDataAndRevalidate when sessionUserId changes.
    // The fetchDataAndRevalidate itself now handles the null/undefined sessionUserId case.
    console.log(`[useCacheAndRevalidate] ${queryKey}: useEffect for sessionUserId triggered. Calling fetchDataAndRevalidate.`);
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  const refresh = useCallback(() => {
    console.log(`[useCacheAndRevalidate] ${queryKey}: Manual refresh called.`);
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}