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

      // If the session is still loading, return an empty array to prevent any query.
      if (sessionUserId === undefined) {
        return [];
      }

      // This is the new, more robust filtering strategy.
      // It fetches all items and filters them in code, which avoids the
      // underlying 'IDBKeyRange' error caused by the race condition with `anyOf`.
      return table.filter((item: T) => {
        return item.user_id === null || item.user_id === sessionUserId;
      }).toArray();
    },
    [cacheTable, sessionUserId], // The query re-runs safely when sessionUserId changes.
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
  }, [supabase, supabaseQuery, queryKey, cacheTable]); // Removed isRevalidating from dependencies

  useEffect(() => {
    // We still wait for sessionUserId to be defined before fetching from the server.
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