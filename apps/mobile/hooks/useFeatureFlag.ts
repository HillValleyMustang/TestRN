/**
 * useFeatureFlag Hook
 * Hook to check if a feature flag is enabled
 */

import { useMemo } from 'react';
import { FEATURE_FLAGS, type FeatureFlags } from '../constants/feature-flags';

type FeatureFlagKey = keyof FeatureFlags;

/**
 * Hook to check if a specific feature flag is enabled
 * @param flag - The feature flag to check
 * @returns boolean indicating if the flag is enabled
 */
export const useFeatureFlag = (flag: FeatureFlagKey): boolean => {
  return useMemo(() => {
    return FEATURE_FLAGS[flag];
  }, [flag]);
};

/**
 * Hook to check if reactive hooks are enabled for the dashboard
 * Convenience hook that checks the master flag
 */
export const useReactiveHooksEnabled = (): boolean => {
  return useFeatureFlag('USE_REACTIVE_HOOKS');
};

/**
 * Hook to check if comparison logging is enabled
 * Used for debugging during migration
 */
export const useComparisonLogging = (): boolean => {
  return useFeatureFlag('ENABLE_COMPARISON_LOGGING');
};

export default useFeatureFlag;
