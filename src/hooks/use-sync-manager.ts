"use client";

import * as React from 'react'; // Use React for useState, useEffect, useCallback, useRef
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';

export const useSyncManager = () => {
  const { supabase } = useSession();
  const [isOnline, setIsOnline] = React.useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const syncToastId = React.useRef<string | number | null>(null); // Ref to store the toast ID

  // Subscribe to sync queue changes
  const syncQueue = useLiveQuery(() => db.sync_queue.orderBy('timestamp').toArray(), []);

  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  React.useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = React.useCallback(async () => {
    if (!isOnline || isSyncing || !syncQueue || !supabase) {
      // If queue is empty and a sync toast is active, dismiss it as successful
      if (syncToastId.current && syncQueue && syncQueue.length === 0) {
        toast.success("All data synced successfully!", { id: syncToastId.current });
        setTimeout(() => toast.dismiss(syncToastId.current!), 3000);
        syncToastId.current = null;
      }
      return;
    }

    // If there are items in the queue, but we are not currently syncing, start syncing
    // and ensure the loading toast is visible.
    if (syncQueue.length > 0 && !isSyncing) {
      setIsSyncing(true);

      // Create or update the loading toast
      if (!syncToastId.current) {
        syncToastId.current = toast.loading("Syncing workout data in background...");
      } else {
        // Update existing toast to ensure it's still a loading state
        toast.loading("Syncing workout data in background...", { id: syncToastId.current });
      }

      const item = syncQueue[0]; // Process one item at a time

      try {
        const { table, payload, operation } = item;
        
        if (operation === 'create' || operation === 'update') {
          const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
          if (error) throw error;
        } else if (operation === 'delete') {
          const { error } = await supabase.from(table).delete().eq('id', payload.id);
          // Ignore "not found" errors for deletes, as it might have been deleted already or never created
          if (error && error.code !== 'PGRST204') {
              throw error;
          }
        }

        // If successful, remove from queue
        await db.sync_queue.delete(item.id!);
        console.log(`Synced and removed item ${item.id} from queue.`);

      } catch (error: any) {
        console.error(`Failed to sync item ${item.id}:`, error);
        // Increment attempt count and update error message
        await db.sync_queue.update(item.id!, {
          attempts: item.attempts + 1,
          error: error.message,
        });
        // If an error occurs, update the toast to error and dismiss
        if (syncToastId.current) {
          toast.error("Sync failed for some items. Check console for details.", { id: syncToastId.current });
          setTimeout(() => toast.dismiss(syncToastId.current!), 5000);
          syncToastId.current = null;
        }
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline, isSyncing, syncQueue, supabase]);

  React.useEffect(() => {
    // Trigger processing whenever the queue changes or network status comes back online
    const syncInterval = setInterval(() => {
      processQueue();
    }, 5000); // Attempt to sync every 5 seconds if there's something in the queue

    return () => clearInterval(syncInterval);
  }, [syncQueue, isOnline, processQueue]);
};