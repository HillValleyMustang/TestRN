/**
 * Accessibility Helpers for React Native Onboarding
 * Provides screen reader support and accessibility enhancements
 * Follows WCAG 2.1 AA guidelines for mobile applications
 */

import { AccessibilityInfo, Platform } from 'react-native';

// Screen reader detection and announcements
export const announceForAccessibility = (message: string) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Android screen readers
    AccessibilityInfo.announceForAccessibility(message);
  }
};

// Check if screen reader is enabled
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
};

// Generate accessible labels for form fields
export const generateAccessibleLabel = (
  label: string,
  required?: boolean,
  error?: string,
  hint?: string
): string => {
  let accessibleLabel = label;

  if (required) {
    accessibleLabel += ', required';
  }

  if (error) {
    accessibleLabel += `, error: ${error}`;
  }

  if (hint) {
    accessibleLabel += `, hint: ${hint}`;
  }

  return accessibleLabel;
};

// Generate accessible hints for interactive elements
export const generateAccessibleHint = (
  elementType: 'button' | 'input' | 'slider' | 'toggle' | 'card',
  action: string,
  additionalInfo?: string
): string => {
  const baseHints = {
    button: `Double tap to ${action}`,
    input: `Double tap to edit, ${action}`,
    slider: `Swipe up or down to adjust, ${action}`,
    toggle: `Double tap to ${action}`,
    card: `Double tap to ${action}`,
  };

  const hint = baseHints[elementType] || `Double tap to ${action}`;

  return additionalInfo ? `${hint}, ${additionalInfo}` : hint;
};

// Progress announcement for multi-step processes
export const announceStepProgress = (
  currentStep: number,
  totalSteps: number,
  stepName: string
) => {
  const message = `Step ${currentStep} of ${totalSteps}: ${stepName}`;
  announceForAccessibility(message);
};

// Form validation announcements
export const announceValidationResult = (
  fieldName: string,
  isValid: boolean,
  errorMessage?: string
) => {
  if (!isValid && errorMessage) {
    announceForAccessibility(`${fieldName}: ${errorMessage}`);
  } else if (isValid) {
    announceForAccessibility(`${fieldName}: Valid`);
  }
};

// Loading state announcements
export const announceLoadingState = (message: string, isComplete: boolean = false) => {
  const announcement = isComplete ? `${message} complete` : `${message} in progress`;
  announceForAccessibility(announcement);
};

// Navigation announcements
export const announceNavigation = (destination: string, context?: string) => {
  const message = context
    ? `Navigating to ${destination}, ${context}`
    : `Navigating to ${destination}`;
  announceForAccessibility(message);
};

// Success/error state announcements
export const announceResult = (
  type: 'success' | 'error' | 'warning' | 'info',
  message: string
) => {
  const prefix = {
    success: 'Success:',
    error: 'Error:',
    warning: 'Warning:',
    info: 'Information:',
  };

  announceForAccessibility(`${prefix[type]} ${message}`);
};

// Focus management helper
export const setAccessibilityFocus = (ref: any) => {
  if (ref?.current) {
    // Note: React Native doesn't have direct focus management like web
    // This is a placeholder for future implementation
    console.log('[Accessibility] Focus requested for element');
  }
};

// Generate unique accessibility IDs
let idCounter = 0;
export const generateAccessibilityId = (prefix: string = 'element'): string => {
  return `${prefix}-${++idCounter}`;
};

// Screen reader friendly time formatting
export const formatTimeForScreenReader = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Screen reader friendly date formatting
export const formatDateForScreenReader = (date: Date): string => {
  return date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// BMI announcement helper
export const announceBMIResult = (bmi: number, category: string) => {
  announceForAccessibility(`Body Mass Index: ${bmi.toFixed(1)}, category: ${category}`);
};

// Unit conversion announcements
export const announceUnitConversion = (
  value: number,
  fromUnit: string,
  toUnit: string,
  convertedValue: number
) => {
  announceForAccessibility(
    `${value} ${fromUnit} equals ${convertedValue.toFixed(1)} ${toUnit}`
  );
};

// Progress percentage announcements
export const announceProgress = (current: number, total: number, context: string) => {
  const percentage = Math.round((current / total) * 100);
  announceForAccessibility(`${context}: ${current} of ${total}, ${percentage} percent complete`);
};

// Error recovery announcements
export const announceErrorRecovery = (errorType: string, recoveryAction: string) => {
  announceForAccessibility(`Error: ${errorType}. ${recoveryAction}`);
};

// Completion announcements
export const announceCompletion = (task: string, success: boolean = true) => {
  const message = success
    ? `${task} completed successfully`
    : `${task} failed. Please try again`;
  announceForAccessibility(message);
};