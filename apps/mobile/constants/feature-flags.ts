/**
 * Feature Flags for Reactive Hooks Migration
 * 
 * These flags control the gradual migration from the old data fetching pattern
 * (loadDashboardSnapshot) to the new reactive hooks pattern.
 */

export interface FeatureFlags {
  /** Master flag - enables all reactive hooks when true */
  USE_REACTIVE_HOOKS: boolean;
  
  /** Enable comparison logging in dev mode */
  ENABLE_COMPARISON_LOGGING: boolean;
  
  /** Enable AI workout generation for ad-hoc workouts */
  ENABLE_ADHOC_AI_GENERATION: boolean;
}

/**
 * Default feature flags configuration
 */
export const FEATURE_FLAGS: FeatureFlags = {
  // Master flag - when enabled, all components use reactive hooks
  USE_REACTIVE_HOOKS: true,
  
  // Debug flags
  ENABLE_COMPARISON_LOGGING: __DEV__, // Only in development
  
  // AI generation for ad-hoc workouts - disabled by default for assessment
  ENABLE_ADHOC_AI_GENERATION: false,
};

/**
 * Check if a specific feature flag is enabled
 */
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return FEATURE_FLAGS[flag];
};

/**
 * Enable all reactive hooks (for testing/development)
 */
export const enableAllReactiveHooks = (): void => {
  FEATURE_FLAGS.USE_REACTIVE_HOOKS = true;
};

/**
 * Disable all reactive hooks (for rollback)
 */
export const disableAllReactiveHooks = (): void => {
  FEATURE_FLAGS.USE_REACTIVE_HOOKS = false;
};
