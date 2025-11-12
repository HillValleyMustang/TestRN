/**
 * Onboarding Validation Utilities
 * Comprehensive validation for all onboarding steps
 * Provides real-time feedback and data integrity checks
 */

import { Alert } from 'react-native';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface Step1Data {
  fullName: string;
  heightCm: number | null;
  heightFt: number | null;
  heightIn: number | null;
  weight: number | null;
  bodyFatPct: number | null;
  heightUnit: 'cm' | 'ft';
  weightUnit: 'kg' | 'lbs';
}

export interface Step2Data {
  tPathType: 'ppl' | 'ulul' | null;
  experience: 'beginner' | 'intermediate' | null;
}

export interface Step3Data {
  goalFocus: string;
  preferredMuscles: string;
  constraints: string;
  sessionLength: string;
}

export interface Step4Data {
  gymName: string;
  equipmentMethod: 'photo' | 'skip' | null;
  consentGiven: boolean;
}

// Name validation
export const validateName = (name: string): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!name || name.trim() === '') {
    errors.name = 'Name is required';
  } else if (name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  } else if (name.trim().length > 50) {
    errors.name = 'Name must be less than 50 characters';
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
    errors.name = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Height validation
export const validateHeight = (
  heightCm: number | null,
  heightFt: number | null,
  heightIn: number | null,
  unit: 'cm' | 'ft'
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (unit === 'cm') {
    if (heightCm === null || heightCm === undefined) {
      errors.height = 'Height is required';
    } else if (heightCm < 100) {
      errors.height = 'Height must be at least 100 cm (3\'4")';
    } else if (heightCm > 250) {
      errors.height = 'Height must be less than 250 cm (8\'2")';
    } else if (heightCm < 120) {
      warnings.height = 'This height seems unusually short. Please double-check.';
    } else if (heightCm > 220) {
      warnings.height = 'This height seems unusually tall. Please double-check.';
    }
  } else {
    // Imperial
    if (heightFt === null || heightFt === undefined) {
      errors.height = 'Height in feet is required';
    } else if (heightFt < 3) {
      errors.height = 'Height must be at least 3 feet';
    } else if (heightFt > 8) {
      errors.height = 'Height must be less than 8 feet';
    } else if (heightFt === 3 && (heightIn || 0) < 4) {
      errors.height = 'Minimum height is 3 feet 4 inches';
    } else if (heightFt === 8 && (heightIn || 0) > 2) {
      errors.height = 'Maximum height is 8 feet 2 inches';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Weight validation
export const validateWeight = (
  weight: number | null,
  unit: 'kg' | 'lbs'
): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (weight === null || weight === undefined) {
    errors.weight = 'Weight is required';
  } else {
    const minWeight = unit === 'kg' ? 30 : 66;
    const maxWeight = unit === 'kg' ? 300 : 660;

    if (weight < minWeight) {
      errors.weight = `Weight must be at least ${minWeight} ${unit}`;
    } else if (weight > maxWeight) {
      errors.weight = `Weight must be less than ${maxWeight} ${unit}`;
    } else if (weight < (unit === 'kg' ? 40 : 88)) {
      warnings.weight = 'This weight seems unusually low. Please ensure accuracy.';
    } else if (weight > (unit === 'kg' ? 200 : 440)) {
      warnings.weight = 'This weight seems unusually high. Please ensure accuracy.';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Body fat validation
export const validateBodyFat = (bodyFatPct: number | null): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (bodyFatPct !== null && bodyFatPct !== undefined) {
    if (bodyFatPct < 5) {
      errors.bodyFat = 'Body fat percentage must be at least 5%';
    } else if (bodyFatPct > 50) {
      errors.bodyFat = 'Body fat percentage must be less than 50%';
    } else if (bodyFatPct < 8) {
      warnings.bodyFat = 'Very low body fat percentage. Please ensure this is accurate.';
    } else if (bodyFatPct > 35) {
      warnings.bodyFat = 'High body fat percentage. Please ensure this is accurate.';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Step 1 validation (Personal Info)
export const validateStep1 = (data: Step1Data): ValidationResult => {
  const allErrors: Record<string, string> = {};
  const allWarnings: Record<string, string> = {};

  // Name validation
  const nameValidation = validateName(data.fullName);
  Object.assign(allErrors, nameValidation.errors);
  Object.assign(allWarnings, nameValidation.warnings);

  // Simplified height validation - only cm
  if (data.heightCm === null || data.heightCm === undefined) {
    allErrors.height = 'Height is required';
  } else if (data.heightCm < 100) {
    allErrors.height = 'Height must be at least 100 cm';
  } else if (data.heightCm > 250) {
    allErrors.height = 'Height must be less than 250 cm';
  }

  // Simplified weight validation - only kg
  if (data.weight === null || data.weight === undefined) {
    allErrors.weight = 'Weight is required';
  } else if (data.weight < 30) {
    allErrors.weight = 'Weight must be at least 30 kg';
  } else if (data.weight > 150) {
    allErrors.weight = 'Weight must be less than 150 kg';
  }

  // Body fat validation (optional)
  const bodyFatValidation = validateBodyFat(data.bodyFatPct);
  Object.assign(allErrors, bodyFatValidation.errors);
  Object.assign(allWarnings, bodyFatValidation.warnings);

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

// Step 2 validation (Training Setup)
export const validateStep2 = (data: Step2Data): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!data.tPathType) {
    errors.tPathType = 'Please select a workout split';
  }

  if (!data.experience) {
    errors.experience = 'Please select your experience level';
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Step 3 validation (Goals & Preferences)
export const validateStep3 = (data: Step3Data): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!data.goalFocus) {
    errors.goalFocus = 'Please select your primary goal';
  }

  if (!data.sessionLength) {
    errors.sessionLength = 'Please select your preferred session length';
  }

  // Optional field validations with warnings - removed as requested

  if (data.constraints && data.constraints.length > 500) {
    errors.constraints = 'Health notes must be less than 500 characters';
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Step 4 validation (Gym Setup)
export const validateStep4 = (data: Step4Data): ValidationResult => {
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!data.gymName || data.gymName.trim() === '') {
    errors.gymName = 'Gym name is required';
  } else if (data.gymName.trim().length < 2) {
    errors.gymName = 'Gym name must be at least 2 characters';
  } else if (data.gymName.trim().length > 50) {
    errors.gymName = 'Gym name must be less than 50 characters';
  }

  if (!data.equipmentMethod) {
    errors.equipmentMethod = 'Please choose how to set up your equipment';
  }

  if (!data.consentGiven) {
    errors.consent = 'You must agree to the terms to continue';
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
};

// Complete onboarding validation
export const validateCompleteOnboarding = (
  step1: Step1Data,
  step2: Step2Data,
  step3: Step3Data,
  step4: Step4Data
): ValidationResult => {
  const allErrors: Record<string, string> = {};
  const allWarnings: Record<string, string> = {};

  // Validate each step
  const step1Validation = validateStep1(step1);
  const step2Validation = validateStep2(step2);
  const step3Validation = validateStep3(step3);
  const step4Validation = validateStep4(step4);

  // Combine all errors and warnings
  Object.assign(allErrors, step1Validation.errors, step2Validation.errors, step3Validation.errors, step4Validation.errors);
  Object.assign(allWarnings, step1Validation.warnings, step2Validation.warnings, step3Validation.warnings, step4Validation.warnings);

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
};

// Utility function to show validation alert
export const showValidationAlert = (result: ValidationResult, title: string = 'Validation Error') => {
  const errorMessages = Object.values(result.errors);
  const warningMessages = Object.values(result.warnings);

  if (errorMessages.length > 0) {
    Alert.alert(
      title,
      errorMessages.join('\n\n'),
      [{ text: 'OK' }]
    );
  } else if (warningMessages.length > 0) {
    Alert.alert(
      'Please Review',
      warningMessages.join('\n\n'),
      [{ text: 'OK' }]
    );
  }
};

// BMI calculation utility
export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};

// BMI category utility
export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};