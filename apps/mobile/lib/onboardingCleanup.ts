/**
 * Onboarding Cleanup Utilities
 * Handles proper cleanup of temporary data, caches, and states after onboarding completion
 * Ensures clean slate for post-onboarding app usage
 * Now includes gym cleanup for incomplete onboarding
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupUserGyms } from './gym-management';

// Cleanup configuration
const CLEANUP_CONFIG = {
  // AsyncStorage keys to remove
  storageKeys: [
    'onboarding_step1_data',
    'onboarding_step2_data',
    'onboarding_step3_data',
    'onboarding_step4_data',
    'onboarding_current_step',
    'onboarding_progress',
    'onboarding_timestamp',
  ] as const,
};

export interface CleanupResult {
  success: boolean;
  errors: string[];
  cleanedItems: {
    storageKeys: number;
    cacheFiles: number;
    tempFiles: number;
    gyms: number;
  };
}

/**
 * Comprehensive cleanup after onboarding completion
 */
export const cleanupOnboardingData = async (): Promise<CleanupResult> => {
  const result: CleanupResult = {
    success: true,
    errors: [],
    cleanedItems: {
      storageKeys: 0,
      cacheFiles: 0,
      tempFiles: 0,
      gyms: 0,
    },
  };

  try {
    // 1. Clean AsyncStorage
    await cleanupAsyncStorage(result);

    // 2. Clean gyms (if needed for incomplete onboarding)
    await cleanupGyms(result);

    // 3. Clean cache directories
    await cleanupCacheDirectories(result);

    // 4. Clean temporary files
    await cleanupTempFiles(result);

    // 5. Clear any cached images from onboarding
    await cleanupImageCache(result);

    console.log('[OnboardingCleanup] Cleanup completed:', result);
    return result;

  } catch (error) {
    console.error('[OnboardingCleanup] Cleanup failed:', error);
    result.success = false;
    result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Clean AsyncStorage keys
 */
const cleanupAsyncStorage = async (result: CleanupResult): Promise<void> => {
  try {
    const keysToRemove: string[] = [];

    for (const key of CLEANUP_CONFIG.storageKeys) {
      try {
        const exists = await AsyncStorage.getItem(key);
        if (exists !== null) {
          keysToRemove.push(key);
        }
      } catch (error) {
        console.warn(`[OnboardingCleanup] Error checking key ${key}:`, error);
      }
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      result.cleanedItems.storageKeys = keysToRemove.length;
      console.log(`[OnboardingCleanup] Removed ${keysToRemove.length} storage keys:`, keysToRemove);
    }
  } catch (error) {
    result.errors.push(`AsyncStorage cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Clean cache directories (simplified - focus on AsyncStorage)
 */
const cleanupCacheDirectories = async (result: CleanupResult): Promise<void> => {
  // Note: File system operations are complex in React Native
  // For now, we'll focus on AsyncStorage cleanup which is most important
  // File system cleanup can be added later if needed
  console.log('[OnboardingCleanup] Cache directory cleanup skipped - AsyncStorage cleanup is primary focus');
};

/**
 * Clean temporary files (simplified)
 */
const cleanupTempFiles = async (result: CleanupResult): Promise<void> => {
  // Simplified approach - focus on AsyncStorage cleanup
  // File cleanup can be implemented later if needed
  console.log('[OnboardingCleanup] Temp file cleanup skipped - AsyncStorage cleanup is primary focus');
};

/**
 * Clean gyms (for incomplete onboarding scenarios)
 */
const cleanupGyms = async (result: CleanupResult): Promise<void> => {
  // For now, we'll implement basic gym cleanup logic
  // This would typically be called with user context when needed
  console.log('[OnboardingCleanup] Gym cleanup functionality ready - call with user context when needed');
  // Gym cleanup is handled separately with user context
};

/**
 * Clean cached images from onboarding (simplified)
 */
const cleanupImageCache = async (result: CleanupResult): Promise<void> => {
  // Note: Image cache cleanup is complex in React Native
  // For now, we focus on AsyncStorage cleanup
  console.log('[OnboardingCleanup] Image cache cleanup skipped - AsyncStorage cleanup is primary focus');
};

/**
 * Emergency cleanup - removes all onboarding data aggressively
 * Use only when normal cleanup fails
 */
export const emergencyCleanup = async (): Promise<CleanupResult> => {
  console.warn('[OnboardingCleanup] Performing emergency cleanup');

  const result: CleanupResult = {
    success: false, // Start as false, set to true if we complete
    errors: [],
    cleanedItems: {
      storageKeys: 0,
      cacheFiles: 0,
      tempFiles: 0,
      gyms: 0,
    },
  };

  try {
    // Try to remove all known keys
    const allPossibleKeys = [
      ...CLEANUP_CONFIG.storageKeys,
      'onboarding_backup_data',
      'onboarding_error_state',
      'onboarding_last_attempt',
    ];

    await AsyncStorage.multiRemove(allPossibleKeys);
    result.cleanedItems.storageKeys = allPossibleKeys.length;

    result.success = true;
    console.log('[OnboardingCleanup] Emergency cleanup completed');
    return result;

  } catch (error) {
    console.error('[OnboardingCleanup] Emergency cleanup failed:', error);
    result.errors.push(`Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
};

/**
 * Validate cleanup was successful
 */
export const validateCleanup = async (): Promise<boolean> => {
  try {
    // Check if any onboarding keys still exist
    for (const key of CLEANUP_CONFIG.storageKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        console.warn(`[OnboardingCleanup] Key still exists after cleanup: ${key}`);
        return false;
      }
    }

    console.log('[OnboardingCleanup] Cleanup validation passed');
    return true;

  } catch (error) {
    console.error('[OnboardingCleanup] Cleanup validation failed:', error);
    return false;
  }
};

/**
 * Clean up all gyms for a user (for incomplete onboarding scenarios)
 * This is the main function to call when you need to remove all user gyms
 */
export const cleanupUserGymsForOnboarding = async (
  userId: string,
  getGymsFn: (userId: string) => Promise<any[]>,
  deleteGymFn: (gymId: string) => Promise<void>
): Promise<{ success: boolean; removedCount: number; errors: string[] }> => {
  console.log('[OnboardingCleanup] Starting gym cleanup for user:', userId);
  
  const result = {
    success: true,
    removedCount: 0,
    errors: [] as string[]
  };

  try {
    const gyms = await getGymsFn(userId);
    
    if (gyms.length === 0) {
      console.log('[OnboardingCleanup] No gyms found for user:', userId);
      return result;
    }

    console.log('[OnboardingCleanup] Found', gyms.length, 'gyms to clean up');

    // Remove all gyms
    for (const gym of gyms) {
      try {
        await deleteGymFn(gym.id);
        result.removedCount++;
        console.log('[OnboardingCleanup] Removed gym:', gym.name);
      } catch (error) {
        const errorMsg = `Failed to remove gym ${gym.name}: ${error}`;
        console.error('[OnboardingCleanup]', errorMsg);
        result.errors.push(errorMsg);
        result.success = false;
      }
    }

    if (result.errors.length === 0) {
      console.log('[OnboardingCleanup] Successfully cleaned up all gyms for user:', userId);
    } else {
      console.warn('[OnboardingCleanup] Some gyms failed to clean up:', result.errors);
    }

  } catch (error) {
    const errorMsg = `Failed to load gyms for cleanup: ${error}`;
    console.error('[OnboardingCleanup]', errorMsg);
    result.errors.push(errorMsg);
    result.success = false;
  }

  return result;
};