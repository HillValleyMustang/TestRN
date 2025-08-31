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

  const data = useLiveQuery(
    () => {
      const table = db[cacheTable] as any;

      // Explicitly handle the undefined case first. This is the most critical part.
      // If the session state is not yet determined, we must not execute a query with an invalid key.
      if (sessionUserId === undefined) {
        // Returning an empty array is safe and tells the hook there's no data yet for this state.
        return [] as T[];
      }

      // If the user is logged out, sessionUserId will be null.
      if (sessionUserId === null) {
        // Query for global data only (where user_id is null). This is a valid query.
        return table.where('user_id').equals(null).toArray();
      }

      // If we reach this point, sessionUserId is guaranteed to be a string.
      // Query for the user's data plus global data. This is also a valid query.
      return table.where('user_id').anyOf(sessionUserId, null).toArray();
    },
    [cacheTable, sessionUserId], // The query re-runs when sessionUserId changes.
    [] // Default to an empty array while loading.
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