"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { SupabaseClient, Session } from '@supabase/supabase-js'; // Import Session
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
  sessionUserId: string | null; // This prop will now receive memoizedSessionUserId
}

// Helper to get a stable key for map lookups, handling composite keys
const getItemKey = (item: any, primaryKey: string | string[]): string => {
  if (Array.isArray(primaryKey)) {
    return JSON.stringify(primaryKey.map(key => item[key]));
  }
  return item[primaryKey];
};

export function useCacheAndRevalidate<T extends CacheItem>( // Updated generic constraint
  { cacheTable, supabaseQuery, queryKey, supabase, sessionUserId }: UseCacheAndRevalidateProps<T>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRevalidatingRef = useRef(false); // Use ref for isRevalidating

  const data = useLiveQuery(
    async () => {
      const table = db[cacheTable] as any;
      if (!sessionUserId) return [];

      if (cacheTable === 'set_logs') {
        const userSessionIds = await db.workout_sessions
          .where({ user_id: sessionUserId })
          .primaryKeys();
        return userSessionIds.length > 0 ? table.where('session_id').anyOf(userSessionIds).toArray() : [];
      }

      // More specific queries for better reactivity
      if (cacheTable === 'profiles_cache') {
        return table.where({ id: sessionUserId }).toArray();
      }
      if (['workout_sessions', 'gyms_cache', 'activity_logs', 'user_achievements_cache'].includes(cacheTable)) {
        return table.where({ user_id: sessionUserId }).toArray();
      }
      if (['exercise_definitions_cache', 't_paths_cache'].includes(cacheTable)) {
        return table.where('user_id').equals(sessionUserId).or('user_id').equals(null).toArray();
      }
      
      // Fallback for tables without a simple user_id index (e.g., t_path_exercises, gym_exercises_cache)
      return table.toArray();
    },
    [cacheTable, sessionUserId],
    []
  );

  const fetchDataAndRevalidate = useCallback(async () => {
    if (isRevalidatingRef.current) {
      return;
    }

    if (sessionUserId === null || sessionUserId === undefined) {
      setLoading(false);
      return;
    }

    isRevalidatingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const { data: remoteData, error: remoteError } = await supabaseQuery(supabase);
      if (remoteError) throw remoteError;

      if (remoteData) {
        const table = db[cacheTable] as any;
        const primaryKey = table.schema.primKey.keyPath;

        const localData = await table.toArray();
        
        const localDataMap = new Map(localData.map((item: any) => [getItemKey(item, primaryKey), item]));
        const remoteDataMap = new Map(remoteData.map((item: any) => [getItemKey(item, primaryKey), item]));

        const itemsToDelete: any[] = [];
        const itemsToPut: T[] = [];

        // Check sync queue before deleting
        const syncQueueItems = await db.sync_queue.where('table').equals(cacheTable).toArray();
        const itemsInSyncQueue = new Set(syncQueueItems.map(item => getItemKey(item.payload, primaryKey)));

        // Identify items to delete
        for (const localKey of localDataMap.keys()) {
          if (!remoteDataMap.has(localKey as string) && !itemsInSyncQueue.has(localKey as string)) {
            itemsToDelete.push(localKey);
          }
        }

        // Identify items to add or update
        for (const [remoteKey, remoteItem] of remoteDataMap.entries()) {
          const localItem = localDataMap.get(remoteKey);
          if (!localItem || JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
            itemsToPut.push(remoteItem);
          }
        }

        if (itemsToDelete.length > 0 || itemsToPut.length > 0) {
          await db.transaction('rw', table, async () => {
            if (itemsToDelete.length > 0) {
              await table.bulkDelete(itemsToDelete);
            }
            if (itemsToPut.length > 0) {
              await table.bulkPut(itemsToPut);
            }
          });
        }
      }
    } catch (err: any) {
      const errorMessage = (err && typeof err === 'object' && 'message' in err && err.message) 
                           ? err.message 
                           : (JSON.stringify(err) !== '{}' ? JSON.stringify(err) : `An unknown error occurred during ${queryKey} revalidation.`);
      setError(errorMessage);
      toast.error(`Failed to refresh data for ${queryKey}: ${errorMessage}`);
    } finally {
      setLoading(false);
      isRevalidatingRef.current = false;
    }
  }, [supabase, supabaseQuery, queryKey, cacheTable, sessionUserId]);

  useEffect(() => {
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  const refresh = useCallback(() => {
    fetchDataAndRevalidate();
  }, [fetchDataAndRevalidate]);

  return { data: data as T[] | null, loading: loading || data === undefined, error, refresh };
}