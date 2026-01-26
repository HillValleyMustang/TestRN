import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const DEFAULT_INTERVAL = 5000; // 5 seconds - active sync interval
const IDLE_INTERVAL = 30000; // 30 seconds - idle sync interval
const MAX_RETRY_ATTEMPTS = 5;
const BATCH_SIZE = 5; // Process up to 5 items at once
const MAX_CONSECUTIVE_EMPTY_RUNS = 3; // After 3 empty runs, switch to idle mode

// Priority levels (higher number = higher priority)
const PRIORITY = {
  CRITICAL: 100, // User profile changes, immediate sync needs
  HIGH: 75,      // Workout sessions
  MEDIUM: 50,    // Set logs
  LOW: 25,       // Analytics, preferences
} as const;

// Helper function to assign priority to sync items
const getItemPriority = (item: SyncQueueItem): number => {
  const { table, operation } = item;

  // High: Workout sessions (core user data - sync these first)
  if (table === 'workout_sessions') return PRIORITY.HIGH;

  // Medium: Set logs (detailed workout data - sync after sessions)
  if (table === 'set_logs') return PRIORITY.MEDIUM;

  // Default priority
  return PRIORITY.MEDIUM;
};

// Helper function to sanitize payload for Supabase sync by removing local-only fields
const sanitizePayloadForSupabase = (table: string, payload: any): any => {
  const sanitized = { ...payload };

  // Remove local-only fields that don't exist in Supabase schema
  const localOnlyFields = {
    workout_sessions: ['sync_status'],
    set_logs: [],
    profiles: [],
    t_paths: [],
    t_path_exercises: [],
    gyms: [],
    exercise_definitions: [],
    body_measurements: [],
    user_goals: [],
    user_achievements: [],
    workout_templates: [],
  };

  const fieldsToRemove = localOnlyFields[table as keyof typeof localOnlyFields] || [];
  fieldsToRemove.forEach(field => {
    delete sanitized[field];
  });

  return sanitized;
};

