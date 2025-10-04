"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useSession } from '@/components/session-context-provider';
import { useSyncQueueProcessor } from '@shared/data/hooks/use-sync-queue-processor';
import { webSyncQueueStore } from '@/lib/sync-queue-store';

export const useSyncManager = () => {
  const { supabase } = useSession();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  const { isSyncing, queueLength, lastError } = useSyncQueueProcessor({
    supabase,
    store: webSyncQueueStore,
    isOnline,
    enabled: true,
    intervalMs: 5000,
    onError: (_, error) => {
      toast.error(`Background sync failed: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!lastError) return;
    console.error('[useSyncManager] sync error', lastError);
  }, [lastError]);

  return {
    isOnline,
    isSyncing,
    queueLength,
    lastError,
  } as const;
};
