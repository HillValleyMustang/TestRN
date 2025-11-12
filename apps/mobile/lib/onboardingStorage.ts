/**
 * Onboarding Storage Utilities
 * Handles persistence of onboarding progress using AsyncStorage
 * Provides type-safe storage and retrieval of onboarding data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const ONBOARDING_DATA_KEY = '@onboarding_data';
const ONBOARDING_STEP_KEY = '@onboarding_step';
const ONBOARDING_START_TIME_KEY = '@onboarding_start_time';

// Types for onboarding data persistence
export interface OnboardingStep1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
  unitSystem: 'metric' | 'imperial';
}

export interface OnboardingStep2Data {
  tPathType: 'ppl' | 'ulul' | null;
  experience: 'beginner' | 'intermediate' | null;
}

export interface OnboardingStep3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
}

export interface OnboardingStep4Data {
  gymName: string;
  equipmentMethod: 'photo' | 'skip' | null;
  consentGiven: boolean;
}

export interface OnboardingStep5Data {
  identifiedExercises: any[];
  confirmedExerciseNames: Set<string>;
}

export interface OnboardingData {
  step1: OnboardingStep1Data;
  step2: OnboardingStep2Data;
  step3: OnboardingStep3Data;
  step4: OnboardingStep4Data;
  step5: OnboardingStep5Data;
  currentStep: number;
  startTime: number;
  lastUpdated: number;
}

// Default values for onboarding data
export const getDefaultOnboardingData = (): OnboardingData => ({
  step1: {
    fullName: '',
    heightCm: null,
    heightFt: null,
    heightIn: null,
    weight: null,
    bodyFatPct: null,
    heightUnit: 'ft',
    weightUnit: 'kg',
    unitSystem: 'imperial',
  },
  step2: {
    tPathType: null,
    experience: null,
  },
  step3: {
    goalFocus: '',
    preferredMuscles: '',
    constraints: '',
    sessionLength: '',
  },
  step4: {
    gymName: '',
    equipmentMethod: null,
    consentGiven: false,
  },
  step5: {
    identifiedExercises: [],
    confirmedExerciseNames: new Set(),
  },
  currentStep: 1,
  startTime: Date.now(),
  lastUpdated: Date.now(),
});

/**
 * Save onboarding data to AsyncStorage
 */
export const saveOnboardingData = async (data: Partial<OnboardingData>): Promise<void> => {
  try {
    const existingData = await getOnboardingData();
    const updatedData: OnboardingData = {
      ...existingData,
      ...data,
      lastUpdated: Date.now(),
    };

    // Convert Set to Array for JSON serialization
    const serializableData = {
      ...updatedData,
      step5: {
        ...updatedData.step5,
        confirmedExerciseNames: updatedData.step5?.confirmedExerciseNames ? Array.from(updatedData.step5.confirmedExerciseNames) : [],
      },
    };

    await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(serializableData));
  } catch (error) {
    console.error('[OnboardingStorage] Error saving onboarding data:', error);
    throw new Error('Failed to save onboarding progress');
  }
};

/**
 * Get onboarding data from AsyncStorage
 */
export const getOnboardingData = async (): Promise<OnboardingData> => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (!data) {
      return getDefaultOnboardingData();
    }

    const parsedData = JSON.parse(data);

    // Convert Array back to Set
    if (parsedData.step5?.confirmedExerciseNames) {
      parsedData.step5.confirmedExerciseNames = new Set(parsedData.step5.confirmedExerciseNames);
    }

    return {
      ...getDefaultOnboardingData(),
      ...parsedData,
    };
  } catch (error) {
    console.error('[OnboardingStorage] Error loading onboarding data:', error);
    return getDefaultOnboardingData();
  }
};

/**
 * Clear onboarding data from AsyncStorage
 */
export const clearOnboardingData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      ONBOARDING_DATA_KEY,
      ONBOARDING_STEP_KEY,
      ONBOARDING_START_TIME_KEY,
    ]);
  } catch (error) {
    console.error('[OnboardingStorage] Error clearing onboarding data:', error);
    throw new Error('Failed to clear onboarding data');
  }
};

/**
 * Check if onboarding data exists
 */
export const hasOnboardingData = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    return data !== null;
  } catch (error) {
    console.error('[OnboardingStorage] Error checking onboarding data:', error);
    return false;
  }
};

/**
 * Get onboarding progress percentage
 */
export const getOnboardingProgress = (data: OnboardingData): number => {
  let completedSteps = 0;

  // Step 1
  if (data.step1.fullName && data.step1.weight !== null &&
      ((data.step1.heightUnit === 'cm' && data.step1.heightCm) ||
       (data.step1.heightUnit === 'ft' && data.step1.heightFt))) {
    completedSteps++;
  }

  // Step 2
  if (data.step2.tPathType && data.step2.experience) {
    completedSteps++;
  }

  // Step 3
  if (data.step3.goalFocus && data.step3.sessionLength) {
    completedSteps++;
  }

  // Step 4
  if (data.step4.gymName && data.step4.equipmentMethod && data.step4.consentGiven) {
    completedSteps++;
  }

  // Step 5
  if (data.step4.equipmentMethod === 'skip' || (data.step5 && data.step5.identifiedExercises && data.step5.identifiedExercises.length > 0)) {
    completedSteps++;
  }

  return Math.round((completedSteps / 5) * 100);
};

/**
 * Get time spent in onboarding
 */
export const getOnboardingTimeSpent = (data: OnboardingData): number => {
  return Date.now() - data.startTime;
};

/**
 * Check if onboarding data is stale (older than 24 hours)
 */
export const isOnboardingDataStale = (data: OnboardingData): boolean => {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return Date.now() - data.lastUpdated > ONE_DAY;
};

/**
 * Validate onboarding data integrity
 */
export const validateOnboardingData = (data: OnboardingData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Step 1 validation
  if (!data.step1.fullName?.trim()) {
    errors.push('Step 1: Full name is required');
  }
  if (!data.step1.weight) {
    errors.push('Step 1: Weight is required');
  }
  if (data.step1.heightUnit === 'cm' && !data.step1.heightCm) {
    errors.push('Step 1: Height in cm is required');
  }
  if (data.step1.heightUnit === 'ft' && !data.step1.heightFt) {
    errors.push('Step 1: Height in feet is required');
  }

  // Step 2 validation
  if (!data.step2.tPathType) {
    errors.push('Step 2: Workout split selection is required');
  }
  if (!data.step2.experience) {
    errors.push('Step 2: Experience level is required');
  }

  // Step 3 validation
  if (!data.step3.goalFocus) {
    errors.push('Step 3: Primary goal is required');
  }
  if (!data.step3.sessionLength) {
    errors.push('Step 3: Session length is required');
  }

  // Step 4 validation
  if (!data.step4.gymName?.trim()) {
    errors.push('Step 4: Gym name is required');
  }
  if (!data.step4.equipmentMethod) {
    errors.push('Step 4: Equipment method selection is required');
  }
  if (!data.step4.consentGiven) {
    errors.push('Step 4: Consent is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};