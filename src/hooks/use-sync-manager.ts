"use client";

import * as React from 'react'; // Use React for useState, useEffect, useCallback, useRef
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';
import { SyncQueueItem } from '@/lib/db'; // Import SyncQueueItem type

export const useSyncManager = () => {
  const { supabase } = useSession();
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Fetch syncQueue from IndexedDB using useLiveQuery, ordered by timestamp
  const syncQueue = useLiveQuery(async () => {
    return db.sync_queue.orderBy('timestamp').toArray();
  }, []); // Empty dependency array means it runs once and then on any changes to sync_queue table

  const handleOnline = () => {
    setIsOnline(true);
    console.log("[SyncManager] Browser is now ONLINE.");
  };
  const handleOffline = () => {
    setIsOnline(false);
    console.log("[SyncManager] Browser is now OFFLINE.");
  };

  React.useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = React.useCallback(async () => {
    // Ensure syncQueue is loaded and not undefined before proceeding
    if (!isOnline || isSyncing || !syncQueue || syncQueue.length === 0 || !supabase) {
      if (!isOnline) console.log("[SyncManager] Not syncing: Offline.");
      if (isSyncing) console.log("[SyncManager] Not syncing: Already syncing.");
      if (!syncQueue || syncQueue.length === 0) console.log("[SyncManager] Not syncing: Sync queue is empty or not loaded.");
      if (!supabase) console.log("[SyncManager] Not syncing: Supabase client not available.");
      return;
    }

    setIsSyncing(true);
    console.log(`[SyncManager] Starting queue processing. Queue size: ${syncQueue.length}`);

    const item = syncQueue[0]; // Process one item at a time
    console.log(`[SyncManager] Processing item ID: ${item.id}, Operation: ${item.operation}, Table: ${item.table}`);

    try {
      const { table, payload, operation } = item;
      
      if (operation === 'create' || operation === 'update') {
        console.log(`[SyncManager] Attempting upsert to table '${table}' with payload:`, payload);
        const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
        if (error) throw error;
        console.log(`[SyncManager] Successfully upserted item ID: ${item.id} to table '${table}'.`);
      } else if (operation === 'delete') {
        console.log(`[SyncManager] Attempting delete from table '${table}' for ID: ${payload.id}`);
        const { error } = await supabase.from(table).delete().eq('id', payload.id);
        // Ignore "not found" errors for deletes, as it might have been deleted already or never created
        if (error && error.code !== 'PGRST204') {
            throw error;
        }
        console.log(`[SyncManager] Successfully deleted item ID: ${item.id} from table '${table}'.`);
      }

      // If successful, remove from queue
      await db.sync_queue.delete(item.id!);
      console.log(`[SyncManager] Removed item ${item.id} from queue.`);

    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error) || "An unknown error occurred during sync.";
      console.error(`[SyncManager] FAILED to sync item ${item.id}:`, errorMessage); // Use errorMessage here
      // Increment attempt count and update error message
      await db.sync_queue.update(item.id!, {
        attempts: item.attempts + 1,
        error: errorMessage, // Use the more robust error message
      });
      // Show an error toast if sync fails
      toast.error("Background sync failed for some items. Check console for details.");
    } finally {
      setIsSyncing(false);
      console.log("[SyncManager] Finished queue processing for current item.");
    }
  }, [isOnline, isSyncing, syncQueue, supabase]); // Added syncQueue to dependencies

  React.useEffect(() => {
    // Trigger processing whenever the queue changes or network status comes back online
    const syncInterval = setInterval(() => {
      processQueue();
    }, 5000); // Attempt to sync every 5 seconds if there's something in the queue

    return () => clearInterval(syncInterval);
  }, [syncQueue, isOnline, processQueue]); // Added syncQueue to dependencies
};