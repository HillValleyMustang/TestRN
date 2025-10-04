import { useMobileSyncManager } from '@app/hooks/useSyncManager';

export const SyncManagerInitializer = () => {
  useMobileSyncManager();
  return null;
};
