"use client";

import { useEffect, useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { toast } from 'sonner';

export const useSyncManager = () => {
  const { supabase } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe to sync queue changes
  const syncQueue = useLiveQuery(() => db.sync_queue.orderBy('timestamp').toArray(), []);

  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (!isOnline || isSyncing || !syncQueue || syncQueue.length === 0 || !supabase) {
      return;
    }

    setIsSyncing(true);
    toast.info("Syncing workout data...");

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
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncQueue, supabase]);

  useEffect(() => {
    // Trigger processing whenever the queue changes or network status comes back online
    const syncInterval = setInterval(() => {
      processQueue();
    }, 5000); // Attempt to sync every 5 seconds if there's something in the queue

    return () => clearInterval(syncInterval);
  }, [syncQueue, isOnline, processQueue]);
};