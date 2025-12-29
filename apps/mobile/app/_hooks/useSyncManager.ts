import {
  addEventListener as addNetInfoListener,
  fetch as fetchNetInfo,
} from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';

import { useAuth } from '../_contexts/auth-context';
import { database } from '../_lib/database';

// Cleanup incomplete sessions every 2 hours (matching max workout duration)
const CLEANUP_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

export const useMobileSyncManager = () => {
  const { supabase } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    database
      .init()
      .then(() => {
        if (isMounted) {
          setIsDatabaseReady(true);
        }
      })
      .catch(error => {
        console.error(
          '[useMobileSyncManager] Failed to initialise database',
          error
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const networkUnsubscribe = addNetInfoListener(state => {
      const wasOnline = isOnline;
      const nowOnline = Boolean(state.isConnected && state.isInternetReachable);
      setIsOnline(nowOnline);

      // Trigger immediate sync when coming back online
      if (!wasOnline && nowOnline && processor.processNext) {
        processor.processNext();
      }
    });

    const appStateListener = (state: AppStateStatus) => {
      if (state === 'active') {
        fetchNetInfo().then(info => {
          const wasOnline = isOnline;
          const nowOnline = Boolean(info.isConnected && info.isInternetReachable);
          setIsOnline(nowOnline);

          // Trigger immediate sync when app comes to foreground and is online
          if (nowOnline && processor.processNext) {
            processor.processNext();
          }
        });
      }
    };

    const appSubscription = AppState.addEventListener(
      'change',
      appStateListener
    );

    return () => {
      networkUnsubscribe();
      appSubscription.remove();
    };
  }, []);

  const processor = useSyncQueueProcessor({
    supabase,
    store: database.syncQueue,
    isOnline,
    enabled: isDatabaseReady && Boolean(supabase),
    intervalMs: 5000,
    onError: (_, error) => {
      console.error('[useMobileSyncManager] Sync error', error);
    },
  });

  // Periodic cleanup of incomplete sessions
  useEffect(() => {
    if (!isDatabaseReady) return;

    const runCleanup = async () => {
      try {
        // Only run cleanup if not currently syncing to avoid database conflicts
        if (processor.isSyncing) {
          return;
        }

        const cleanedCount = await database.cleanupIncompleteSessions(2); // Clean sessions older than 2 hours
      } catch (error) {
        console.error('[useMobileSyncManager] Failed to cleanup incomplete sessions:', error);
        // Don't throw - cleanup failures shouldn't break the app
      }
    };

    // Run cleanup after a delay on startup, then every 2 hours
    const startupTimer = setTimeout(runCleanup, 30000); // 30 seconds after startup
    const cleanupInterval = setInterval(runCleanup, CLEANUP_INTERVAL);

    return () => {
      clearTimeout(startupTimer);
      clearInterval(cleanupInterval);
    };
  }, [isDatabaseReady, processor.isSyncing]);

  return useMemo(
    () => ({
      isOnline,
      isDatabaseReady,
      ...(isDatabaseReady ? processor : { isSyncing: false, queueLength: 0, lastError: null }),
    }),
    [isOnline, isDatabaseReady, processor]
  );
};

export default useMobileSyncManager;
