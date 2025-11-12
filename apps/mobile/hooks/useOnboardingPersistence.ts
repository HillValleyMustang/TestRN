/**
 * useOnboardingPersistence Hook
 * Manages onboarding data persistence with automatic saving and recovery
 * Provides real-time progress tracking and data validation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  saveOnboardingData,
  getOnboardingData,
  clearOnboardingData,
  hasOnboardingData,
  getOnboardingProgress,
  getOnboardingTimeSpent,
  isOnboardingDataStale,
  validateOnboardingData,
  OnboardingData,
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingStep3Data,
  OnboardingStep4Data,
  OnboardingStep5Data,
} from '../lib/onboardingStorage';

interface UseOnboardingPersistenceReturn {
  // Data state
  onboardingData: OnboardingData | null;
  isLoading: boolean;
  error: string | null;

  // Progress tracking
  progress: number;
  timeSpent: number;
  isDataStale: boolean;

  // Data validation
  validation: { isValid: boolean; errors: string[] };

  // Actions
  saveStepData: (step: number, data: any) => Promise<void>;
  loadOnboardingData: () => Promise<void>;
  clearData: () => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // Utilities
  updateCurrentStep: (step: number) => Promise<void>;
  markStepComplete: (step: number) => Promise<void>;
  setIsCompleting: (completing: boolean) => void;
}

export const useOnboardingPersistence = (): UseOnboardingPersistenceReturn => {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Computed values
  const progress = onboardingData ? getOnboardingProgress(onboardingData) : 0;
  const timeSpent = onboardingData ? getOnboardingTimeSpent(onboardingData) : 0;
  const isDataStale = onboardingData ? isOnboardingDataStale(onboardingData) : false;
  const validation = onboardingData ? validateOnboardingData(onboardingData) : { isValid: false, errors: [] };

  // Load onboarding data on mount
  useEffect(() => {
    loadOnboardingData();
  }, []);

  // Clear onboarding data when user changes (different user signs in)
  // Only do this if we're not in the middle of onboarding completion
  useEffect(() => {
    // This effect will run when the component mounts or when dependencies change
    // We want to clear onboarding data for new users, but not during completion
    const clearForNewUser = async () => {
      try {
        const hasData = await hasOnboardingData();
        if (hasData && !onboardingData) {
          if (!isCompleting) {
            // For non-completing scenarios, check if data is recent
            const data = await getOnboardingData();
            const timeSinceLastUpdate = Date.now() - data.lastUpdated;
            const isRecentlyActive = timeSinceLastUpdate < 30000; // 30 seconds

            if (!isRecentlyActive) {
              // Clear data that's not recently active
              console.log('[useOnboardingPersistence] Clearing old onboarding data for new user');
              await clearOnboardingData();
              setOnboardingData(null);
            } else {
              console.log('[useOnboardingPersistence] Skipping clear - onboarding recently active');
            }
          } else {
            // If user is completing onboarding but has old data, clear it
            console.log('[useOnboardingPersistence] Clearing existing data - user is completing onboarding');
            await clearOnboardingData();
            setOnboardingData(null);
          }
        }
      } catch (error) {
        console.error('[useOnboardingPersistence] Error clearing data for new user:', error);
      }
    };

    // Always run this when no onboarding data is loaded to ensure clean slate for new users
    if (!onboardingData) {
      clearForNewUser();
    }
  }, [onboardingData, isCompleting]); // Depend on both to prevent clearing during completion

  const loadOnboardingData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const hasData = await hasOnboardingData();
      if (!hasData) {
        setOnboardingData(null);
        return;
      }

      const data = await getOnboardingData();

      // Check if data is stale
      if (isOnboardingDataStale(data)) {
        console.warn('[useOnboardingPersistence] Onboarding data is stale, clearing...');
        await clearOnboardingData();
        setOnboardingData(null);
        return;
      }

      setOnboardingData(data);
    } catch (err) {
      console.error('[useOnboardingPersistence] Error loading data:', err);
      setError('Failed to load onboarding progress');
      setOnboardingData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveStepData = useCallback(async (step: number, data: any) => {
    try {
      setError(null);

      const currentData = onboardingData || {
        step1: {} as OnboardingStep1Data,
        step2: {} as OnboardingStep2Data,
        step3: {} as OnboardingStep3Data,
        step4: {} as OnboardingStep4Data,
        step5: {} as OnboardingStep5Data,
        currentStep: 1,
        startTime: Date.now(),
        lastUpdated: Date.now(),
      };

      const stepKey = `step${step}` as keyof OnboardingData;
      const currentStepData = currentData[stepKey];
      const updatedData = {
        ...currentData,
        [stepKey]: { ...(currentStepData as object), ...data },
        currentStep: Math.max(currentData.currentStep, step),
      };

      await saveOnboardingData(updatedData);
      // Always update state to ensure UI reflects the latest data
      setOnboardingData(updatedData);
    } catch (err) {
      console.error('[useOnboardingPersistence] Error saving step data:', err);
      setError('Failed to save progress');
      throw err;
    }
  }, [onboardingData]);

  const updateCurrentStep = useCallback(async (step: number) => {
    try {
      if (!onboardingData) return;

      const updatedData = {
        ...onboardingData,
        currentStep: step,
      };

      await saveOnboardingData(updatedData);
      setOnboardingData(updatedData);
    } catch (err) {
      console.error('[useOnboardingPersistence] Error updating current step:', err);
      setError('Failed to update step');
    }
  }, [onboardingData]);

  const markStepComplete = useCallback(async (step: number) => {
    try {
      if (!onboardingData) return;

      const updatedData = {
        ...onboardingData,
        currentStep: Math.max(onboardingData.currentStep, step + 1),
      };

      await saveOnboardingData(updatedData);
      setOnboardingData(updatedData);
    } catch (err) {
      console.error('[useOnboardingPersistence] Error marking step complete:', err);
      setError('Failed to complete step');
    }
  }, [onboardingData]);

  const clearData = useCallback(async () => {
    try {
      setError(null);
      await clearOnboardingData();
      setOnboardingData(null);
    } catch (err) {
      console.error('[useOnboardingPersistence] Error clearing data:', err);
      setError('Failed to clear data');
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      setError(null);
      await clearOnboardingData();
      setOnboardingData(null);
      // Optionally reload to get fresh default data
      await loadOnboardingData();
    } catch (err) {
      console.error('[useOnboardingPersistence] Error resetting onboarding:', err);
      setError('Failed to reset onboarding');
    }
  }, [loadOnboardingData]);

  return {
    // Data state
    onboardingData,
    isLoading,
    error,

    // Progress tracking
    progress,
    timeSpent,
    isDataStale,

    // Data validation
    validation,

    // Actions
    saveStepData,
    loadOnboardingData,
    clearData,
    resetOnboarding,

    // Utilities
    updateCurrentStep,
    markStepComplete,
    setIsCompleting,
  };
};