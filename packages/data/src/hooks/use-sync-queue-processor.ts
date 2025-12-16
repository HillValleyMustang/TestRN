import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SyncQueueItem, SyncQueueStore } from '../storage/sync-queue';

export interface UseSyncQueueProcessorOptions {
  supabase: SupabaseClient | null;
  store: SyncQueueStore;
  isOnline?: boolean;
  intervalMs?: number;
  enabled?: boolean;
  onError?: (item: SyncQueueItem, error: Error) => void;
  onSuccess?: (item: SyncQueueItem) => void;
}

export interface UseSyncQueueProcessorResult {
  isSyncing: boolean;
  queueLength: number;
  lastError: Error | null;
  processNext: () => Promise<void>;
}

const DEFAULT_INTERVAL = 5000;
const MAX_RETRY_ATTEMPTS = 5;

// Helper function to determine if an item should be synced to Supabase
const shouldSyncToSupabase = (item: SyncQueueItem): boolean => {
  const { table, payload, operation } = item;

  // Always sync non-workout related data
  if (table !== 'workout_sessions' && table !== 'set_logs') {
    return true;
  }

  // For workout sessions, only sync if completed
  if (table === 'workout_sessions') {
    if (operation === 'create' || operation === 'update') {
      return (payload as any).completed_at !== null;
    }
    // Allow deletes
    return true;
  }

  // For set logs, only sync if they belong to a completed session
  if (table === 'set_logs') {
    // Check if the session exists and is completed in the local database
    // Since this is in the data package, we can't directly access the database instance
    // For now, allow syncing - the database will handle cleanup of orphaned records
    return true;
  }

  return true;
};

export const useSyncQueueProcessor = ({
  supabase,
  store,
  isOnline = true,
  intervalMs = DEFAULT_INTERVAL,
  enabled = true,
  onError,
  onSuccess,
}: UseSyncQueueProcessorOptions): UseSyncQueueProcessorResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const processNext = useCallback(async () => {
    if (!enabled || !isOnline || isSyncing || !supabase) {
      return;
    }

    const queue = await store.getAll();
    setQueueLength(queue.length);

    if (queue.length === 0) {
      return;
    }

    const item = queue[0];
    setIsSyncing(true);

    try {
      // Check if item has exceeded max retry attempts
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[SyncQueue] Item ${item.id} has exceeded max retry attempts (${MAX_RETRY_ATTEMPTS}), removing from queue`);
        if (typeof item.id === 'number') {
          await store.remove(item.id);
        }
        setQueueLength(queue.length - 1);
        setIsSyncing(false);
        return;
      }

      // Check if item should wait due to exponential backoff
      const baseDelay = 1000; // 1 second base delay
      const backoffDelay = baseDelay * Math.pow(2, item.attempts); // Exponential backoff
      const timeSinceLastAttempt = Date.now() - item.timestamp;

      if (timeSinceLastAttempt < backoffDelay) {
        // Not enough time has passed, skip this item for now
        console.log(`[SyncQueue] Item ${item.id} waiting for backoff delay (${backoffDelay}ms), skipping`);
        setIsSyncing(false);
        return;
      }

      const { table, payload, operation } = item;

      // Check if this item should be synced to Supabase
      const shouldSync = shouldSyncToSupabase(item);
      if (!shouldSync) {
        // Remove from queue without syncing
        if (typeof item.id === 'number') {
          await store.remove(item.id);
        }
        setQueueLength(queue.length - 1);
        setIsSyncing(false);
        return;
      }

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from(table).upsert(payload as any, { onConflict: 'id' });
        if (error) throw error;

        // Verify the operation succeeded by fetching the record back
        const { data: verifyData, error: verifyError } = await supabase
          .from(table)
          .select('id')
          .eq('id', (payload as any).id)
          .maybeSingle();

        if (verifyError) {
          throw new Error(`Sync verification failed: ${verifyError.message}`);
        }

        if (!verifyData) {
          throw new Error(`Sync verification failed: Record not found after ${operation}`);
        }

      } else if (operation === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', (payload as any).id);
        if (error && error.code !== 'PGRST204') {
          throw error;
        }

        // Verify the delete operation succeeded
        const { data: verifyData, error: verifyError } = await supabase
          .from(table)
          .select('id')
          .eq('id', (payload as any).id)
          .maybeSingle();

        if (verifyError) {
          throw new Error(`Delete verification failed: ${verifyError.message}`);
        }

        if (verifyData) {
          throw new Error('Delete verification failed: Record still exists after delete');
        }
      }

      // Only remove from queue after successful verification
      if (typeof item.id === 'number') {
        await store.remove(item.id);
      }

      setQueueLength(queue.length - 1);
      setLastError(null);
      onSuccess?.(item);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLastError(error);
      if (typeof item.id === 'number') {
        await store.incrementAttempts(item.id, error.message);
      }
      onError?.(item, error);
    } finally {
      setIsSyncing(false);
    }
  }, [enabled, isOnline, isSyncing, supabase, store, onError, onSuccess]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      processNext();
    };

    const interval = setInterval(tick, intervalMs);
    tick();

    return () => clearInterval(interval);
  }, [enabled, intervalMs, processNext]);

  return useMemo(
    () => ({
      isSyncing,
      queueLength,
      lastError,
      processNext,
    }),
    [isSyncing, queueLength, lastError, processNext],
  );
};
