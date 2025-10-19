import { useMobileSyncManager } from "../_hooks/useSyncManager";

export const SyncManagerInitializer = () => {
  useMobileSyncManager();
  return null;
};

export default SyncManagerInitializer;