// Helper function to determine if an item should be synced to Supabase
const shouldSyncToSupabase = (item: SyncQueueItem): boolean => {
  const { table, payload, operation } = item;

  // Always sync non-workout related data
  if (table !== 'workout_sessions' && table !== 'set_logs') {
    return true;
  }

  // For workout sessions, only sync if completed (has completed_at)
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
  const [consecutiveEmptyRuns, setConsecutiveEmptyRuns] = useState(0);

  // Refs for debouncing state updates to reduce UI re-renders
  const queueLengthTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueLengthRef = useRef<number | null>(null);

  // Debounced state update functions to reduce UI re-renders
  const debouncedSetQueueLength = useCallback((length: number | ((prev: number) => number)) => {
    // Handle functional updates
    const newLength = typeof length === 'function' ? length(queueLength) : length;
    pendingQueueLengthRef.current = newLength;

    if (queueLengthTimeoutRef.current) {
      clearTimeout(queueLengthTimeoutRef.current);
    }

    queueLengthTimeoutRef.current = setTimeout(() => {
      if (pendingQueueLengthRef.current !== null) {
        setQueueLength(pendingQueueLengthRef.current);
        pendingQueueLengthRef.current = null;
      }
    }, 100); // 100ms debounce
  }, [queueLength]);

  const isSyncingRef = useRef(false);

  const processNext = useCallback(async () => {
    if (!enabled || !isOnline || isSyncingRef.current || !supabase) {
      return;
    }

    const queue = await store.getAll();
    debouncedSetQueueLength(queue.length);

    if (queue.length === 0) {
      // Track consecutive empty runs for adaptive sync intervals
      setConsecutiveEmptyRuns(prev => prev + 1);
      return;
    }

    // Reset consecutive empty runs when there's work to do
    setConsecutiveEmptyRuns(0);

    // Smart queuing: Sort by priority (highest first), then by timestamp (oldest first)
    const sortedQueue = queue
      .map(item => ({ ...item, priority: getItemPriority(item) }))
      .sort((a, b) => {
        // Higher priority first
        if (a.priority !== b.priority) return b.priority - a.priority;
        // Then older items first
        return a.timestamp - b.timestamp;
      });

    // Batch processing: Group items by table and operation for efficiency
    const batches: { [key: string]: SyncQueueItem[] } = {};
    let hasItemsToSync = false;

    for (const item of sortedQueue.slice(0, BATCH_SIZE)) {
      // Check if item has exceeded max retry attempts
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        console.warn(`[SyncQueue] Item ${item.id} has exceeded max retry attempts (${MAX_RETRY_ATTEMPTS}), removing from queue`);
        if (typeof item.id === 'number') {
          await store.remove(item.id);
        }
        debouncedSetQueueLength(prev => prev - 1);
        continue;
      }

      // Check if item should wait due to exponential backoff
      const baseDelay = 1000; // 1 second base delay
      const backoffDelay = baseDelay * Math.pow(2, item.attempts); // Exponential backoff
      const timeSinceLastAttempt = Date.now() - item.timestamp;

      if (timeSinceLastAttempt < backoffDelay) {
        // Not enough time has passed, skip this item for now
        console.log(`[SyncQueue] Item ${item.id} waiting for backoff delay (${backoffDelay}ms), skipping`);
        continue;
      }

      // Check if this item should be synced to Supabase
      const shouldSync = shouldSyncToSupabase(item);
      if (!shouldSync) {
        // Remove from queue without syncing
        if (typeof item.id === 'number') {
          await store.remove(item.id);
        }
        debouncedSetQueueLength(prev => prev - 1);
        continue;
      }

      // Special handling for set_logs: ensure the workout session exists first
      if (item.table === 'set_logs' && item.operation !== 'delete') {
        try {
          const sessionId = item.payload.session_id;
          const { data: sessionData, error: sessionError } = await supabase
            .from('workout_sessions')
            .select('id')
            .eq('id', sessionId)
            .maybeSingle();

          if (sessionError) {
            console.log(`[SyncQueue] Skipping set_logs sync - session check failed:`, sessionError);
            continue; // Skip this item, will retry later
          }

          if (!sessionData) {
            console.log(`[SyncQueue] Skipping set_logs sync - workout session ${sessionId} not found in Supabase yet`);
            // Increment retry count for set_logs waiting for their session
            if (typeof item.id === 'number') {
              await store.incrementAttempts(item.id, `Waiting for workout session ${sessionId} to sync first`);
            }
            continue;
          }

          console.log(`[SyncQueue] Workout session ${sessionId} found, proceeding with set_logs sync`);
        } catch (checkError) {
          console.log(`[SyncQueue] Error checking workout session existence:`, checkError);
          continue; // Skip on error, will retry later
        }
      }

      // Group items for batch processing
      const batchKey = `${item.table}-${item.operation}`;
      if (!batches[batchKey]) {
        batches[batchKey] = [];
      }
      batches[batchKey].push(item);
      hasItemsToSync = true;
    }

    if (!hasItemsToSync) {
      return;
    }

    // Process batches
    isSyncingRef.current = true;
    setIsSyncing(true);

    console.log(`[SyncQueue] Processing ${Object.keys(batches).length} batches:`, Object.keys(batches));

    try {
      for (const [batchKey, items] of Object.entries(batches)) {
        console.log(`[SyncQueue] Processing batch ${batchKey} with ${items.length} items`);
        if (items.length === 0) continue;

        const [table, operation] = batchKey.split('-') as [string, 'create' | 'update' | 'delete'];

        try {
          if (operation === 'create' || operation === 'update') {
            // Batch upsert
            const payloads = items.map(item => sanitizePayloadForSupabase(table, item.payload));
            console.log(`[SyncQueue] Attempting batch upsert for ${table}:`, {
              operation,
              itemCount: items.length,
              ids: payloads.map(p => p.id),
              samplePayload: payloads[0]
            });

            const { error } = await supabase.from(table).upsert(payloads as any);
            if (error) {
              console.error(`[SyncQueue] Batch upsert failed for ${table}:`, error);
              throw error;
            }

            console.log(`[SyncQueue] Batch upsert succeeded for ${table}, verifying...`);

            // Verify batch operation succeeded
            const ids = payloads.map(p => p.id);
            const { data: verifyData, error: verifyError } = await supabase
              .from(table)
              .select('id')
              .in('id', ids);

            if (verifyError) {
              console.error(`[SyncQueue] Verification query failed for ${table}:`, verifyError);
              throw new Error(`Batch sync verification failed: ${verifyError.message}`);
            }

            console.log(`[SyncQueue] Verification query succeeded:`, {
              expected: ids.length,
              found: verifyData?.length || 0,
              verifyData
            });

            if (!verifyData || verifyData.length !== ids.length) {
              console.error(`[SyncQueue] Verification count mismatch for ${table}:`, {
                expected: ids.length,
                found: verifyData?.length || 0,
                ids,
                verifyData
              });
              throw new Error(`Batch sync verification failed: Expected ${ids.length} records, got ${verifyData?.length || 0}`);
            }

            console.log(`[SyncQueue] Verification successful for ${table}`);

          } else if (operation === 'delete') {
            // Batch delete
            const ids = items.map(item => sanitizePayloadForSupabase(table, item.payload).id);
            console.log(`[SyncQueue] Attempting batch delete for ${table}:`, {
              operation,
              itemCount: items.length,
              ids
            });

            const { error } = await supabase.from(table).delete().in('id', ids);
            if (error && error.code !== 'PGRST204') {
              console.error(`[SyncQueue] Batch delete failed for ${table}:`, error);
              throw error;
            }

            console.log(`[SyncQueue] Batch delete succeeded for ${table}, verifying...`);

            // Verify batch delete succeeded
            const { data: verifyData, error: verifyError } = await supabase
              .from(table)
              .select('id')
              .in('id', ids);

            if (verifyError) {
              console.error(`[SyncQueue] Delete verification query failed for ${table}:`, verifyError);
              throw new Error(`Batch delete verification failed: ${verifyError.message}`);
            }

            console.log(`[SyncQueue] Delete verification query succeeded:`, {
              expectedDeleted: ids.length,
              stillExist: verifyData?.length || 0,
              verifyData
            });

            if (verifyData && verifyData.length > 0) {
              console.error(`[SyncQueue] Delete verification failed - records still exist:`, {
                ids,
                stillExist: verifyData
              });
              throw new Error(`Batch delete verification failed: ${verifyData.length} records still exist`);
            }

            console.log(`[SyncQueue] Delete verification successful for ${table}`);
          }

          // Remove successfully synced items from queue
          for (const item of items) {
            if (typeof item.id === 'number') {
              await store.remove(item.id);
            }
            debouncedSetQueueLength(prev => prev - 1);
            onSuccess?.(item);
          }

        } catch (batchError) {
          const error = batchError instanceof Error ? batchError : new Error(String(batchError));

          // Increment attempts for all items in failed batch
          for (const item of items) {
            if (typeof item.id === 'number') {
              await store.incrementAttempts(item.id, error.message);
            }
            onError?.(item, error);
          }
        }
      }

      setLastError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLastError(error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled, isOnline, supabase, store, onError, onSuccess, debouncedSetQueueLength]);

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      // Adaptive sync interval: use idle interval after consecutive empty runs
      const currentInterval = consecutiveEmptyRuns >= MAX_CONSECUTIVE_EMPTY_RUNS
        ? IDLE_INTERVAL
        : DEFAULT_INTERVAL;

      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        if (!enabled || !isOnline || isSyncingRef.current || !supabase) {
          scheduleNext();
          return;
        }
        
        try {
          await processNext();
        } finally {
          // Schedule next check
          scheduleNext();
        }
      }, currentInterval);
    };

    // Also schedule regular checks
    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled, consecutiveEmptyRuns, processNext, isOnline, supabase]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (queueLengthTimeoutRef.current) {
        clearTimeout(queueLengthTimeoutRef.current);
      }
      if (isSyncingTimeoutRef.current) {
        clearTimeout(isSyncingTimeoutRef.current);
      }
    };
  }, []);

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
