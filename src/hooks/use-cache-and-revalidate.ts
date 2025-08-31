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
  sessionUserId: string | null; // Pass user ID to filter user-specific data
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
 * @param {string | null} sessionUserId - The current user's ID, used to filter user-specific data.
 * @returns {{ data: T[] | null, loading: boolean, error: string | null, refresh: () => void }}
 */
export function useCacheAndRevalidate<T extends { id: string; user_id: string | null }>( // Add user_id to T
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId }: UseCacheAndRevalidateProps<T>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // Use Dexie's useLiveQuery to reactively get data from IndexedDB
  const cachedData = useLiveQuery(
    () => {
      // Dynamically select the correct table and cast it to the expected type
      const table = db[cacheTable] as typeof cacheTable extends 'exercise_definitions_cache' 
        ? typeof db.exercise_definitions_cache 
        : typeof db.t_paths_cache;

      if (sessionUserId) {
        // Fetch user's own items or global items
        return table.where('user_id').equals(sessionUserId).or('user_id').equals(null as any).toArray() as unknown as Promise<T[]>;
      }
      // If no user ID, only fetch global items (user_id is null)
      return table.where('user_id').equals(null as any).toArray() as unknown as Promise<T[]>;
    },
    [cacheTable, sessionUserId]
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    if (!supabase || isRevalidating) return;

    setIsRevalidating(true);
    setError(null);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);

      if (remoteError) {
        console.error(`Error fetching ${queryKey} from Supabase:`, remoteError);
        setError(remoteError.message || `Failed to fetch ${queryKey}.`);
        // If remote fetch fails, we still want to show cached data if available
        setLoading(false);
        return;
      }

      if (remoteData) {
        // Dynamically select the correct table for operations
        const table = db[cacheTable] as typeof cacheTable extends 'exercise_definitions_cache' 
          ? typeof db.exercise_definitions_cache 
          : typeof db.t_paths_cache;

        // Convert remoteData to a Map for easier comparison
        const remoteMap = new Map(remoteData.map(item => [item.id, item]));
        const cachedMap = new Map((cachedData || []).map(item => [item.id, item]));

        let needsUpdate = false;
        const itemsToPut: T[] = [];

        // Check for new or updated items
        for (const remoteItem of remoteData) {
          const cachedItem = cachedMap.get(remoteItem.id);
          if (!cachedItem || JSON.stringify(remoteItem) !== JSON.stringify(cachedItem)) {
            needsUpdate = true;
            itemsToPut.push(remoteItem);
          }
        }

        // Check for deleted items (items in cache but not in remote)
        for (const cachedItem of (cachedData || [])) {
          if (!remoteMap.has(cachedItem.id)) {
            needsUpdate = true;
            // Mark for deletion from cache
            await table.delete(cachedItem.id);
          }
        }

        if (needsUpdate) {
          // Use bulkPut for efficiency, it handles both inserts and updates
          await table.bulkPut(itemsToPut as any);
          console.log(`Cached ${itemsToPut.length} items for ${queryKey}.`);
        }
      }
    } catch (err: any) {
      console.error(`Unhandled error during ${queryKey} revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [supabase, supabaseQuery, queryKey, cachedData, cacheTable, isRevalidating, sessionUserId]);

  useEffect(() => {
    // On initial load or when dependencies change, try to revalidate
    if (sessionUserId !== undefined) { // Check for undefined to allow null for global data
      fetchDataAndRevalidate();
    } else {
      // If sessionUserId is undefined (e.g., not yet loaded), or explicitly null,
      // we might need to clear cache or handle global data differently.
      // For now, if no user, clear user-specific cache and stop loading.
      // Global data (user_id: null) will be fetched if sessionUserId is null.
      if (sessionUserId === null) {
        const table = db[cacheTable] as typeof cacheTable extends 'exercise_definitions_cache' 
          ? typeof db.exercise_definitions_cache 
          : typeof db.t_paths_cache;
        table.where('user_id').notEqual(null as any).delete(); // Clear only user-specific data
      }
      setLoading(false);
    }
  }, [fetchDataAndRevalidate, sessionUserId, cacheTable]);

  const refresh = useCallback(() => {
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: cachedData as T[] | undefined, loading, error, refresh };
}