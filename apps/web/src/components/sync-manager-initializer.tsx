"use client";

import { useSyncManager } from '@/hooks/use-sync-manager';

export const SyncManagerInitializer = () => {
  useSyncManager();
  return null; // This component doesn't render anything
};