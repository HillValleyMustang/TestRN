"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath } from '@/lib/db'; // Import specific local types

interface UseCacheAndRevalidateProps<T> {
  cacheTable: 'exercise_definitions_cache' | 't_paths_cache'; // Narrow down cacheTable type
  supabaseQuery: (supabase: SupabaseClient) => Promise<{ data: T[] | null; error: any }>; // Function to fetch data from Supabase
  queryKey: string; // A unique key for this specific query (e.g., 'all_exercises', 'user_t_paths')
  supabase: SupabaseClient;
  sessionUserId: string | null | undefined; // Allow undefined for initial loading state
}

/**
 * A custom hook for client-side data caching with a stale-while-revalidate strategy.
 * It fetches data from IndexedDB first, then revalidates with Supabase in the background.
 *
 * @param {string} cacheTable - The name of the Dexie table to use for caching (e.g., 'exercise_definitions_cache').
 * @param {Function} supabaseQuery - An async function that takes the Supabase client and returns a Promise
 *                                   of { data: T[] | null, error: any } from a Supabase query.
 * @param {string} queryKey - A unique string key for this specific query, used for logging/debugging.
 * @param {SupabaseClient} supabase - The Supabase client instance.
 * @param {string | null | undefined} sessionUserId - The current user's ID, used to filter user-specific data.
 * @returns {{ data: T[] | null, loading: boolean, error: string | null, refresh: () => void }}
 */
export function useCacheAndRevalidate<T extends { id: string; user_id: string | null }>( // Add user_id to T
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId }: UseCacheAndRevalidateProps<T>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [filteredData, setFilteredData] = useState<T[] | undefined>(undefined);

  // Step 1: Fetch ALL data from the cache table without filtering.
  // This avoids passing a potentially undefined key to Dexie.
  const allCachedData = useLiveQuery(
    () => {
      const table = db[cacheTable] as typeof cacheTable extends 'exercise_definitions_cache' 
        ? typeof db.exercise_definitions_cache 
        : typeof db.t_paths_cache;
      return table.toArray() as unknown as Promise<T[]>;
    },
    [cacheTable] // Only depends on the table name
  );

  // Step 2: Filter the data in a useEffect once both the data and session are ready.
  useEffect(() => {
    if (sessionUserId === undefined || allCachedData === undefined) {
      // If session or data is not ready, do nothing and wait.
      return;
    }

    if (sessionUserId === null) {
      // User is logged out, show only global items
      setFilteredData(allCachedData.filter(item => item.user_id === null));
    } else {
      // User is logged in, show their items and global items
      setFilteredData(allCachedData.filter(item => item.user_id === sessionUserId || item.user_id === null));
    }
  }, [allCachedData, sessionUserId]);


  const fetchDataAndRevalidate = useCallback(async () => {
    if (!supabase || isRevalidating) return;

    setIsRevalidating(true);
    setError(null);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);

      if (remoteError) {
        console.error(`Error fetching ${queryKey} from Supabase:`, remoteError);
        setError(remoteError.message || `Failed to fetch ${queryKey}.`);
        setLoading(false);
        return;
      }

      if (remoteData) {
        const table = db[cacheTable] as typeof cacheTable extends 'exercise_definitions_cache' 
          ? typeof db.exercise_definitions_cache 
          : typeof db.t_paths_cache;

        const remoteMap = new Map(remoteData.map(item => [item.id, item]));
        const cachedMap = new Map((allCachedData || []).map(item => [item.id, item]));

        let needsUpdate = false;
        const itemsToPut: T[] = [];
        const itemsToDelete: string[] = [];

        for (const remoteItem of remoteData) {
          const cachedItem = cachedMap.get(remoteItem.id);
          if (!cachedItem || JSON.stringify(remoteItem) !== JSON.stringify(cachedItem)) {
            needsUpdate = true;
            itemsToPut.push(remoteItem);
          }
        }

        for (const cachedItem of (allCachedData || [])) {
          if (!remoteMap.has(cachedItem.id)) {
            needsUpdate = true;
            itemsToDelete.push(cachedItem.id);
          }
        }

        if (needsUpdate) {
          await db.transaction('rw', table, async () => {
            if (itemsToDelete.length > 0) {
              await table.bulkDelete(itemsToDelete);
            }
            if (itemsToPut.length > 0) {
              await table.bulkPut(itemsToPut as any);
            }
          });
          console.log(`Synced cache for ${queryKey}.`);
        }
      }
    } catch (err: any) {
      console.error(`Unhandled error during ${queryKey} revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [supabase, supabaseQuery, queryKey, allCachedData, cacheTable, isRevalidating]);

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

  return { data: filteredData, loading: loading || filteredData === undefined, error, refresh };
}