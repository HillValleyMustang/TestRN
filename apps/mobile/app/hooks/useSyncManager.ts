import { addEventListener as addNetInfoListener, fetch as fetchNetInfo } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { useSupabaseAuth } from '@shared/features/auth';
import { useSyncQueueProcessor } from '@shared/data/hooks/use-sync-queue-processor';
import { mobileSyncQueueStore } from '@app/lib/sync-queue-store';

export const useMobileSyncManager = () => {
  const { supabase } = useSupabaseAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const networkUnsubscribe = addNetInfoListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable));
    });

    const appStateListener = (state: AppStateStatus) => {
      if (state === 'active') {
        fetchNetInfo().then((info) => {
          setIsOnline(Boolean(info.isConnected && info.isInternetReachable));
        });
      }
    };

    const appSubscription = AppState.addEventListener('change', appStateListener);

    return () => {
      networkUnsubscribe();
      appSubscription.remove();
    };
  }, []);

  const processor = useSyncQueueProcessor({
    supabase,
    store: mobileSyncQueueStore,
    isOnline,
    enabled: true,
    intervalMs: 5000,
    onError: (_, error) => {
      console.error('[useMobileSyncManager] Sync error', error);
    },
  });

  return useMemo(
    () => ({
      isOnline,
      ...processor,
    }),
    [isOnline, processor],
  );
};
