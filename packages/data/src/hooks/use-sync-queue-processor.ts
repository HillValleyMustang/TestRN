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
      const { table, payload, operation } = item;

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from(table).upsert(payload as any, { onConflict: 'id' });
        if (error) throw error;
      } else if (operation === 'delete') {
        const { error } = await supabase.from(table).delete().eq('id', (payload as any).id);
        if (error && error.code !== 'PGRST204') {
          throw error;
        }
      }

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
