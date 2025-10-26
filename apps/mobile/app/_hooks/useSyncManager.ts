import {
  addEventListener as addNetInfoListener,
  fetch as fetchNetInfo,
} from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { useSyncQueueProcessor } from '@data/hooks/use-sync-queue-processor';

import { useAuth } from '../_contexts/auth-context';
import { database } from '../_lib/database';

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
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    });

    const appStateListener = (state: AppStateStatus) => {
      if (state === 'active') {
        fetchNetInfo().then(info => {
          setIsOnline(Boolean(info.isConnected && info.isInternetReachable));
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
