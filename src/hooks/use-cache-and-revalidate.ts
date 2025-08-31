"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { LocalExerciseDefinition, LocalTPath } from '@/lib/db'; // Import specific local types

interface UseCacheAndRevalidateProps<T> {
  cacheTable: 'exercise_definitions_cache' | 't_paths_cache';
  supabaseQuery: (supabase: SupabaseClient) => Promise<{ data: T[] | null; error: any }>;
  queryKey: string;
  supabase: SupabaseClient;
  sessionUserId: string | null | undefined;
}

export function useCacheAndRevalidate<T extends { id: string; user_id: string | null }>(
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId }: UseCacheAndRevalidateProps<T>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // This is the new, safer query. It explicitly handles the `undefined` state for sessionUserId.
  const data = useLiveQuery(
    () => {
      const table = db[cacheTable] as any;
      if (sessionUserId === undefined) {
        // Session state is not yet known, return empty array to prevent Dexie error.
        // The query will re-run automatically when sessionUserId changes.
        return [] as T[];
      }
      if (sessionUserId === null) { // User is logged out, fetch only global data
        return table.where('user_id').equals(null).toArray();
      }
      // User is logged in, fetch user's data and global data
      return table.where('user_id').anyOf(sessionUserId, null).toArray();
    },
    [cacheTable, sessionUserId], // Dependencies are now safe
    [] // Default to an empty array while loading
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    if (!supabase || isRevalidating) return;

    setIsRevalidating(true);
    setError(null);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        
        // A simple but robust sync strategy for a cache: clear and bulk-put.
        // This ensures the local cache is always a perfect mirror of the server data.
        await db.transaction('rw', table, async () => {
          await table.clear();
          await table.bulkPut(remoteData);
        });
        console.log(`Synced cache for ${queryKey}.`);
      }
    } catch (err: any) {
      console.error(`Error during ${queryKey} revalidation:`, err);
      setError(err.message || `An unexpected error occurred during ${queryKey} revalidation.`);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, [supabase, isRevalidating, supabaseQuery, queryKey, cacheTable]);

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