/**
 * Typography System - Mobile App
 * Matches web app typography (Poppins font family)
 * Font weights and text styles for consistent design
 */

import { TextStyle } from 'react-native';

// Font family names (must match expo-font or react-native-vector-icons configuration)
export const FontFamily = {
  light: 'Poppins-Light', // 300
  regular: 'Poppins-Regular', // 400
  medium: 'Poppins-Medium', // 500
  semibold: 'Poppins-SemiBold', // 600
  bold: 'Poppins-Bold', // 700
};

// Font weights (for fallback when custom fonts not loaded)
export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Text styles matching web app patterns
export const TextStyles: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    fontWeight: FontWeight.bold,
  },
  h2: {
    fontFamily: FontFamily.semibold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
    fontWeight: FontWeight.semibold,
  },
  h3: {
    fontFamily: FontFamily.semibold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
    fontWeight: FontWeight.semibold,
  },
  h4: {
    fontFamily: FontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: FontWeight.medium,
  },
  h5: {
    fontFamily: FontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: FontWeight.medium,
  },
  
  // Body text
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.regular,
  },
  bodyMedium: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: FontWeight.medium,
  },
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: FontWeight.regular,
  },
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.regular,
  },
  
  // Caption and small text
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.regular,
  },
  captionMedium: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.regular,
  },
  smallMedium: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.medium,
  },
  
  // Button text
  button: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
    fontWeight: FontWeight.medium,
  },
  buttonLarge: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0.5,
    fontWeight: FontWeight.semibold,
  },
  buttonSmall: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    fontWeight: FontWeight.medium,
  },
  
  // Special
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: FontWeight.medium,
  },
  overline: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: FontWeight.semibold,
  },
};

// Font sizes (for manual sizing)
export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 48,
};

// Line heights
export const LineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
};

export default {
  FontFamily,
  FontWeight,
  TextStyles,
  FontSize,
  LineHeight,
};
