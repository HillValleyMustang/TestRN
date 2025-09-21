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
        console.log(`[useLiveQuery - ${queryKey}] No sessionUserId. Returning empty array.`);
        return [];
      }

      // If the table is one that doesn't have a user_id, just return everything.
      // The consuming hook will be responsible for further filtering.
      if (cacheTable === 't_path_exercises_cache') {
        const result = table.toArray();
        console.log(`[useLiveQuery - ${queryKey}] Returning all items for ${cacheTable}. Count: ${result.length}`);
        return result;
      }

      const filteredData = table.filter((item: T) => {
        if (cacheTable === 'profiles_cache') {
          const isMatch = item.id === sessionUserId;
          console.log(`[useLiveQuery - ${queryKey}] Filtering profile: item.id=${item.id}, sessionUserId=${sessionUserId}, Match: ${isMatch}`);
          return isMatch;
        }
        // This is correct for exercises and t_paths
        const isMatch = item.user_id === null || item.user_id === sessionUserId;
        console.log(`[useLiveQuery - ${queryKey}] Filtering by user_id: item.user_id=${item.user_id}, sessionUserId=${sessionUserId}, Match: ${isMatch}`);
        return isMatch;
      }).toArray();
      console.log(`[useLiveQuery - ${queryKey}] Returning filtered data. Count: ${filteredData.length}`);
      return filteredData;
    },
    [cacheTable, sessionUserId],
    []
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    console.log(`[fetchDataAndRevalidate - ${queryKey}] Called. isRevalidatingRef.current: ${isRevalidatingRef.current}`);
    if (isRevalidatingRef.current) {
      console.log(`[fetchDataAndRevalidate - ${queryKey}] Already revalidating. Skipping.`);
      return;
    }

    // Crucial check: If no user, do not proceed with fetching from Supabase or writing to IndexedDB.
    // The `useLiveQuery` above already handles returning an empty array for the UI.
    if (sessionUserId === null || sessionUserId === undefined) {
      console.log(`[fetchDataAndRevalidate - ${queryKey}] No sessionUserId. Bailing out.`);
      setLoading(false); // Ensure loading state is cleared if we bail out
      return;
    }

    isRevalidatingRef.current = true; // Set ref
    setLoading(true); // Ensure loading is true when starting fetch
    setError(null);

    try {
      console.log(`[fetchDataAndRevalidate - ${queryKey}] Calling supabaseQuery.`);
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;
      console.log(`[fetchDataAndRevalidate - ${queryKey}] Supabase query returned data. Count: ${remoteData?.length || 0}`);

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        // NEW LOGGING: Check what data is being received from Supabase for gyms_cache
        if (cacheTable === 'gyms_cache') {
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
              console.log(`[useCacheAndRevalidate] ${queryKey}: No profile data from remote, ensuring cache is clear.`);
            }
          } else {
            await table.bulkPut(remoteData);
            console.log(`[useCacheAndRevalidate] ${queryKey}: Bulk put ${remoteData.length} items.`);
          }
          console.log(`[useCacheAndRevalidate] ${queryKey}: Transaction completed.`);
          // NEW: Log table contents immediately after transaction
          if (cacheTable === 'gyms_cache') {
            const currentTableContents = await table.toArray();
            console.log(`[useCacheAndRevalidate] ${queryKey}: Current gyms_cache contents after transaction:`, currentTableContents);
          }
        });
      }
    } catch (err: any) {
      console.error(`[fetchDataAndRevalidate - ${queryKey}] Error during revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
      toast.info(`Failed to refresh data for ${queryKey}.`); // Replaced toast.error
    } finally {
      setLoading(false);
      isRevalidatingRef.current = false; // Reset ref
      console.log(`[fetchDataAndRevalidate - ${queryKey}] Finished. Loading: ${false}, isRevalidatingRef.current: ${false}`);
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId]); // sessionUserId is a dependency here.

  useEffect(() => {
    // This useEffect will trigger fetchDataAndRevalidate when sessionUserId changes.
    // The fetchDataAndRevalidate itself now handles the null/undefined sessionUserId case.
    console.log(`[useEffect - ${queryKey}] sessionUserId changed to: ${sessionUserId}. Triggering fetchDataAndRevalidate.`);
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate, sessionUserId]); // Added sessionUserId to dependencies

  const refresh = useCallback(() => {
    console.log(`[refresh - ${queryKey}] Called.`);
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}